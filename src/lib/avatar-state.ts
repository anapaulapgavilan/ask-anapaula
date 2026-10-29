export type AvatarStatus = "idle" | "thinking" | "responding" | "error";
export type AvatarAsset = "loading" | "available" | "unavailable";
export type AvatarState = {
  status: AvatarStatus;
  requestId: string | null;
  systemReducedMotion: boolean;
  visitorPaused: boolean;
  asset: AvatarAsset;
};
export type AvatarEvent =
  | { type: "submitted" | "first-text" | "finished" | "stopped" | "failed"; requestId: string }
  | { type: "rejected" | "dismiss-error" }
  | { type: "system-motion"; reduced: boolean }
  | { type: "pause"; paused: boolean }
  | { type: "asset"; value: AvatarAsset };

export function initialAvatarState(): AvatarState {
  return { status: "idle", requestId: null, systemReducedMotion: true, visitorPaused: false, asset: "loading" };
}

export function motionEnabled(state: AvatarState): boolean {
  return !state.systemReducedMotion && !state.visitorPaused &&
    state.asset === "available" && state.status !== "error";
}

export function avatarReducer(state: AvatarState, event: AvatarEvent): AvatarState {
  switch (event.type) {
    case "system-motion":
      return { ...state, systemReducedMotion: event.reduced };
    case "pause":
      return { ...state, visitorPaused: event.paused };
    case "asset":
      return { ...state, asset: event.value };
    case "submitted":
      if (state.requestId !== null) return state;
      return { ...state, status: "thinking", requestId: event.requestId };
    case "rejected":
      return state.requestId === null ? { ...state, status: "error" } : state;
    case "dismiss-error":
      return state.status === "error" ? { ...state, status: "idle" } : state;
    case "first-text":
      return state.requestId === event.requestId ? { ...state, status: "responding" } : state;
    case "finished":
    case "stopped":
    case "failed":
      if (state.requestId !== event.requestId) return state;
      return { ...state, status: event.type === "failed" ? "error" : "idle", requestId: null };
  }
}
