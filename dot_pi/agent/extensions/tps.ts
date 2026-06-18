/**
 * TPS (Tokens Per Second) Metrics Extension for Pi
 *
 * Tracks and displays real-time token generation speed during streaming.
 * Shows metrics in the footer: "🚀 45.2 t/s"
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { AssistantMessageEvent } from "@earendil-works/pi-ai";

interface StreamingMetrics {
  startTime: number;
  lastUpdateTime: number;
  charCount: number;
  isStreaming: boolean;
}

// Rough average characters per token for English text. Without a tokenizer this
// is an approximation, but it gives a useful live speed indicator.
const CHARS_PER_TOKEN = 4;

function countDeltaChars(event: AssistantMessageEvent): number {
  switch (event.type) {
    case "text_delta":
    case "thinking_delta":
    case "toolcall_delta":
      return event.delta.length;
    default:
      return 0;
  }
}

function estimateTokens(charCount: number): number {
  return charCount / CHARS_PER_TOKEN;
}

export default function (pi: ExtensionAPI) {
  // Store metrics on the pi object so it survives across handlers in the same session
  let metrics: StreamingMetrics | undefined;

  function updateStatus(ctx: ExtensionContext) {
    if (!metrics || !metrics.isStreaming) return;

    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;
    const tokens = estimateTokens(metrics.charCount);

    if (elapsed > 0 && tokens > 0) {
      const tps = Math.round((tokens / elapsed) * 10) / 10;
      ctx.ui.setStatus("tps", `⚡ ${tps} t/s`);
    }
  }

  pi.on("message_start", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    // Reset metrics for new assistant message
    metrics = {
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      charCount: 0,
      isStreaming: true,
    };

    ctx.ui.setStatus("tps", "⚡ Starting...");
  });

  pi.on("message_update", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (!metrics || !metrics.isStreaming) return;

    const deltaChars = countDeltaChars(event.assistantMessageEvent);
    if (deltaChars > 0) {
      metrics.charCount += deltaChars;
      metrics.lastUpdateTime = Date.now();
    }

    updateStatus(ctx);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (!metrics) return;

    metrics.isStreaming = false;

    const usage = event.message.usage;
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    // Prefer the provider's final output token count; fall back to our estimate.
    const totalTokens = usage?.output ?? Math.round(estimateTokens(metrics.charCount));

    if (totalTokens > 0 && elapsed > 0) {
      const finalTps = Math.round((totalTokens / elapsed) * 10) / 10;
      const summary = `✓ ${totalTokens} tokens in ${elapsed.toFixed(1)}s (${finalTps} t/s avg)`;
      ctx.ui.setStatus("tps", summary);
    } else {
      ctx.ui.setStatus("tps", undefined);
    }

    metrics = undefined;
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("tps", undefined);
    metrics = undefined;
  });
}
