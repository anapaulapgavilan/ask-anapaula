# Data Model: Ask Ana Paula

This defines implementation entities and transitions for [plan.md](plan.md), not a new relational database. All persisted application data is either public Git content or narrowly scoped Redis records.

## 1. Knowledge document and approved section

| Field | Type / rule |
|---|---|
| `path` | One of the eight allowed ordered `content/*.md` paths |
| `topic` | persona, profile, experience, projects, stories, motivation, faq, boundaries |
| `sections` | Ordered sections described in [knowledge contract](contracts/knowledge.md) |
| `section.status` | `todo` or `approved`; explicit, never inferred from nonempty text |
| `section.heading` | Owner-editable heading; a FAQ question is not evidence that its premise is true |
| `section.body` | Markdown text; approved bodies must be nonempty and contain no TODO marker |
| `revision` | SHA-256 of canonical approved content, ordering, and trusted-prompt version |

Build artifact: schema version, revision, ordered approved sections, compiled evidence text, readiness diagnostics. No private source CV or questionnaire is included. Only the server imports the artifact. A content edit regenerates it; no runtime reindex or upload.

Relationship: a document has many sections; approved sections supply evidence to the system prompt. Link configuration is separately validated, and nonexistent/unapproved URLs cannot be promoted by prose.

Transition: `todo -> approved` requires an explicit owner edit and review against the official CV; `approved -> todo` immediately removes the section from the next build's evidence. Structural automation is not proof of factual truth.

## 2. Public profile and projects

- Profile: approved display name, approved biography/one-liner, public email, nullable approved LinkedIn URL, actual GitHub profile URL, nullable approved photo/CV asset references.
- Project: fixed project identifier, approved display label, nullable approved HTTPS URL, TODO/approved description, display order.
- Illustration: nullable approved SVG reference, approved layer identifiers for animation, localized accessible description.
- No placeholder URL is clickable. Missing required release assets fail readiness, while protected previews clearly show setup placeholders.
- Profile facts shown in the hero must also be included in approved knowledge if the avatar is expected to state them.

## 3. Conversation and message (transient)

| Field | Type / rule |
|---|---|
| UI language | `en` or `es`; English default |
| Message ID | Unique bounded string, 1-128 characters; no control characters |
| Message role | `user` or `assistant` only |
| Parts | Exactly one plain text part; no files, tools, metadata, or instructions |
| Text | NFC-normalized, 1-1,000 Unicode code points; not whitespace-only |
| Request history | 1-20 messages; last is user; IDs unique |
| Active request | One per browser chat; cancellation handle; no persistence |
| Response status | ready, submitted, streaming, error |

Do not require alternating roles: 20 submitted messages remain a testable valid boundary when the last is a user. Never trust assistant claims as approved evidence. A regenerated or edited question is a new allowance claim; automatic retry is disabled. Browser messages do not use localStorage, analytics, URL parameters, or server transcript storage.

An assistant output can exceed 1,000 characters within the output cap; before resubmitting history, if any message exceeds the input cap or a next request would exceed 20 messages, the client explicitly offers a fresh conversation rather than silently truncating facts or violating the contract.

## 4. Avatar state (client only)

| Trigger | Visual state | Text status |
|---|---|---|
| Ready, initial load, completed response, or visitor Stop | idle | Ready / Listo |
| Request submitted; waiting for text | thinking | Thinking / Pensando |
| First text delta until completion | responding | Responding / Respondiendo |
| Request/network/validation/rate-limit failure | error | Localized failure/limit text |
| New accepted submission after an error | thinking | Thinking / Pensando |

Motion state is independent: `systemReducedMotion: boolean`, `visitorPaused: boolean`; movement is enabled only when both are false. Pause does not abort chat. SVG load state is loading/available/unavailable; failure displays a static/text fallback plus a notice without changing request state. No continuous animation is announced to assistive technology.

## 5. Usage allowance (Redis)

Key: `{REDIS_KEY_PREFIX}:limit:v1:{limitId}`.

- `limitId = HMAC-SHA256(IP_HASH_SECRET, "limit:v1:" + canonicalIp)`.
- Value: sorted set of unique server request IDs, scores in server epoch milliseconds.
- Atomic Lua operation obtains server time, removes scores `<= now - 86_400_000`, and counts remaining entries.
- If count <25: add the unique ID, set 86,400-second key expiry, return allowed/remaining and the earliest included claim's expiry.
- Otherwise: do not add, return denied/zero remaining and oldest score +86,400,000 as retry time. Do not extend expiry on rejection.
- `Retry-After` is the positive ceiling of milliseconds-to-earliest-expiry divided by 1,000.
- Concurrent successful claims cannot exceed 25. Claims that stop/fail later are not refunded.
- Raw IP is only transiently canonicalized in server memory; IPv4-mapped IPv6 and equivalent IPv6 text forms must normalize to the same identity.
- Time/counter failures return a service error. No local-memory fallback, approximate fallback, or alternate region allows unmetered generation.

Use distinct databases or prefixes for production, trusted previews, and synthetic integration tests. A test-only clock is injected only into a test script/module, never through an endpoint/header in production.

## 6. Minimized question record (Redis)

Key: `{REDIS_KEY_PREFIX}:question:v1:{serverRequestId}`; set record and 2,592,000-second expiry atomically.

| Stored field | Type / validation |
|---|---|
| `question` | An exact catalog-approved canonical question string or `null` |
| `language` | `en` or `es`; inferred from latest text, UI language fallback |
| `timestamp` | Server ISO 8601 UTC timestamp |
| `ipHash` | HMAC-SHA256 with `"analytics:v1:" + canonicalIp` domain |

No extra body, name, contact detail, role, answer, transcript, raw IP, or user agent is stored. Catalog questions are reviewed for absence of personal identifiers and drawn from safe starter/FAQ phrasing. Matching only normalizes whitespace, case, and Unicode; unmatched free text is always `null`, not heuristically redacted text. Never store the unmatched original to investigate matching failures.

The analytics and limiter hashes are domain-separated but remain pseudonymous. TTL controls application retention, not provider or platform retention. No public log-reading/export endpoint is included. Redis logging errors produce sanitized operational codes and fail the request before generation.

## 7. Evaluation case and result

- Case: unique ID, question, language, category, `must_include`, `must_not_include`, expected behavior (supported/refusal/unknown/disclosure), and optional approved source section IDs.
- Never create expected facts from questionnaire content or TODO question premises. A supported-fact case referencing an unfinished section is blocked for release, not skipped as successful.
- Result: case ID, pass/fail/blocked, criterion outcomes, word count, latency, content revision, configured model, and controlled synthetic answer for reviewer inspection.
- No real visitor question is an evaluation fixture. Keyword lists are a baseline; refusal/contact, grounding source review, language, and first-turn disclosure require additional checks.
- Results must exit nonzero for any fail/blocked/missing required credential. Reports with synthetic questions may be short-lived CI artifacts; never include secrets, raw IPs, or provider diagnostics.

## 8. Publication revision

Fields: Git commit, content revision, dependency-lock revision, configured model, check statuses, owner approval, preview URL if real, production readiness.

Transitions: proposed -> secretless checks -> trusted evaluation approval -> live evaluations and preview review -> approved merge -> automatic production deployment -> smoke-tested release.

New commits invalidate previous exact-revision trust. A model change requires fresh evaluations and token/cache checks even if Git content did not change.
