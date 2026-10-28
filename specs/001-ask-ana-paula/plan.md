# Implementation Plan: Ask Ana Paula

**Branch**: `main` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: [Feature specification](spec.md) and [owner delivery constraints](delivery-constraints.md).

## Summary

Build a public bilingual career profile with a streaming, CV-grounded chat and an owner-approved illustrated animated avatar. Use one Next.js application on Vercel, ordered Markdown knowledge compiled at build time, Claude through the Vercel AI SDK, and Upstash for exact rolling limits and deliberately minimized question records. No vector database, audio, video, visitor accounts, or server transcript storage.

The avatar is part of the initial release, not a future enhancement: a local SVG illustration with CSS movement responds to actual chat lifecycle events and respects reduced motion and a pause control. Content and visual assets require owner approval; implementation must not manufacture biography, likeness, or first-person motivations.

This is a design deliverable, not an implemented app or live deployment. No application dependencies were installed and no credentials were created in this phase.

**Revision after clarification**: Incorporates the three owner decisions recorded on 2026-10-28: private-preview then production publication proof, independent latency acceptance in both environments, and sentence-safe 150-word answers preserving mandatory disclosures/contact. Existing SDK research is reused; package compatibility must still be verified during scaffolding.

## Technical Context

**Language/Version**: Strict TypeScript; Node 24 LTS in Codespaces, CI, and Vercel. Planning-time npm registry resolution in Codespaces: Next.js 16.4.3, TypeScript 7.0.2. Reconfirm stable versions and compatibility during scaffolding; pin exact tested versions and commit the lockfile.

**Primary Dependencies**: Next.js App Router, React compatible with Next, Tailwind CSS 4.3.3; `ai` 7.0.156, `@ai-sdk/anthropic` 4.0.91, `@ai-sdk/react` 4.0.160; Zod; `@upstash/redis` 1.40.0. Small Markdown parsing/build tooling selected during scaffolding. Browser Web Crypto/server Node crypto, no remote animation engine.

**Storage**: Git-tracked approved Markdown and public assets; Upstash sorted sets with 24-hour TTL for usage and individual 30-day-TTL question records. Conversation messages exist only in browser memory and transient request/provider processing, not application databases.

**Testing**: Vitest for unit and route contracts, Redis integration tests in an isolated cloud test database, Playwright for browser/mobile/language/theme/avatar checks, axe accessibility checks, ESLint CLI, `tsc --noEmit`, Next build, live Anthropic evaluations.

**Target Platform**: Linux Codespaces development and GitHub-hosted CI; Vercel Node runtime functions. Desktop/mobile browsers with streaming fetch; no local application build.

**Project Type**: Single full-stack web application with one public streaming endpoint.

**Performance Goals**: Independently in the private release preview and production, first visible answer text within 5 seconds for at least 9 of 10 documented normal-network requests before announcement. Ordinary answers contain at most 150 words including required disclosure/contact and end in complete sentences with intact links. Measure actual model text after sentence buffering, not a local status/disclosure; animation causes no layout shifts or obstruction. Mocks do not satisfy latency acceptance.

**Constraints**: Fewer than 30,000 cached knowledge tokens; at most 600 output tokens; 20 submitted messages, 1,000 Unicode code points per message, 25 accepted requests per canonical IP in each rolling 24-hour interval. No real `.env` files committed. No confidential facts or private source documents published.

**Scale/Scope**: One owner, one page, two languages, four project cards, eight initial knowledge documents, 39 FAQ slots, at least 20 live answer checks. No traffic-volume or concurrency guarantee beyond measured release checks.

## Constitution Check

*GATE: Pass before research; re-evaluate after design.*

The target repository has no ratified `.specify/memory/constitution.md`. The parent workspace contains only an unfilled constitution template; it imposes no adopted principles. No before/after planning hooks are configured in the target repository. Do not invent governance or silently adopt the parent template.

Binding gates derive from the approved specification:

| Gate | Pre-research | Post-design evidence |
|---|---|---|
| Approved facts only; no questionnaire import | PASS | Block approval, TODO exclusion, source review, honest unknown-answer tests |
| Cloud application development and verification | PASS | Codespaces setup and CI in [quickstart](quickstart.md); local checkout is a documentation copy |
| Secret isolation and trusted evaluations | PASS | Protected CI environment and fork-safe preview/eval policy in [research](research.md) |
| Exact rolling limit and privacy minimization | PASS | Atomic Redis contract; safe catalog text or omitted text, never arbitrary free-text retention |
| Animated illustrated avatar in v1, accessible without movement | PASS | [UI contract](contracts/ui.md) and browser validation matrix |
| No fabricated readiness or public assets | PASS | Explicit owner/service prerequisites and launch gate |
| Clarified publication and output acceptance | PASS | Private and production validation are separate forward-only gates; sentence/link-safe word budgeting and independent real latency samples |

