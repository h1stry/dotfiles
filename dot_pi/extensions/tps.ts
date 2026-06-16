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

interface StreamingMetrics {
  startTime: number;
  lastUpdateTime: number;
  tokenCount: number;
  lastTokenCount: number;
  tps: number;
  peakTps: number;
  totalTokens: number;
  isStreaming: boolean;
}

export default function (pi: ExtensionAPI) {
  // Store metrics on the pi object so it survives across handlers in the same session
  let metrics: StreamingMetrics | undefined;

  function updateStatus(ctx: ExtensionContext) {
    if (!metrics || !metrics.isStreaming) return;

    const currentTokens = metrics.tokenCount;
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;

    if (elapsed > 0 && currentTokens > 0) {
      metrics.tps = Math.round((currentTokens / elapsed) * 10) / 10;
      metrics.peakTps = Math.max(metrics.peakTps, metrics.tps);
    }

    const tpsStr = metrics.tps > 0 ? `🚀 ${metrics.tps} t/s` : "🚀 Starting...";

    ctx.ui.setStatus("tps", tpsStr);
  }

  pi.on("message_start", async (event, ctx) => {
    if (event.message.role !== "assistant") return;

    // Reset metrics for new assistant message
    metrics = {
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      tokenCount: 0,
      lastTokenCount: 0,
      tps: 0,
      peakTps: 0,
      totalTokens: 0,
      isStreaming: true,
    };

    ctx.ui.setStatus("tps", "🚀 Starting...");
  });

  pi.on("message_update", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (!metrics || !metrics.isStreaming) return;

    const usage = event.message.usage;
    if (!usage) return;

    const currentTokens = usage.output || 0;
    metrics.tokenCount = currentTokens;
    metrics.totalTokens += currentTokens - metrics.lastTokenCount;
    metrics.lastTokenCount = currentTokens;
    metrics.lastUpdateTime = Date.now();

    updateStatus(ctx);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "assistant") return;
    if (!metrics) return;

    metrics.isStreaming = false;

    const usage = event.message.usage;
    const totalTokens = usage?.output || metrics.totalTokens;
    const elapsed = (Date.now() - metrics.startTime) / 1000;

    if (totalTokens > 0 && elapsed > 0) {
      const finalTps = Math.round((totalTokens / elapsed) * 10) / 10;
      const summary = `✅ ${totalTokens} tokens in ${elapsed.toFixed(1)}s (${finalTps} t/s avg)`;
      ctx.ui.setStatus("tps", summary);

      // Clear after a delay
      setTimeout(() => {
        ctx.ui.setStatus("tps", undefined);
      }, 5000);
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
