/** The source reader handles its own short cache; page calculations always use that source. */
export function unstable_cache<T extends (...args: any[]) => any>(fn: T, _keys?: string[], _options?: unknown): T { return fn; }