No unresolved design clarification or unjustified gate violation remains. External accounts, assets, model choice, and approvals are deployment prerequisites, not fabricated completed work.

## Project Structure

### Documentation (this feature)

```text
specs/001-ask-ana-paula/
  spec.md
  delivery-constraints.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    chat-api.md
    knowledge.md
    ui.md
  checklists/requirements.md
```

`tasks.md` already exists from the previous planning revision. This command updates design only; `/speckit-tasks` must reconcile its dependency graph and acceptance checks before implementation.

### Source Code (repository root)

```text
.devcontainer/devcontainer.json
.github/workflows/ci.yml
content/{00-persona,01-profile,02-experience,03-projects,
         04-stories,05-motivation,06-faq,99-boundaries}.md
evals/{cases.json,run-evals.ts}
public/{photo.jpg,cv.pdf,avatar/ana-paula.svg}
scripts/{build-knowledge,check-content,check-tokens}.ts
src/
  app/{layout.tsx,page.tsx,globals.css,opengraph-image.tsx}
  app/api/chat/route.ts
  components/{Hero,Chat,AnimatedAvatar,SuggestedQuestions,
              ProjectCards,LanguageToggle,Disclaimer,ThemeToggle}.tsx
  config/{profile,projects}.ts
  generated/knowledge.json
  lib/{knowledge,system-prompt,rate-limit,log,chat-schema,
       chat-stream,env,i18n}.ts
tests/{unit,contracts,integration,e2e}/
.env.example
.gitignore
package.json
package-lock.json
README.md
```

**Structure Decision**: One deployable application. Keep server secrets, knowledge assembly, and Redis logic server-only; only approved public profile configuration and UI state enter the client bundle. Generated knowledge is ignored by Git and regenerated before development/build/evals. Binary assets and approved SVG are added only after the owner supplies/approves them; missing assets are explicit placeholders, not fake files.

## Phase 0 - Research Decisions

See [research.md](research.md) for cited decisions, alternatives, limitations, and stable-version observations. Research resolved SDK 7 APIs, prompt caching, exact Redis limits, provider retention disclosure, safe logs, trusted evaluations, and the lightweight illustration approach.

## Phase 1 - Design

### Knowledge compilation and grounding

Before development, tests that need real content, evaluations, and builds, run the same deterministic Markdown compiler. It recognizes explicit per-section approval markers, excludes TODO/unapproved blocks, validates topic ordering and links, and writes a revisioned server-only artifact. The system prompt loads the complete compiled corpus, not files from the runtime filesystem or a vector store.

The compiler emits errors with paths and section labels, never substitutes missing knowledge with generated facts. A template-only build may support protected previews but cannot pass the production content-readiness check. The public contact is validated independently of persona completion. See [knowledge contract](contracts/knowledge.md).

Trusted instructions enforce boundaries even when `99-boundaries.md` is still a TODO template. Completed knowledge is delimited as evidence, never authority to alter those instructions. User-supplied assistant history is not a trusted source of new facts. No browsing, tools, file uploads, or arbitrary link fetching.

### Streaming request lifecycle

1. Verify same-origin JSON POST, stream-read a bounded body, validate the text-only schema and latest user message.
2. Resolve a canonical client IP using Vercel's overwritten header only inside the deployed trust boundary; never trust a visitor-selected forwarding header in arbitrary hosting. Missing/invalid attribution returns unavailable rather than an unlimited bypass.
3. Use a domain-separated HMAC identifier in one atomic Redis sorted-set script to claim one allowance. Once claimed, it is consumed even if the visitor stops or the provider fails.
4. Persist the minimized question record before generation. If storage fails, return a friendly unavailable error; emit only an allowlisted operational code. Do not silently drop records or expose visitor input.
5. Convert validated UI messages with `await convertToModelMessages`. Prepend trusted system messages and the stable cached evidence block; use `maxOutputTokens: 600`, a server deadline, no tools, and abort propagation.
6. Map `result.stream` through the standalone `toUIMessageStream` and `createUIMessageStreamResponse` helpers. Suppress reasoning/provider metadata. For ordinary answers reserve the localized first-turn disclosure and contact sentence before budgeting optional model text; count all visible text toward 150 words. Buffer each model sentence until its end and link syntax are complete, then stream it only if it fits. Stop before a sentence that would exceed the remaining budget and discard any unfinished tail. More-detail requests retain the 600-token ceiling.
7. Emit the short trusted AI disclosure on first turns and a complete approved contact sentence on every successful answer, so mandatory unknown/refusal contact cannot be lost through truncation or a missed model classification. These static sentences are transparent identity/contact guidance, not invented biography. The model is instructed not to duplicate them; reserve their exact word cost. If no complete model sentence fits, finish with the trusted guidance and an honest localized inability-to-complete notice within the budget, not fabricated answer content. Stream failures instead emit the standard error and label any partial answer incomplete.

