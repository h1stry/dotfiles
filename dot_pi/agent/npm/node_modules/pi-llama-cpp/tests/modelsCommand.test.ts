import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Set up fake timers before any imports so setTimeout is mocked globally
vi.useFakeTimers();

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  modelsCommand,
  onSessionBeforeSwitch,
  resetInflightModel,
} from "../src/commands/models";
import { Action } from "../src/enums/action";
import { Mode } from "../src/enums/mode";
import { Status } from "../src/enums/status";
import { BaseModel } from "../src/models/baseModel";

// Mock the retriever module
vi.mock("../src/tools/retriever", () => ({
  rpc: vi.fn(),
  isServerReady: vi.fn(),
  listModels: vi.fn(),
}));

// Helper to create a mock BaseModel
const createMockModel = (
  name: string,
  overrides: Partial<BaseModel> = {},
): BaseModel =>
  ({
    name,
    id: name,
    mode: Mode.ROUTER,
    capabilities: ["text"] as ["text"],
    getStatus: vi.fn().mockResolvedValue(Status.LOADED),
    getContextSize: vi.fn().mockResolvedValue(4096),
    getInfo: vi.fn().mockResolvedValue(`Model: ${name}\nID: ${name}`),
    load: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn().mockResolvedValue(undefined),
    toProviderConfig: vi.fn().mockResolvedValue({}),
    getLabel: vi.fn().mockResolvedValue(name),
    ...overrides,
  }) as unknown as BaseModel;

const createMockCtx = (
  selectFn: (prompt: string, options: string[]) => string | null,
) => ({
  cwd: "/tmp/test",
  ui: {
    select: vi.fn(selectFn),
    notify: vi.fn(),
    theme: {
      fg: (color: string, text: string) => text,
    },
  },
  modelRegistry: {
    find: vi.fn().mockReturnValue({ id: "test-model-id" }),
  },
});

const createMockPiContext = (notifyFn: ReturnType<typeof vi.fn>) =>
  ({
    ui: {
      notify: notifyFn,
    },
  }) as any as ExtensionContext;

const createMockPi = () => ({
  setModel: vi.fn(),
  registerProvider: vi.fn(),
});

beforeEach(() => {
  vi.clearAllTimers();
  resetInflightModel();
});

afterEach(() => {
  vi.clearAllTimers();
});

describe("modelsCommand", () => {
  it("should return early on cancel (null model selection)", async () => {
    const models = [createMockModel("model-a")];
    const ctx = createMockCtx(() => null);
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("should show info when INFO action is selected", async () => {
    const model = createMockModel("model-a");
    const models = [model];
    const ctx = createMockCtx((prompt) => {
      if (prompt.includes("models")) return "model-a";
      return Action.INFO;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Model: model-a\nID: model-a",
      "info",
    );
  });

  it("should unload model when UNLOAD action is selected", async () => {
    const model = createMockModel("model-a");
    const models = [model];
    const ctx = createMockCtx((prompt) => {
      if (prompt.includes("models")) return "model-a";
      return Action.UNLOAD;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);

    expect(model.unload).toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith("Unloaded model-a", "info");
  });

  it("should load model when LOAD action is selected", async () => {
    const loadFn = vi.fn().mockResolvedValue(undefined);
    const model = createMockModel("model-a");
    (model.load as any) = loadFn;
    (model.getStatus as any).mockResolvedValue(Status.UNLOADED);
    const models = [model];
    const ctx = createMockCtx((prompt) => {
      if (prompt.includes("models")) return "model-a";
      return Action.LOAD;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);
    await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
    await vi.waitFor(() => expect(pi.setModel).toHaveBeenCalled());
  });

  it("should show warning when session changes during model load", async () => {
    // Create a deferred promise so we can control when the load completes
    let resolveLoad: () => void;
    const loadPromise = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    const model = createMockModel("model-a", {
      load: () => loadPromise,
      getStatus: vi.fn().mockResolvedValue(Status.UNLOADED),
    });
    const models = [model];

    let selectCallCount = 0;
    const ctx = createMockCtx(() => {
      selectCallCount++;
      // 1st: select model, 2nd: select LOAD
      if (selectCallCount === 1) return "model-a";
      if (selectCallCount === 2) return Action.LOAD;
      return null;
    });
    const pi = createMockPi();

    // Start the load (non-blocking)
    const modelsPromise = modelsCommand(ctx as any, pi as any, models);

    // Advance past the microtask that sets inflightModel
    await vi.advanceTimersByTimeAsync(0);

    // Simulate session switch while model is still loading
    // onSessionBeforeSwitch awaits READABLE_TIMEOUT (15s) for the notification
    const switchPromise = onSessionBeforeSwitch(
      {} as any,
      createMockPiContext(ctx.ui.notify as any),
    );
    await vi.advanceTimersByTimeAsync(15000);
    await switchPromise;

    // Should have shown a warning notification
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Session change detected"),
      "warning",
    );
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("model-a"),
      "warning",
    );

    // Complete the load so inflightModel is cleared
    resolveLoad!();
    await modelsPromise;
  });

  it("should not warn when no model is loading", async () => {
    const notifyFn = vi.fn();
    const ctx = createMockPiContext(notifyFn);

    await onSessionBeforeSwitch({} as any, ctx);

    expect(notifyFn).not.toHaveBeenCalled();
    // No timers should be scheduled
    expect(vi.getTimerCount()).toBe(0);
  });

  it("should clear inflightModel after load completes successfully", async () => {
    const loadFn = vi.fn().mockResolvedValue(undefined);
    const model = createMockModel("model-a", {
      load: loadFn,
      getStatus: vi.fn().mockResolvedValue(Status.UNLOADED),
    });
    const models = [model];
    const ctx = createMockCtx((prompt) => {
      if (prompt.includes("models")) return "model-a";
      return Action.LOAD;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);
    await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
    await vi.waitFor(() => expect(pi.setModel).toHaveBeenCalled());

    // inflightModel should be cleared after completion
    // (verified indirectly: calling onSessionBeforeSwitch should not warn)
    await vi.advanceTimersByTimeAsync(0);
    const notifyFn = vi.fn();
    await onSessionBeforeSwitch({} as any, createMockPiContext(notifyFn));
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it("should clear inflightModel after load fails", async () => {
    const loadFn = vi.fn().mockRejectedValue(new Error("Load failed"));
    const model = createMockModel("model-a", {
      load: loadFn,
      getStatus: vi.fn().mockResolvedValue(Status.FAILED),
    });
    const models = [model];
    const ctx = createMockCtx((prompt) => {
      if (prompt.includes("models")) return "model-a";
      return Action.RETRY;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);
    await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());

    // inflightModel should be cleared after failure
    await vi.advanceTimersByTimeAsync(0);
    const notifyFn = vi.fn();
    await onSessionBeforeSwitch({} as any, createMockPiContext(notifyFn));
    expect(notifyFn).not.toHaveBeenCalled();
  });

  it("should loop back to model selection when action is cancelled", async () => {
    const model = createMockModel("model-a");
    const models = [model];

    let selectCallCount = 0;
    const ctx = createMockCtx(() => {
      selectCallCount++;
      // 1st: select model-a, 2nd: cancel action, 3rd: cancel model => exit
      if (selectCallCount === 1) return "model-a";
      return null;
    });
    const pi = createMockPi();

    await modelsCommand(ctx as any, pi as any, models);

    expect(ctx.ui.select).toHaveBeenCalledTimes(3);
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
