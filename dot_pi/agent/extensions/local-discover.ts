/**
 * Local-model auto-discovery for Pi.
 *
 * Discovers models from any number of local OpenAI-compatible servers
 * (oMLX, llama.cpp, LM Studio, vLLM, …) at startup by GETting /v1/models and
 * registers each as a provider. Newly added models show up in /model
 * automatically — no hand-editing of models.json required, and no filesystem
 * access needed (works for remote servers you can't ssh into).
 *
 * The SAME label syntax is used for every server:
 *
 *   {name} · {quant} · [{size}] · [{capability tags}]
 *
 *   Qwen3 Coder 30B A3B Instruct · 4bit · 16.8GB · DFlash       (oMLX)
 *   North Mini Code 1.0 UD · IQ1_M · 9.4GB · 30.5B             (llama.cpp)
 *
 * Metadata sourcing (all from the server's HTTP API, nothing from disk):
 *   - `id`       : /v1/models `data[].id` (authoritative)
 *   - `context`  : /v1/models `data[].max_model_len` (OpenAI) else `meta.n_ctx`
 *                  (llama.cpp), capped by the server's configured `context`.
 *   - `size`     : llama.cpp `data[].meta.size` (bytes); oMLX admin
 *                  `estimated_size_formatted`; LM Studio `data[].size` bytes.
 *   - `params`   : llama.cpp `data[].meta.n_params` → shown as a capability
 *                  tag like "30.5B" (active-parameter count for MoE is not
 *                  reported by llama.cpp, so this is total params).
 *   - caps tags  : oMLX only — `/admin/api/models` → MTP / DFlash / ParoQ.
 *                  TurboQuant is not tagged (universally available, not a
 *                  per-model capability).
 *
 * If a server is unreachable, it is skipped independently with a warning.
 *
 * Configuration: ~/.pi/agent/extensions/local-discover.json
 *   {
 *     "context":   131072,   // global default contextWindow cap
 *     "maxTokens": 16384,
 *     "timeoutMs": 3000,
 *     "servers": [
 *       { "key": "omlx",    "baseUrl": "http://127.0.0.1:8000",
 *         "apiKey": "oMLXapi", "type": "omlx", "context": 32768 },
 *       { "key": "llamacpp", "baseUrl": "http://192.168.0.99:8080",
 *         "apiKey": "dummy", "context": 131072 }
 *     ]
 *   }
 *
 * `type` is `"omlx"` (also fetch /admin/api/models for size + capability
 * tags) or `"openai"` (default; use /v1/models only — supports llama.cpp's
 * `meta.size`/`meta.n_params` and LM Studio's `size` fields when present).
 *
 * Env fallbacks (used only when no config file exists): OMLX_BASE_URL,
 * OMLX_API_KEY, OMLX_CONTEXT, OMLX_MAX_TOKENS, OMLX_TIMEOUT_MS.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { homedir } from "node:os";

// ---------------------------------------------------------------------------
// env helpers
// ---------------------------------------------------------------------------
function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.length > 0 ? v : fallback;
}
function envInt(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// ---------------------------------------------------------------------------
// config types
// ---------------------------------------------------------------------------
interface ServerCfg {
  key: string;
  baseUrl: string;
  apiKey?: string;
  authHeader?: boolean;
  type?: "omlx" | "openai";
  context?: number;
  maxTokens?: number;
  timeoutMs?: number;
}
interface LocalDiscoverConfig {
  context?: number;
  maxTokens?: number;
  timeoutMs?: number;
  servers: ServerCfg[];
}

// ---------------------------------------------------------------------------
// API shapes (permissive — fields are optional across server variants)
// ---------------------------------------------------------------------------
interface V1ModelMeta {
  size?: number; // llama.cpp: bytes
  n_params?: number; // llama.cpp: total param count
  n_ctx?: number; // llama.cpp: context
  [k: string]: unknown;
}
interface V1Model {
  id: string;
  max_model_len?: number; // OpenAI-style
  size?: number; // LM Studio: bytes (top-level)
  meta?: V1ModelMeta; // llama.cpp: rich metadata
}
interface V1ModelsResponse {
  data?: V1Model[];
}
interface OmlxRichModel {
  id: string;
  estimated_size_formatted?: string;
  mtp_compatible?: boolean;
  dflash_compatible?: boolean;
  is_paroquant?: boolean;
}
interface OmlxAdminResponse {
  models?: OmlxRichModel[];
}

// ---------------------------------------------------------------------------
// label derivation — shared by all servers
// ---------------------------------------------------------------------------
const QUANT_RE =
  /(\d+(?:\.\d+)?bit|UD-Q\d[^\s.-]*|IQ\d[^\s.-]*|Q\d[_K][^\s.-]*|nvfp\d+|fp\d+|bf\d+)/i;

export function parseQuant(id: string): string | null {
  const m = id.match(QUANT_RE);
  return m ? m[1] : null;
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// id → readable name: drop .mlx/.gguf, strip MLX prefix, redundant "GGUF"
// repo suffix, quant token, org/ prefix; any separator → spaces.
export function cleanName(id: string, quant: string | null): string {
  let s = id.replace(/\.(mlx|gguf)$/i, "");
  s = s.replace(/-MLX(-\d+(?:\.\d+)?bit)?/gi, "");
  if (quant) {
    s = s.replace(new RegExp(`[-:._]?${escapeRe(quant)}`, "gi"), "");
    s = s.replace(new RegExp(escapeRe(quant), "gi"), "");
  }
  s = s.replace(/\s*-\s*gguf\b/gi, " ");
  s = s.replace(/[-\\/_:]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function formatGb(gb: number): string {
  return `${gb.toFixed(1)}GB`;
}
function bytesToGbStr(bytes: number): string {
  return formatGb(bytes / 1e9);
}
export function parseSizeStr(formatted?: string): string | null {
  if (!formatted) return null;
  const m = formatted.match(/([\d.]+)\s*GB/i);
  return m ? formatGb(Number(m[1])) : null;
}

export interface CapabilityInfo {
  mtp?: boolean;
  dflash?: boolean;
  paroq?: boolean;
  paramCount?: string; // e.g. "30.5B" (total params, llama.cpp meta.n_params)
}

function formatParams(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${n}`;
}

export function buildLabel(
  id: string,
  sizeStr: string | null,
  caps?: CapabilityInfo,
): string {
  const quant = parseQuant(id);
  const name = cleanName(id, quant);
  const parts: string[] = [name];
  if (quant) parts.push(quant);
  if (sizeStr) parts.push(sizeStr);
  const tags: string[] = [];
  if (caps?.mtp) tags.push("MTP");
  if (caps?.dflash) tags.push("DFlash");
  if (caps?.paroq) tags.push("ParoQ");
  if (caps?.paramCount) tags.push(caps.paramCount);
  if (tags.length) parts.push(tags.join(" · "));
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------
async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// config loading
// ---------------------------------------------------------------------------
function defaultConfig(): LocalDiscoverConfig {
  return {
    context: envInt("OMLX_CONTEXT", 32768),
    maxTokens: envInt("OMLX_MAX_TOKENS", 16384),
    timeoutMs: envInt("OMLX_TIMEOUT_MS", 3000),
    servers: [
      {
        key: "omlx",
        baseUrl: env("OMLX_BASE_URL", "http://127.0.0.1:8000"),
        apiKey: env("OMLX_API_KEY", "oMLXapi"),
        type: "omlx",
        context: envInt("OMLX_CONTEXT", 32768),
      },
    ],
  };
}

async function loadConfig(): Promise<LocalDiscoverConfig> {
  // __dirname is available under bun (jiti) for the transpiled module
  const dir: string =
    (typeof __dirname !== "undefined" && __dirname) ||
    new URL(".", import.meta.url).pathname;
  const cfgPath = join(dir, "local-discover.json");
  try {
    const fs = await import("node:fs");
    const raw = await fs.promises.readFile(cfgPath, "utf8");
    const parsed = JSON.parse(raw) as LocalDiscoverConfig;
    return {
      context: 131072,
      maxTokens: 16384,
      timeoutMs: 3000,
      ...parsed,
    };
  } catch {
    return defaultConfig();
  }
}

// Resolve a size string for a model from whatever the server gave us.
function resolveSize(m: V1Model, rich?: OmlxRichModel): string | null {
  // llama.cpp: meta.size (bytes)
  if (typeof m.meta?.size === "number" && m.meta.size > 0) {
    return bytesToGbStr(m.meta.size);
  }
  // LM Studio: top-level size (bytes)
  if (typeof m.size === "number" && m.size > 0) {
    return bytesToGbStr(m.size);
  }
  // oMLX admin: estimated_size_formatted ("16.48 GB")
  if (rich?.estimated_size_formatted) {
    return parseSizeStr(rich.estimated_size_formatted);
  }
  return null;
}

// ---------------------------------------------------------------------------
// per-server discovery
// ---------------------------------------------------------------------------
async function discoverServer(
  cfg: ServerCfg,
  globals: { context: number; maxTokens: number; timeoutMs: number },
  pi: ExtensionAPI,
): Promise<void> {
  const type = cfg.type ?? "openai";
  const context = cfg.context ?? globals.context;
  const maxTokens = cfg.maxTokens ?? globals.maxTokens;
  const timeoutMs = cfg.timeoutMs ?? globals.timeoutMs;
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const isV1Base = /\/v\d+$/.test(base);
  const v1Url = isV1Base ? `${base}/models` : `${base}/v1/models`;
  const providerBase = v1Url.replace(/\/models$/, "");

  const apiKey = cfg.apiKey ?? "dummy";
  const headers: Record<string, string> = {};
  if (cfg.authHeader !== false && apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // 1. authoritative id list
  let v1: V1Model[];
  try {
    const resp = await fetchJson<V1ModelsResponse>(v1Url, headers, timeoutMs);
    v1 = (resp.data ?? []).filter((m) => m && m.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[local-discover] ${cfg.key}: ${v1Url} unreachable (${msg}) — skipped`,
    );
    return;
  }
  if (v1.length === 0) {
    console.warn(`[local-discover] ${cfg.key}: no models at ${v1Url} — skipped`);
    return;
  }

  // 2. oMLX rich metadata (size + MTP/DFlash/ParoQ tags)
  const rich = new Map<string, OmlxRichModel>();
  if (type === "omlx") {
    const adminUrl = `${base.replace(/\/v\d+$/, "")}/admin/api/models`;
    try {
      const admin = await fetchJson<OmlxAdminResponse>(
        adminUrl,
        headers,
        timeoutMs,
      );
      for (const m of admin.models ?? []) if (m?.id) rich.set(m.id, m);
    } catch {
      // admin endpoint unavailable → labels omit size/tags; fine
    }
  }

  // 3. build + register
  pi.registerProvider(cfg.key, {
    baseUrl: providerBase,
    api: "openai-completions",
    apiKey,
    authHeader: cfg.authHeader !== false,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      maxTokensField: "max_tokens",
    },
    models: v1.map((m) => {
      // context: prefer OpenAI max_model_len, else llama.cpp meta.n_ctx, cap it
      const reported =
        m.max_model_len ?? m.meta?.n_ctx ?? context;
      const contextWindow = Math.min(reported as number, context);

      const meta = rich.get(m.id);
      const sizeStr = resolveSize(m, meta);
      const caps: CapabilityInfo = {};
      if (type === "omlx" && meta) {
        if (meta.mtp_compatible) caps.mtp = true;
        if (meta.dflash_compatible) caps.dflash = true;
        if (meta.is_paroquant) caps.paroq = true;
      }
      // llama.cpp total param count → a tag like "30.5B"
      if (typeof m.meta?.n_params === "number" && m.meta.n_params > 0) {
        caps.paramCount = formatParams(m.meta.n_params);
      }

      return {
        id: m.id,
        name: buildLabel(m.id, sizeStr, caps),
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow,
        maxTokens,
      };
    }),
  });

  console.warn(
    `[local-discover] ${cfg.key}: registered ${v1.length} model(s) from ${base}`,
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
export default async function (pi: ExtensionAPI) {
  const cfg = await loadConfig();
  const globals = {
    context: cfg.context ?? 131072,
    maxTokens: cfg.maxTokens ?? 16384,
    timeoutMs: cfg.timeoutMs ?? 3000,
  };
  await Promise.all(cfg.servers.map((s) => discoverServer(s, globals, pi)));
}

// silence unused import in some bundlers
export const _homedir = homedir;