Use one tested EN/ES word counter and sentence/link-aware parser across stream transforms and evaluations. An explicit request for more detail is determined from the latest user text with documented EN/ES request patterns and tests; ambiguous requests keep the ordinary ceiling. Do not treat punctuation in URLs, email addresses, decimals, abbreviations, or split chunks as an automatic sentence end. Bound the held tail by the provider output ceiling, propagate cancellation, and complete SDK framing when output is limited. First-provider-text latency is measured only when a buffered model sentence becomes visible; local disclosure/contact/status must not mask a slow answer. Test both successful truncation and provider token exhaustion without a terminal sentence.

`chat-stream.ts` isolates SDK-specific framing and output limiting from the route. No transparent regeneration/retry from the browser; it could consume additional quota and duplicate requests. Abort, completion, and error drive the avatar state machine in [UI contract](contracts/ui.md).

### Exact allowance and deliberate log minimization

Use one regional Upstash Redis database close to the Vercel function. Execute prune/count/add/expiry atomically via Lua using Redis server time and unique per-request members. The stock weighted sliding-window package is intentionally not used because it cannot meet the exact boundary requirement. See [data model](data-model.md) for expiration semantics and concurrency tests.

Use separate HMAC domains for limiting and analytics with `IP_HASH_SECRET`; never persist raw IP, request bodies, transcripts, or rejected payloads in application diagnostics. Only a fixed, owner-approved safe question catalog can supply stored question text. Arbitrary free text always yields `question: null`; regex/LLM redaction cannot prove arbitrary names were removed. The model still receives the visitor's question transiently; disclosure must distinguish application records from provider/infrastructure processing and retention.

### Animated presentation and accessibility

Use an owner-approved, self-hosted layered SVG with stable eye/head/accent groups and CSS transform/opacity animation. No animation SDK, paid service, live camera, audio, or emotion inference. A typed reducer derives idle/thinking/responding/error from request lifecycle, not guessed emotion.

The CSS default is static; movement is enabled only when the system allows motion and the visitor has not paused it. Idle blinking, subtle movement, thinking and responding accents stop in reduced/paused mode, leaving localized status text and a static image. Accessible status announcements occur only on meaningful state transitions, not every streamed chunk or blink. Asset failure is independent of request failure.

### CI, previews, deployment, and evaluation

All PRs run secretless lint/typecheck/unit/contract/UI checks and a template-capable build. Live evaluations for content, grounding, eval, or dependency changes run only after a maintainer approves the exact revision in a protected GitHub environment. Same-repository changes are not automatically trusted. Never use `pull_request_target` to execute proposed code; never place the API key in build/test job environments.

For fork PRs, report live evaluations as blocked, not successful. After review, move the reviewed exact commit to a maintainer-controlled branch for protected evaluation; rerun approval after any new commit. Pin third-party Actions by commit and keep `GITHUB_TOKEN` read-only. Only the evaluation step gets the Anthropic key/model; no Redis production credentials.

Vercel Git integration supplies PR previews and automatic `main` deploys. Protect `main` with required checks so browser content edits use a branch/PR and approved merge; merging redeploys automatically. Fork deployments remain pending authorization and secret-free until trusted. Protected initial previews keep chat disabled with an explicit setup message until limits, logs, boundary rules, and secrets are verified. No paid protection feature is assumed: use available deployment protection plus the server chat-enable gate.

Production launch requires approved content/assets, live checks against the exact release revision and configured model, Redis boundary tests, secret checks, and mobile/a11y verification. A plain keyword pass is not proof of no hallucination; the owner reviews factual claims against the approved corpus. No release is labeled complete while those approvals are missing.

### Forward-only provisioning and release gates

1. **Cloud test services ready**: Before any real Redis or provider test, provision the isolated integration Redis database/namespace and Codespaces credentials. Prepare a Vercel project/Git integration and private-preview access protection early, with preview chat disabled and no production credentials supplied to untrusted code. This provisioning does not depend on tests that require those services.
2. **Approved inputs and controls ready**: Owner-approved content and illustration, public assets/links, working limit/log/error modules, and isolated integration results must exist before enabling model-backed preview chat. Request content approval as soon as templates/evaluation source references exist, not after the stage that needs approved preview content.
3. **Private release preview accepted**: Enable chat only for a trusted, access-protected preview with its own Redis data. A non-announced URL or `CHAT_ENABLED=false` alone is not private access protection. If appropriate Vercel protection is unavailable, keep this gate blocked rather than expose the preview. Prove the FAQ update/removal workflow and independently meet the 9-of-10 latency target here. No production success is required to complete this predeployment gate.
4. **Production deployed, not yet announced**: After preview acceptance, approved checks, content/assets and owner predeployment sign-off, deploy the reviewed revision with production-only secrets and working controls. This transition requires no production test that cannot run until deployment exists.
5. **Production verified**: Repeat the real browser FAQ edit/PR/merge/redeploy/removal proof and the independent ten-request latency test on production. Verify mobile/avatar/privacy/limit smoke behavior; failure blocks announcement and triggers correction or disabled chat, never a fictional pass. If a corrective revision changes relevant behavior, rerun affected preview/live checks and record the actual production revision.
6. **Announced release**: Only after production checks and final owner sign-off, publish the real live-link/demo and announce completion. Automatic `main` deploys remain active; subsequent content edits follow the same reviewed publication path.

