"use client";

import { useEffect, useReducer, useRef } from "react";
import { profile } from "../config/profile";
import { avatarReducer, initialAvatarState, motionEnabled } from "../lib/avatar-state";
import type { Language } from "../lib/i18n";

export type AvatarStatus = "idle" | "thinking" | "responding" | "error";
export type AvatarPresentationState = {
  status: AvatarStatus;
  requestId: string | null;
};

const svgElements = new Set(["svg", "defs", "clipPath", "path", "g", "rect", "circle", "ellipse"]);
const svgAttributes = new Set([
  "viewBox", "width", "height", "id", "role", "aria-label", "d", "x", "y", "rx",
  "ry", "cx", "cy", "r", "fill", "clip-path", "transform", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "opacity", "style",
]);

function parseAvatar(source: string): SVGSVGElement {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = document.documentElement;
  if (!(root instanceof SVGSVGElement) || document.querySelector("parsererror")) {
    throw new Error("Invalid avatar SVG");
  }
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (element.namespaceURI !== "http://www.w3.org/2000/svg" || !svgElements.has(element.localName)) {
      throw new Error("Unsupported avatar SVG element");
    }
    for (const attr of Array.from(element.attributes)) {
      if (attr.namespaceURI === "http://www.w3.org/2000/xmlns/" || attr.name.startsWith("inkscape:")) continue;
      if (!svgAttributes.has(attr.name) ||
        (attr.name === "style" && attr.value !== "display:none") ||
        (attr.value.includes("url(") && (attr.name !== "clip-path" || attr.value !== "url(#clip-ropa)"))) {
        throw new Error("Unsupported avatar SVG attribute");
      }
    }
  }
  for (const id of ["brazo-izq", "antebrazo-izq", "brazo-der", "antebrazo-der", "cabeza-rig", "ojos", "boca-neutral", "boca-sonrisa", "boca-pensativa"]) {
    if (!root.querySelector(`#${id}`)) throw new Error("Missing avatar SVG layer");
  }
  return document.importNode(root, true);
}

export function AnimatedAvatar({
  language,
  label,
  statusLabel,
  pauseLabel,
  resumeLabel,
  unavailableLabel,
  status,
  requestId,
}: {
  language: Language;
  label: string;
  statusLabel: Record<"idle" | "thinking" | "responding" | "error", string>;
  pauseLabel: string;
  resumeLabel: string;
  unavailableLabel: string;
  status: AvatarStatus;
  requestId: string | null;
}) {
  const [state, dispatch] = useReducer(avatarReducer, undefined, initialAvatarState);
  const activeRequestId = useRef<string | null>(null);
  const artwork = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    async function loadAvatar() {
      try {
        if (!profile.illustration) throw new Error("Avatar configuration unavailable");
        const response = await fetch(profile.illustration, { signal: abort.signal });
        if (!response.ok) throw new Error(`Avatar request failed (${response.status})`);
        const svg = parseAvatar(await response.text());
        if (abort.signal.aborted || !artwork.current) return;
        artwork.current.replaceChildren(svg);
        dispatch({ type: "asset", value: "available" });
      } catch (error) {
        if (abort.signal.aborted) return;
        console.error("AVATAR_ASSET_UNAVAILABLE", error);
        dispatch({ type: "asset", value: "unavailable" });
      }
    }
    void loadAvatar();
    return () => abort.abort();
  }, []);

  useEffect(() => {
    const svg = artwork.current?.querySelector("svg");
    svg?.setAttribute("aria-label", language === "en" ? "Illustration of Ana Paula" : "Ilustración de Ana Paula");
  }, [language, state.asset]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => dispatch({ type: "system-motion", reduced: preference.matches });
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (status === "thinking" && activeRequestId.current === null) {
      const id = requestId ?? crypto.randomUUID();
      activeRequestId.current = id;
      dispatch({ type: "submitted", requestId: id });
    } else if (status === "responding" && activeRequestId.current !== null) {
      dispatch({ type: "first-text", requestId: activeRequestId.current });
    } else if (status === "idle" && activeRequestId.current !== null) {
      dispatch({ type: "finished", requestId: activeRequestId.current });
      activeRequestId.current = null;
    } else if (status === "error") {
      if (activeRequestId.current !== null) {
        dispatch({ type: "failed", requestId: activeRequestId.current });
        activeRequestId.current = null;
      } else {
        dispatch({ type: "rejected" });
      }
    }
  }, [requestId, status]);

  const moving = motionEnabled(state);
  return (
    <figure
      aria-label={label}
      className="avatar-card"
      data-motion={moving ? "enabled" : "static"}
      data-state={state.status}
      data-testid="animated-avatar"
    >
      <div className="avatar-artwork" hidden={state.asset !== "available"} ref={artwork} />
      {state.asset !== "available" && (
        <div className="avatar-fallback" role="img" aria-label={unavailableLabel}>
          <span aria-hidden="true">AP</span>
        </div>
      )}
      <figcaption className="avatar-caption">
        <span aria-live="polite" className={`status-dot status-${state.status}`} />
        <span aria-live="polite" role="status">{statusLabel[state.status]}</span>
        {state.asset === "available" && (
          <button
            aria-pressed={state.visitorPaused}
            className="motion-toggle"
            onClick={() => dispatch({ type: "pause", paused: !state.visitorPaused })}
            type="button"
          >
            {state.visitorPaused ? resumeLabel : pauseLabel}
          </button>
        )}
      </figcaption>
      {state.asset === "unavailable" && <p className="avatar-error" role="alert">{unavailableLabel}</p>}
    </figure>
  );
}
