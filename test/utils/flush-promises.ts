/**
 * Flushes the microtask queue, allowing fire-and-forget promises to complete.
 * Use this instead of `await new Promise(resolve => setTimeout(resolve, N))`.
 *
 * This is instantaneous (no real delay) and deterministic.
 *
 * @example
 * service.fireAndForgetMethod();
 * await flushPromises();
 * expect(mock).toHaveBeenCalled();
 */
export const flushPromises = (): Promise<void> => new Promise(process.nextTick);
