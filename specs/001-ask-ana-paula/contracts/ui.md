# Contract: Bilingual Profile, Chat, and Illustrated Avatar

## Composition

One public page: Hero -> conversation with illustrated avatar and starter chips -> four project cards -> privacy/contact footer. Hero and conversation may share the first viewport on wide screens without hiding the disclosure.

- Hero uses approved photo, name, biography, one-liner, and four requested actions.
- Illustration is a separate approved visual representation, beside chat on desktop and directly above it on mobile.
- Starter chips submit a visible user message through the same validated/limited flow as typing; no bypass endpoint.
- Messages render text safely; links use validated schemes. No raw HTML from the model.
- Chat maintains one active response; disable additional sends while active, but keep Stop and language/motion controls usable.
- Copy answer copies visible assistant text only and announces success/failure; clipboard permission failure is explicit.
- At the input/history ceiling, explain the limit and offer a deliberate fresh conversation. Do not silently drop history.

## Avatar state and assets

Use the state transitions in [data-model.md](../data-model.md). `AnimatedAvatar` receives presentation state, language, and motion settings; it does not call APIs, invent emotional confidence, or hold conversation text.

| State | Normal-motion presentation | Reduced/paused presentation |
|---|---|---|
| idle | Subtle whole-image movement, no layered blinking | Static approved illustration |
| thinking | Restrained surrounding accent and visual state indicator | Static image and Thinking/Pensando text |
| responding | Distinct surrounding accent/whole-image reaction, no implied audio/lip-sync | Static image and Responding/Respondiendo text |
| error | Non-continuous error indicator, no responding motion | Static image and localized error text |

No human-live indicator or implied emotion detection. No microphone/camera/voice APIs. Stop/completion immediately return the animation to idle; error stays visibly non-responding until dismissed or a new submission starts.

The owner-approved PNG is self-hosted at `public/avatar/ana-paula.png`; verify its signature, dimensions and absence of text metadata against the approved asset. Do not invent SVG layers or facial movement. Never render visitor-supplied image markup. Image load errors yield an accessible localized notice and static/text fallback; written chat remains functional.

## Motion and accessibility

- Static CSS is the baseline. Enable motion only under `prefers-reduced-motion: no-preference` and when not manually paused.
- Localized Pause animation / Resume animation control supports keyboard and exposes pressed/state semantics; reduced-motion users are never overridden into continuous movement by the control.
- System preference changes take effect immediately. Pause choice may persist as a non-sensitive local preference; conversation text never does.
- No flashing; continuous motion can be paused. Animation cannot steal focus or move the input/messages.
- Meaningful localized status changes use a polite live region; do not announce every animation frame, streamed token, or decorative accent.
- Label the figure once; hide decorative accents from assistive technology. Keep the written response as the authoritative accessible answer.
- All controls have visible focus, labels, and WCAG 2.2 AA contrast in both themes. Input errors associate with the input; response errors and copy failures are announced.

## Language and theme

`en`/`es` dictionaries cover all visible controls, starter questions, statuses, notices, limits, and privacy disclosure. Select English by default; visitor selection updates UI without rewriting history. Answer language follows the latest user text with selected language fallback.

Light mode is the initial default. Theme preference can be stored locally as a non-sensitive preference. Dark theme retains accessible illustration details and contrast. Changing language/theme never restarts a request.

## Disclosure and privacy

Show "This is an AI version of Ana Paula" (and Spanish equivalent) under the input regardless of avatar state. First replies additionally disclose AI identity. Do not use the illustration to imply Ana Paula is present.

Footer explains: messages are processed by an external AI provider; application question analytics retain only safe catalog question text or omit it, plus language/time and a pseudonymous network identifier for up to 30 days; full IP and transcripts are not saved in application analytics. Link the public contact and relevant provider privacy details; do not promise global anonymity or zero platform/provider retention.

## Validation matrix

Playwright checks both languages, both themes, 360-pixel and 1,280-pixel viewports, keyboard-only navigation, normal/reduced motion, manual pause, successful/aborted/failed streaming, invalid input, 429, and missing avatar assets. Assert real state attributes and animation computed styles, not screenshot similarity alone.

Verify no horizontal overflow, no residual responding state after completion/Stop/error, no motion when paused/reduced from first render, complete chat with asset failure, functional Copy feedback, stable input focus, and automated accessibility checks plus manual keyboard/contrast review. Browser mocks validate transitions; real provider and production smoke tests validate actual streaming and mobile performance.
