type StartStorageContext = Record<string, unknown> | undefined;

let currentContext: StartStorageContext;

export async function runWithStartContext<T>(
  context: StartStorageContext,
  fn: () => T | Promise<T>,
) {
  const previous = currentContext;
  currentContext = context;
  try {
    return await fn();
  } finally {
    currentContext = previous;
  }
}

export function getStartContext(opts?: { throwIfNotFound?: boolean }) {
  if (!currentContext && opts?.throwIfNotFound !== false) {
    throw new Error("No Start context found in client shim.");
  }
  return currentContext;
}
