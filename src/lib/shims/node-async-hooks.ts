type NodeAsyncHooksModule = {
  AsyncLocalStorage?: new <T = unknown>() => {
    run<R>(store: T, callback: () => R): R;
    getStore(): T | undefined;
  };
  AsyncResource?: new (...args: Array<unknown>) => {
    runInAsyncScope<R>(fn: (...fnArgs: Array<unknown>) => R): R;
    emitDestroy(): void;
  };
  executionAsyncId?: () => number;
  triggerAsyncId?: () => number;
  executionAsyncResource?: () => unknown;
  createHook?: () => {
    enable(): void;
    disable(): void;
  };
};

let nodeAsyncHooks: NodeAsyncHooksModule | null = null;

if (typeof process !== "undefined" && process.versions?.node) {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    nodeAsyncHooks = require("node:async_hooks") as NodeAsyncHooksModule;
  } catch {
    nodeAsyncHooks = null;
  }
}

const AsyncLocalStorageFallback = class <T = unknown> {
  #store: T | undefined;

  run<R>(store: T, callback: () => R): R {
    const previous = this.#store;
    this.#store = store;
    try {
      return callback();
    } finally {
      this.#store = previous;
    }
  }

  getStore(): T | undefined {
    return this.#store;
  }
};

const AsyncResourceFallback = class {
  runInAsyncScope<R>(fn: (...fnArgs: Array<unknown>) => R): R {
    return fn();
  }

  emitDestroy() {
    // noop
  }
};

const executionAsyncIdFallback = () => 0;
const triggerAsyncIdFallback = () => 0;
const executionAsyncResourceFallback = () => undefined;
const createHookFallback = () => ({
  enable: () => undefined,
  disable: () => undefined,
});

export const AsyncLocalStorage =
  nodeAsyncHooks?.AsyncLocalStorage ?? AsyncLocalStorageFallback;
export const AsyncResource =
  nodeAsyncHooks?.AsyncResource ?? AsyncResourceFallback;
export const executionAsyncId =
  nodeAsyncHooks?.executionAsyncId ?? executionAsyncIdFallback;
export const triggerAsyncId =
  nodeAsyncHooks?.triggerAsyncId ?? triggerAsyncIdFallback;
export const executionAsyncResource =
  nodeAsyncHooks?.executionAsyncResource ?? executionAsyncResourceFallback;
export const createHook = nodeAsyncHooks?.createHook ?? createHookFallback;

const fallbackModule = {
  AsyncLocalStorage,
  AsyncResource,
  executionAsyncId,
  triggerAsyncId,
  executionAsyncResource,
  createHook,
};

export default nodeAsyncHooks ?? fallbackModule;
