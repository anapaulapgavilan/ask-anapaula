import { describe, expect, it } from "vitest";
import { avatarReducer, initialAvatarState, motionEnabled } from "../../src/lib/avatar-state";

describe("avatar lifecycle", () => {
  it("starts static and follows request, first-text and completion events", () => {
    const initial = initialAvatarState();
    expect(initial).toEqual({ status: "idle", requestId: null, systemReducedMotion: true, visitorPaused: false, asset: "loading" });
    let state = avatarReducer(initial, { type: "submitted", requestId: "one" });
    expect(state.status).toBe("thinking");
    state = avatarReducer(state, { type: "first-text", requestId: "one" });
    expect(state.status).toBe("responding");
    state = avatarReducer(state, { type: "finished", requestId: "one" });
    expect(state.status).toBe("idle");
    expect(state.requestId).toBeNull();
  });

  it.each(["thinking", "responding"] as const)("Stop cleans up %s and ignores late stream events", (status) => {
    let state = avatarReducer(initialAvatarState(), { type: "submitted", requestId: "one" });
    if (status === "responding") state = avatarReducer(state, { type: "first-text", requestId: "one" });
    state = avatarReducer(state, { type: "stopped", requestId: "one" });
    expect(state.status).toBe("idle");
    expect(avatarReducer(state, { type: "first-text", requestId: "one" })).toEqual(state);
    expect(avatarReducer(state, { type: "failed", requestId: "one" })).toEqual(state);
  });

  it.each(["thinking", "responding"] as const)("cleans up %s errors until dismissal or a new submission", (status) => {
    let state = avatarReducer(initialAvatarState(), { type: "submitted", requestId: "one" });
    if (status === "responding") state = avatarReducer(state, { type: "first-text", requestId: "one" });
    state = avatarReducer(state, { type: "failed", requestId: "one" });
    expect(state.status).toBe("error");
    expect(state.requestId).toBeNull();
    expect(avatarReducer(state, { type: "finished", requestId: "one" })).toEqual(state);
    expect(avatarReducer(state, { type: "dismiss-error" }).status).toBe("idle");
    state = avatarReducer(state, { type: "submitted", requestId: "two" });
    expect(state.status).toBe("thinking");
    expect(avatarReducer(state, { type: "finished", requestId: "one" })).toEqual(state);
    expect(avatarReducer(state, { type: "submitted", requestId: "three" })).toEqual(state);
  });

  it("represents pre-request validation failures without inventing an active stream", () => {
    const state = avatarReducer(initialAvatarState(), { type: "rejected" });
    expect(state.status).toBe("error");
    expect(state.requestId).toBeNull();
  });

  it("keeps asset failure and motion changes independent of chat", () => {
    let state = avatarReducer(initialAvatarState(), { type: "submitted", requestId: "one" });
    state = avatarReducer(state, { type: "asset", value: "available" });
    expect(motionEnabled(state)).toBe(false);
    state = avatarReducer(state, { type: "system-motion", reduced: false });
    expect(motionEnabled(state)).toBe(true);
    state = avatarReducer(state, { type: "pause", paused: true });
    expect(motionEnabled(state)).toBe(false);
    expect(state.status).toBe("thinking");
    expect(state.requestId).toBe("one");
    state = avatarReducer(state, { type: "system-motion", reduced: true });
    state = avatarReducer(state, { type: "pause", paused: false });
    expect(motionEnabled(state)).toBe(false);
    state = avatarReducer(state, { type: "asset", value: "unavailable" });
    state = avatarReducer(state, { type: "first-text", requestId: "one" });
    expect(state.status).toBe("responding");
    expect(state.asset).toBe("unavailable");
    expect(motionEnabled(state)).toBe(false);
  });
});