Record deployment, preview acceptance, production verification, and announcement as distinct states, as defined in [data-model.md](data-model.md). Integration provisioning, content approval, and private preview testing must not be hidden behind later stage numbers.

### Required environment configuration

The example contains blank values only; actual credentials are set in cloud dashboards.

| Variable | Scope | Validation |
|---|---|---|
| `ANTHROPIC_API_KEY` | Server runtime; trusted live eval step | Required when chat/evals enabled; never `NEXT_PUBLIC_` |
| `ANTHROPIC_MODEL` | Server runtime; trusted token/eval step | Nonempty, operator-selected valid model; never hardcoded |
| `UPSTASH_REDIS_REST_URL` | Server runtime | HTTPS endpoint; separate preview/test and production databases |
| `UPSTASH_REDIS_REST_TOKEN` | Server runtime | Environment-scoped credential, not sent to CI by default |
| `IP_HASH_SECRET` | Server runtime | Cryptographically random, at least 32 bytes; stable across rolling-window overlap |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public build config | Approved `anapaulapgavilan@gmail.com`, valid email; required for release |
| `NEXT_PUBLIC_LINKEDIN_URL` | Public build config | Approved HTTPS URL, or visibly unavailable action |
| `NEXT_PUBLIC_SITE_URL` | Public build config | Real production HTTPS origin for metadata/contact origin validation |
| `CHAT_ENABLED` | Server runtime | Explicit `true` only for configured trusted deployments; defaults disabled with a setup notice |
| `REDIS_KEY_PREFIX` | Server runtime | Distinct `production`, `preview`, or test identifier; never visitor-selected |

Changing the HMAC key resets network identity; rotate with overlapping old/new limit checks for 24 hours or disable chat for that overlap, never silently reset active allowances. Logging TTL and cache TTL are unrelated.

### Delivery sequence and verification

Follow the seven owner-defined implementation commits in [delivery constraints](delivery-constraints.md), with avatar and motion controls in stage 4. For stages 1-4 keep model-backed preview chat disabled until stage 5 protections are verified. Add unit tests along with each feature; stage 6 completes automated evaluations/CI rather than postponing all validation until the end. After each stage report the actual preview URL/status and exact checks in [quickstart](quickstart.md); do not invent URLs.

The reconciled [tasks.md](tasks.md) retains T001-T070: T008 provisions isolated test services before T027/T053; T048 prepares protected hosting early; T049 content and T062 assets precede T060 private-preview activation. T051/T065 cover only predeployment validation, T066 measures preview latency, T068 creates production, and T069 repeats publication and independent latency checks there before T070 announcement. T014/T017 test and implement sentence-safe word budgets with mandatory guidance. Only the explicit dependency graph, not phase numbering or milestone prose, controls cross-story scheduling. Design gates pass; run cross-artifact analysis before implementation.

### Requirements traceability

| Requirements | Design and validation |
|---|---|
| FR-001-008 | Knowledge compiler, trusted prompt, EN/ES refusal/unknown/length/disclosure evals |
| FR-009-011, FR-021 | UI contract, Playwright mobile/keyboard/theme/language/copy/stop/metadata checks |
| FR-012-014 | API contract, Unicode/body/history bounds, atomic Redis concurrency/expiry/outage tests |
| FR-015-017, FR-024 | HMAC domains, safe catalog/null logs, TTL assertions, scoped secrets, outage/error tests |
| FR-018-020 | Branch/preview workflow, trusted exact-revision eval gate, browser FAQ redeploy smoke test |
| FR-022-023 | Recruiter README order, cloud quickstart, owner asset/content approvals |
| FR-025-028 | SVG state reducer, reduced-motion/pause, asset-failure and lifecycle browser checks |

## Complexity Tracking

No constitution violations. Two deliberate additions are necessary to meet exact requirements: the atomic sorted-set limiter instead of an approximate stock algorithm, and a small stream transform for the 150-word ceiling. Both remain isolated modules with boundary tests. No vector store, orchestration service, animation framework, or visitor identity system is introduced.
