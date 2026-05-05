import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runAfterAuthCallback } from "./supabaseAuthDeferral";

describe("runAfterAuthCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exécute le callback au tick suivant (macrotask), pas immédiatement", () => {
    const fn = vi.fn();
    runAfterAuthCallback(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
