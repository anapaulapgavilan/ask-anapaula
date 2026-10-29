# Tasks: Ask Ana Paula

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md), and [delivery constraints](delivery-constraints.md).

**Prerequisites**: These design documents are available. No adopted constitution or task extension hooks exist in the target repository. This document generates implementation work; unchecked tasks are not completed functionality.

**Tests**: Explicitly required by the specification. Write each story's tests before its implementation and observe the expected failures. Unit/mocked checks may validate templates and synthetic fixtures; real factual evaluations, service integration, owner approval, and deployment remain separate gates.

**Organization**: Setup, shared foundation, five prioritized user stories, then release work. Task IDs are stable and sequential. Paths are relative to the repository root; implementation commands execute only in Codespaces or CI, not the local documentation checkout.

**Reconciled revision**: Incorporates the 2026-10-28 clarifications and revised plan. Retains T001-T070 for traceability; numeric/story order is not a global execution order. The explicit prerequisites below govern early provisioning, content approval, private-preview acceptance, production deployment, and postdeployment verification.

## Format: `[ID] [P?] [Story] Description`

- `[P]` marks work on distinct files that can run concurrently in its dependency wave, not permission to ignore prerequisites.
- `[US1]` through `[US5]` map to the five stories in [spec.md](spec.md).
- External-service and owner-input tasks must stay blocked until actually satisfied; never invent credentials, public facts, assets, preview URLs, or passing results.
- Every implementation task includes its target files. All checkboxes start unchecked.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a reproducible cloud development environment without activating model-backed chat.

- [X] T001 Scaffold the latest stable compatible Next.js App Router application with strict TypeScript and Tailwind in Codespaces, preserve existing specification documents, verify actual SDK/runtime APIs rather than assuming research-version compatibility, and lock the tested dependencies in `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, and `src/app/globals.css`.
- [X] T002 [P] Configure Node 24 LTS, private forwarded port 3000, and automatic dependency installation in `.devcontainer/devcontainer.json`; verify a clean Codespace starts without local setup.
- [X] T003 [P] Configure `.gitignore` and blank `.env.example` with all ten variables in the plan environment table; exclude real env files, generated knowledge, credentials, build output, and private source documents while permitting the blank example.
- [X] T004 [P] Configure ESLint CLI, Vitest unit/contract versus live-integration separation, and Playwright with axe and controlled stream fixtures in `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, and `tests/fixtures/chat-stream.ts`. Define mutually exclusive Playwright projects `mocked`, `live-preview`, and `live-production` with explicit file/tag selectors; shared publication tests run only in the two live projects, release tests only in live production, and ordinary CI/default browser commands select only `mocked`. Live projects require explicit trusted execution and validated target configuration; missing configuration fails visibly, while unexecuted live acceptance remains pending.
- [X] T005 Wire `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`, `build`, and `dev` scripts in `package.json`; run the scaffold checks in Codespaces and correct dependency/type incompatibilities without installing unrelated tooling.
- [X] T006 Add the responsive setup-only shell in `src/app/page.tsx` and `src/app/layout.tsx`; commit stage 1 in English with the co-author trailer and record the real preview status or deployment blocker in the stage report, keeping chat disabled.

**Checkpoint**: Scaffold checks pass in Codespaces; no active unmetered chat or fabricated profile is public.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared content, configuration, and validation primitives before story implementation.

- [X] T007 [P] Create all eight ordered Markdown TODO templates in `content/00-persona.md`, `content/01-profile.md`, `content/02-experience.md`, `content/03-projects.md`, `content/04-stories.md`, `content/05-motivation.md`, `content/06-faq.md`, and `content/99-boundaries.md`; preserve the 14 revised generic FAQ headings with empty answers plus 25 TODO slots, the required story prompts, and per-section approval grammar without asserting unverified facts.
- [X] T008 [P] Define typed public profile/project configuration and server environment validation in `src/config/profile.ts`, `src/config/projects.ts`, and `src/lib/env.ts`; validate the approved email/HTTPS links, represent missing facts/assets explicitly, and default `CHAT_ENABLED` to disabled. Provision isolated integration Redis and Codespaces Anthropic/model/HMAC credentials through cloud settings before real service tests; record only non-secret readiness in `README.md`, keep integration data separate from preview/production, and report missing account access as a blocker rather than deferring provisioning to T060.
- [X] T009 [P] Add compiler tests in `tests/unit/knowledge.test.ts` and synthetic Markdown fixtures in `tests/fixtures/knowledge/` for the eight-file allowlist, 39 initial FAQ slots, AST section markers, empty/approved/TODO rejection, unsafe HTML/links, deterministic ordering/revisions, removed facts, and fact-free FAQ headings.
- [X] T010 Implement the AST-based content compiler and server-only artifact reader in `scripts/build-knowledge.ts` and `src/lib/knowledge.ts`, generating ignored `src/generated/knowledge.json`; exclude unapproved content, emit actionable errors, and pass T009 without runtime filesystem reads or questionnaire imports.
- [X] T011 Add `scripts/check-content.ts` and content build/check/readiness commands in `package.json`; run deterministic compilation before dev/build/evals and implement release-readiness failure for required unapproved content/assets without breaking explicitly setup-only secretless builds.
- [X] T012 Add shared EN/ES types, messages, and text-only Zod request schema in `src/lib/i18n.ts` and `src/lib/chat-schema.ts`, with `tests/unit/chat-schema.test.ts` covering NFC Unicode-code-point counts, 1,000/1,001 characters, 20/21 messages, unique IDs, allowed roles/parts, latest-user rule, and strict unknown-field rejection; commit stage 2 and report preview verification.

**Checkpoint**: All story work can start after T012. Approved synthetic fixtures work, TODO content never becomes evidence, and missing real owner content is visibly not release-ready.

## Phase 3: User Story 1 - Ask Trustworthy Career Questions (Priority: P1)

**Goal**: Deliver a bounded bilingual streaming response from approved evidence with honest missing-answer behavior.

**Independent Test**: In a trusted cloud test, load approved synthetic evidence and ask supported, unsupported, English, and Spanish questions. Verify factual grounding, first-reply disclosure, public contact, valid streaming, response limits, and cancellation without requiring the final illustrated UI.

### Tests for User Story 1

- [X] T013 [P] [US1] Add prompt construction tests in `tests/unit/system-prompt.test.ts` for first-turn disclosure, first-person voice, EN/ES reply selection, unknown-answer contact, trusted boundary precedence, untrusted assistant history, approved links, TODO exclusion, and stable cached-prefix ordering.
- [X] T014 [P] [US1] Add stream and SDK compatibility tests in `tests/contracts/chat-stream.test.ts` for typed conversion, SSE framing, 600-token cap, and 150/151-word boundaries including trusted first-turn disclosure and contact. Cover complete sentences/links split across chunks, URL/email/decimal/abbreviation punctuation, no fitting sentence, unfinished token-exhausted tails, explicit EN/ES detail requests, valid limited finishes versus incomplete errors, no reasoning leaks, and abort/deadline cleanup.
- [X] T015 [P] [US1] Add route contract tests in `tests/contracts/chat-route.test.ts` for method/media/origin/body-size checks, chunked 128-KiB overflow, forged system roles/options, strict transport payload shape, disabled-chat behavior, and no provider calls on rejected input.

### Implementation for User Story 1

- [X] T016 [US1] Build trusted instructions and approved-evidence system messages in `src/lib/system-prompt.ts`; enforce confidentiality/off-topic boundaries from day one, answer language, honest unknowns, no invented facts, and ephemeral cache control only on the stable prefix. Define localized trusted first-turn AI disclosure and public-contact guidance, instruct the model not to duplicate it, and keep dynamic first-turn/language guidance outside the reusable cached prefix.
- [X] T017 [US1] Implement the typed provider/stream adapter in `src/lib/chat-stream.ts` and shared EN/ES output rules in `src/lib/answer-format.ts` using supported SDK helpers, awaited conversion, env-selected model, `maxOutputTokens: 600`, no tools/reasoning/retries, and abort/deadline cleanup. Reserve exact disclosure/contact word costs within 150 words, emit only complete fitting buffered sentences/links, discard unfinished/over-budget tails, and use truthful guidance-only completion if no sentence fits; explicit tested detail requests may exceed 150 words. Distinguish model text from trusted notices for timing and reuse the formatter in evaluations.
- [X] T018 [US1] Implement the Node-runtime endpoint in `src/app/api/chat/route.ts` with bounded body reads, strict schema/media/origin checks, canonical trusted deployment-origin configuration, `no-store` streaming, safe localized errors, and an explicit disabled gate until US2/US5 controls are wired.
- [X] T019 [US1] Implement trusted prefix token counting in `scripts/check-tokens.ts` and wire `content:tokens` in `package.json`; use the actual configured model, fail at 30,000 or more tokens, and distinguish missing credentials from a successful secretless check.
- [X] T020 [US1] Add and execute a trusted controlled-provider smoke test in `tests/integration/anthropic.test.ts` for real message compatibility, bilingual disclosure/unknown contact, stop/deadline behavior, and repeated-prefix cache usage; report explicitly uncached if below the configured model minimum and never send private source content.
- [X] T021 [US1] Run T013-T015 and all required T020 trusted smoke checks against `src/lib/system-prompt.ts`, `src/lib/chat-stream.ts`, and `src/app/api/chat/route.ts`; complete and commit stage 3 only after they pass, reporting actual preview status with public chat still disabled pending limits/logging. Missing credentials or failed smoke checks leave T020/T021 incomplete and dependent tasks blocked; progress may be saved in a descriptive intermediate commit without declaring stage completion or bypassing dependencies.

**Checkpoint**: Backend conversation behavior is independently testable. Missing real credentials remain an explicit blocker, not a mock-derived live pass.

## Phase 4: User Story 2 - Protect Confidentiality and Visitor Privacy (Priority: P1)

**Goal**: Make refusal behavior and minimized storage testable without retaining private visitor free text.

**Independent Test**: Ask synthetic adversarial questions against the trusted prompt, inspect isolated Redis records, and prove that arbitrary names/contact strings produce omitted question text and no raw IP/transcripts.

### Tests for User Story 2

- [X] T022 [P] [US2] Add EN/ES adversarial prompt fixtures in `tests/fixtures/adversarial.json` and boundary-rule tests in `tests/unit/boundaries.test.ts` covering confidential revenue/clients/code/systems, salary, private contact, politics, unrelated code/poem requests, injected instructions, and unverified FAQ premises.
- [X] T023 [P] [US2] Add synthetic privacy tests in `tests/unit/log.test.ts` for domain-separated HMACs, canonical equivalent IPv4/IPv6 identities, safe-catalog exact matching, arbitrary text omission, exactly four stored fields, 30-day expiry, and diagnostics with no visitor body/name/contact/IP.

### Implementation for User Story 2

- [X] T024 [US2] Implement shared trusted-IP canonicalization and domain-separated keyed identifiers in `src/lib/network-identity.ts`; validate `IP_HASH_SECRET`, reject invalid/missing attribution, trust only Vercel-controlled deployment headers, and expose an explicit synthetic dependency seam for tests rather than a production bypass.
- [X] T025 [US2] Create the reviewed EN/ES identifier-free catalog in `src/config/question-catalog.ts`, introduce the shared environment-scoped client in `src/lib/redis.ts`, and implement `src/lib/log.ts` with exact catalog text or `question: null`, language/time/analytics HMAC only, atomic 30-day expiry, and explicit safe failures; use T008 integration credentials, never provision services as a side effect of logging or tests.
- [X] T026 [US2] Extend `src/lib/system-prompt.ts` and `tests/unit/system-prompt.test.ts` against T022 so sensitive-topic refusals are mandatory even with empty boundary templates or malicious instruction-like evidence; do not claim unit prompt inspection proves model compliance.
- [X] T027 [US2] Add real Redis persistence tests in `tests/integration/log.test.ts` using an isolated namespace to inspect field shape, HMAC domain separation, TTL, omission of synthetic identifiers, and storage failure behavior; delete only test-created keys after execution.
- [X] T028 [US2] Add localized AI/privacy disclosures in `src/components/Disclaimer.tsx` and `src/components/PrivacyFooter.tsx`, distinguishing pseudonymous application records from provider processing/retention, linking approved contact, and explaining safe-question text omission and 30-day retention.
- [ ] T029 [US2] Validate `src/lib/log.ts` and T022-T028 in Codespaces, review actual provider/infrastructure retention and diagnostic settings with the owner, and document the truthful resulting policy in `README.md`; keep runtime chat disabled until T060 integrates the limiter and logging before generation.

**Checkpoint**: Privacy/refusal modules work independently; successful model refusal requires the live cases in US4, and public activation still requires US5.

## Phase 5: User Story 3 - Meet the Animated Avatar and Use Accessible Chat (Priority: P2)

**Goal**: Deliver the illustrated animated experience alongside usable written chat in both languages and themes.

**Independent Test**: Use controlled success/stop/error streams in the browser at 360 and 1,280 pixels. Verify layout, keyboard access, copy, language/theme switching, actual avatar state transitions, reduced motion/pause, and asset-failure fallback.

### Tests for User Story 3

- [X] T030 [P] [US3] Add lifecycle reducer tests in `tests/unit/avatar-state.test.ts` for idle/thinking/responding/error, stop/completion/error cleanup, independent asset failure, system reduced-motion changes, and manual pause without aborting chat.
- [ ] T031 [P] [US3] Add Playwright tests in `tests/e2e/chat.spec.ts` for strict SDK transport payloads, starter submissions, incremental text, one active request, Stop preserving partial text, Copy success/failure, visible disclaimer, input/history limits, fresh conversation, and no automatic retries/transcript storage.
- [ ] T032 [P] [US3] Add Playwright/axe checks in `tests/e2e/avatar-accessibility.spec.ts` for both languages/themes/viewports, first-render reduced motion, paused computed animations, no residual responding state, missing PNG notice/fallback, focus, contrast, status announcements, and zero horizontal overflow.

### Implementation for User Story 3

- [ ] T033 [P] [US3] Implement approved-data-only profile and project presentation in `src/components/Hero.tsx` and `src/components/ProjectCards.tsx`, with clearly unavailable missing CV/photo/social/project destinations rather than fake claims, assets, or clickable placeholder URLs.
- [ ] T034 [P] [US3] Implement complete EN/ES UI dictionaries and light-default/theme/language controls in `src/lib/i18n.ts`, `src/components/LanguageToggle.tsx`, and `src/components/ThemeToggle.tsx`; persist only non-sensitive preferences and never rewrite messages or restart an active request.
- [ ] T035 [US3] Implement `src/components/Chat.tsx` and `src/components/SuggestedQuestions.tsx` with `useChat`/`DefaultChatTransport` request preparation matching the strict schema, four to six localized chips, bounded submission, safe rendering, streaming/stop/copy/error states, and deliberate fresh-chat handling for oversized history.
- [X] T036 [US3] Implement the typed state reducer in `src/lib/avatar-state.ts` from real request/first-text/finish/abort/error events, keeping motion and asset availability independent; pass T030 without inferring emotions or human presence.
- [X] T037 [US3] Obtain owner approval for the supplied illustration and import `public/avatar/ana-paula.png`; verify PNG signature, dimensions, checksum and absence of text metadata. Owner decision 2026-10-29 replaces layered SVG blinking with whole-image movement/state accents. Preserve the source attachment and never substitute it for the hero photo.
- [ ] T038 [US3] Implement `src/components/AnimatedAvatar.tsx` and avatar styles in `src/app/globals.css` with the approved PNG, gentle whole-image idle movement and thinking/responding accents (no layered blinking), static-by-default reduced-motion handling, localized keyboard pause/resume, meaningful status text, and nonblocking asset-failure notice.
- [ ] T039 [US3] Compose Hero, chat/avatar, cards, disclaimer, footer, controls, and responsive editorial styling in `src/app/page.tsx` and `src/app/globals.css`; wire T036 to actual chat lifecycle, preserve input focus, and keep the hero photo distinct from the illustration.
- [ ] T040 [US3] Add truthful title/description, canonical sharing URL, fonts, and generated social image in `src/app/layout.tsx` and `src/app/opengraph-image.tsx`, excluding unverified biographical claims and nonexistent live URLs.
- [ ] T041 [US3] Run T030-T032 plus manual keyboard/contrast/mobile checks on `src/app/page.tsx`; commit stage 4, report the actual preview URL or blocker, and explicitly retain setup-only chat until stage 5 protections are verified.

**Checkpoint**: Mocked browser flows prove presentation behavior. Owner illustration approval is mandatory for finishing the visual release; mocked animation is not real provider/deployment verification.

## Phase 6: User Story 4 - Publish Approved Knowledge Without Coding (Priority: P2)

**Goal**: Provide browser-editable approved knowledge, trusted answer evaluations, and automatic reviewed publication.

**Independent Test**: Before production, edit an approved FAQ through GitHub and verify its update/removal in an access-protected trusted PR preview within 10 minutes of successful preview publication (T051). After deployment, separately repeat browser edit/PR/merge/redeploy/removal on production before announcement (T069); production success is never a predeployment prerequisite.

### Tests for User Story 4

- [ ] T042 [P] [US4] Add readiness/rebuild tests in `tests/contracts/knowledge-publication.test.ts` for clean-checkout regeneration, changed/removed/unapproved facts, no stale generated artifact, missing assets/contact, blocked factual fixtures, and template-only versus production-ready status.
- [ ] T043 [P] [US4] Add evaluation-runner tests in `tests/unit/evals.test.ts` for required/forbidden criteria, source references, language/disclosure/contact/refusal checks, missing credentials, unknown facts, fail/blocked nonzero exits, and sanitized reports labeled with content/model/revision.

### Implementation for User Story 4

- [X] T044 [US4] Define at least 20 balanced bilingual cases in `evals/cases.json` with IDs, categories, questions, `must_include`, `must_not_include`, and approved source references; include the required revenue/instruction-override/unknown prompts, and mark unsupported real-fact fixtures blocked instead of inventing facts from TODO premises.
- [ ] T045 [US4] Implement `evals/run-evals.ts` using the real compiled system prompt, configured model, and shared `src/lib/answer-format.ts` output policy; bound calls, print pass/fail/blocked and revision/model metadata, verify source/language/contact/disclosure and complete 150-word ordinary answers, and fail nonzero on any blocked/missing-credential case; wire `evals` in `package.json` and evaluate the same visible text policy as the endpoint.
- [ ] T046 [US4] Implement secretless PR checks and protected exact-reviewed-revision evaluation jobs in `.github/workflows/ci.yml`, including content/grounding/eval/dependency change detection, explicit blocked fork status, read-only token, pinned Actions, and no `pull_request_target` execution of proposed code. Run browser checks explicitly with `npm run test:e2e -- --project=mocked`; never invoke live browser projects in ordinary PR jobs. Keep real preview/production browser acceptance as separate explicit trusted cloud runs under T051/T069; never treat missing secrets, unexecuted suites, or skipped live checks as a release pass.
- [ ] T047 [US4] Configure the protected evaluation environment, reviewer approvals, required branch checks, and trusted fork-to-maintainer-branch process for `.github/workflows/ci.yml`; provision only the approved Actions key/model exception through GitHub settings and document the actual configuration or permission blocker in `README.md`.
- [ ] T048 [US4] Prepare Vercel Git integration and actual private-preview access protection early after foundation, with separate preview/production settings and fork authorization; document real URLs/protection readiness in `README.md`, withhold secrets from untrusted code, and keep chat disabled until T060. Missing private access protection is a blocker; an unannounced URL or disabled chat is not privacy. This task does not wait for live evaluations or production acceptance.
- [ ] T049 [US4] Incorporate the owner's 2026-10-29 approval of selected CV-derived sections in `01-profile.md`, `02-experience.md`, `04-stories.md`, `06-faq.md`, and `99-boundaries.md` plus source-referenced cases in `evals/cases.json`; keep `00-persona.md`, `03-projects.md`, and `05-motivation.md` pending, never derive answers from questionnaires, and leave this task blocked while required content/profile facts remain missing.
- [ ] T050 [US4] Run real trusted token/cache/evaluation checks for `evals/cases.json`, have the owner review every factual assertion against approved sources, and exercise approved versus blocked PR/fork workflows in `.github/workflows/ci.yml`; commit stage 6 only after stage 5 is complete and report exact preview/check results.
- [ ] T051 [US4] Execute only the predeployment private-preview publication proof with `content/06-faq.md` and `tests/e2e/content-publication.spec.ts`, explicitly selecting `npm run test:e2e -- --project=live-preview` in a trusted Codespace: browser-edit approved content on a reviewed PR branch, verify new answers within 10 minutes of successful preview publication, then unapprove/remove and verify a fresh preview no longer supplies the fact. Restore approved release content and rerun affected checks; record actual revision/results in `README.md`, requiring no production deployment or production result.

**Checkpoint**: T051 proves private-preview publication before deployment; T069 completes the separate production acceptance after deployment. CI configuration alone does not satisfy either proof.

## Phase 7: User Story 5 - Handle Limits and Outages Predictably (Priority: P2)

**Goal**: Enforce exact request limits and friendly failures before any public model-backed chat is enabled.

**Independent Test**: In an isolated cloud Redis namespace, accept exactly 25 requests, reject the 26th, release capacity at the rolling boundary, and simulate limiter/log/provider outages. Verify input boundaries and real UI errors separately.

### Tests for User Story 5

- [X] T052 [P] [US5] Add limiter unit tests in `tests/unit/rate-limit.test.ts` for exact `(now-24h,now]` semantics, server time, unique claims, accurate Retry-After, no refund on stopped/failed requests, and failure without local/approximate fallback.
- [X] T053 [P] [US5] Add real Redis tests in `tests/integration/rate-limit.test.ts` for more than 25 concurrent claims, individual expiry boundaries, 24-hour key TTL, rejected-claim expiry behavior, isolated prefixes, and test-only clock injection unavailable through production request headers.
- [ ] T054 [P] [US5] Add route/UI failure tests in `tests/contracts/chat-errors.test.ts` and `tests/e2e/chat-errors.spec.ts` for malformed/oversized/history-boundary requests, 429/contact/Retry-After, limiter/log outages, unavailable attribution, provider failure, pre/post-stream deadlines, and labeled incomplete partial answers.

### Implementation for User Story 5

- [X] T055 [US5] Implement one atomic Redis server-time prune/count/add/expiry Lua operation and its typed adapter in `src/lib/rate-limit.ts`, keyed by T024 limit HMAC; enforce exactly 25 claims per rolling day without approximated windows or client-time trust.
- [X] T056 [US5] Harden and verify the existing T025 shared Redis client/namespace configuration in `src/lib/redis.ts` and `src/lib/env.ts` for limiter integration; assert production/preview/test isolation, no printed credentials, and no-reset HMAC rotation handling in `README.md`. Reuse services provisioned in T008; do not make earlier Redis tests depend on this later hardening.
- [ ] T057 [US5] Integrate canonical identity, allowance claim, then minimized question write before generation in `src/app/api/chat/route.ts`; claim failures reject closed, log failures produce explicit unavailable errors, and stopped/failed requests keep their consumed allowance.
- [ ] T058 [US5] Implement the complete localized pre-stream JSON status/code/contact contract and sanitized midstream errors in `src/app/api/chat/route.ts` and `src/lib/chat-stream.ts`; apply 45-second application/60-second route ceilings only after confirming hosting support, and avoid raw payload/provider diagnostics.
- [ ] T059 [US5] Wire friendly validation/limit/contact/retry/setup/error displays and incomplete partial-answer labels in `src/components/Chat.tsx` and `src/lib/i18n.ts`; preserve Copy/Stop accessibility and ensure every failure ends responding animation without automatic retries.
- [ ] T060 [US5] Activate only the owner-approved private preview using already provisioned T008/T048 services, T049 content, T037 illustration and T062 public assets/links. Verify actual access protection, isolated preview Redis, trusted header attribution and T052-T059 controls through `src/lib/env.ts`; enable `CHAT_ENABLED` only there, leaving production disabled until T068. Do not provision prerequisites here or require production checks to activate preview.
- [ ] T061 [US5] Run the boundary/outage matrix for `src/app/api/chat/route.ts`, `src/lib/rate-limit.ts`, and `src/lib/log.ts`; commit stage 5 in English with co-author trailer and report real preview results, outstanding secrets/service blockers, and consumed-quota behavior.

**Checkpoint**: No model call occurs without enforced limits and successful minimized logging. All exact thresholds are tested, not inferred from approximate limiter behavior.

## Phase 8: Polish & Cross-Cutting Release Work

**Purpose**: Complete approvals, documentation, measured acceptance, and the actual public release.

- [ ] T062 Obtain the owner's explicitly public/redacted CV and approved photo for `public/cv.pdf` and `public/photo.jpg`, approve hero facts and actual project/social destinations in `src/config/profile.ts` and `src/config/projects.ts`, and keep required asset/claim tasks blocked rather than copying the private source CV or inventing data.
- [ ] T063 Write recruiter-facing `README.md` in the required six-part order with real live-link status and chat demonstration, owner-approved three-sentence motivation/reflections, Mermaid architecture, small-corpus/caching/guardrail/eval/rate-limit tradeoffs, and voice/video roadmap; obtain missing personal text instead of ghostwriting unverified claims.
- [ ] T064 Review tracked files and client/server bundles for secrets/private documents, check `.gitignore`, `.env.example`, `src/lib/env.ts`, and `.github/workflows/ci.yml`, and add reproducible secret-leak checks in `scripts/check-secrets.ts` with a `package.json` command and secretless CI wiring; never print any discovered secret.
- [ ] T065 Run only predeployment cloud checks in `specs/001-ask-ana-paula/quickstart.md`, including build/types/lint/unit/contracts/isolated Redis/live evals/browser checks and the T051 private-preview FAQ proof; update actual script names and record unmet criteria explicitly. Production publication/performance sections remain pending T068-T069, not prerequisites for this task.
- [ ] T066 Implement reusable real-environment timing checks in `tests/integration/chat-performance.test.ts` and execute ten requests against the access-protected release preview; require at least nine first-visible-model-text times within five seconds under recorded network/model/revision conditions. Include sentence-buffer delay, exclude trusted notices/animation/status, assert complete ordinary answers within 150 words, and save preview acceptance separately from the later production sample.
- [ ] T067 Obtain owner predeployment sign-off on factual responses, illustration, public assets, bilingual copy, mobile/desktop keyboard/contrast and both themes against `specs/001-ask-ana-paula/spec.md`; record exact preview/release revision in `README.md`, distinguish predeployment approval from final production acceptance, and do not claim universal non-hallucination.
- [ ] T068 After preview publication/performance acceptance and T067 sign-off, configure production-only environment/region/quotas/privacy settings in `src/lib/env.ts` and `src/components/PrivacyFooter.tsx`, verify required checks/hosting limits, and deploy the reviewed `main` revision with controls and chat enabled. Record deployment status in `README.md` as deployed but not announced; no production test is required to create its own deployment.
- [ ] T069 After T068, explicitly select `npm run test:e2e -- --project=live-production` in a trusted Codespace to execute the production FAQ browser-edit/PR/merge/redeploy/removal proof in `tests/e2e/content-publication.spec.ts` within the 10-minute publication target, and independently rerun ten production requests through `tests/integration/chat-performance.test.ts` requiring at least nine within five seconds; never pool preview/production results. Run actual mobile/streaming/refusal/contact/limit/avatar/links/OG checks in `tests/e2e/release.spec.ts`, record actual tested revisions/results in `README.md`, and capture an approved `public/chat-demo.gif`. Failures block announcement and trigger correction/disabled chat; rerun affected checks after corrections.
- [ ] T070 Obtain final owner acceptance after production verification, commit truthful live-link and approved demonstration updates in `README.md` and `public/chat-demo.gif` with the co-author trailer, verify the final automatic redeploy and affected checks, and only then announce completion with observed evidence for every criterion or explicit blockers.

## Dependencies & Execution Order

### Phase dependencies

```text
Setup T001-T006 -> Foundation T007-T012 (T008 provisions test services)
  |
  +-> US1 streaming + US2 privacy + US3 illustrated UI
  +-> T048 private hosting setup
  +-> T042-T044 -> T049 owner content approval
  +-> T062 owner public asset approval
  |
  +-> US5 controls T052-T059
         + T048 + T049 + T062 + UI/privacy readiness -> T060-T061
  |
  +-> US4 trusted CI/evals T045-T050 (T050 also waits for T061)
         -> T051 private-preview FAQ proof
         -> T065 predeployment checks -> T066 preview latency
         -> T067 predeployment sign-off -> T068 production deployment
         -> T069 production FAQ + independent latency + smoke checks
         -> T070 final acceptance, redeploy verification, announcement
```

Stories are independently testable through synthetic fixtures, controlled streams, or isolated storage; the fully integrated public release genuinely depends on all five. Owner approval tasks may be requested early but are never marked complete merely because development can proceed with placeholders.

### Explicit task prerequisites and parallel waves

Phase 1 and foundation gates are required as listed below. Story headings establish ownership, not a requirement to finish the preceding story phase; otherwise early cross-story prerequisites would create artificial deadlocks. The following table is authoritative for execution, including early T048/T049/T062 work. Row order alone is not a dependency. Tasks grouped on a row have the same prerequisites and distinct targets unless noted.

| Tasks | Prerequisites |
|---|---|
| T001 | None; active Codespace and repository access |
| T002, T003, T004 | T001 |
| T005 | T002, T003, T004 |
| T006 | T005 |
| T007, T008, T009 | T006 |
| T010 | T007, T009 |
| T011 | T008, T010 |
| T012 | T008, T011; completes foundation gate |
| T013, T014, T015 | T012 |
| T016 | T013 |
| T017 | T014, T016 |
| T018 | T015, T017 |
| T019 | T016, T011 |
| T020 | T008, T018, T019; provisioned trusted provider credentials |
| T021 | T013-T020; required real smoke checks passed; blocked status never satisfies this gate |
| T022, T023 | T012 |
| T024 | T023 |
| T025 | T024 |
| T026 | T016, T022, T021; serialize shared prompt edits after stage 3 |
| T027 | T008, T025; already provisioned isolated Redis credentials |
| T028 | T025; serialize any `src/lib/i18n.ts` edits with T034 |
| T029 | T022-T028; owner retention review |
| T030, T031, T032 | T012 |
| T033, T034 | T030, T031, T032 |
| T035 | T034, T018; serialize any schema changes with T012 |
| T036 | T030 |
| T037 | T012; owner-supplied/approved illustration |
| T038 | T032, T036, T037 |
| T039 | T028, T033, T034, T035, T038; serialize shared styles after T038 |
| T040 | T039 |
| T041 | T030-T040 |
| T042, T043 | T012 |
| T044 | T043 |
| T045 | T016, T017, T019, T044; reuse the shared output formatter and serialize `package.json` edits after T019 |
| T046 | T042, T045; implementation may be prepared without live secrets |
| T047 | T046; GitHub admin/reviewer permissions |
| T048 | T012; early Vercel project/admin access and actual preview protection, independent of T047 |
| T049 | T044; owner content review; serialize content/fixture edits after T007/T044 |
| T050 | T042-T049, T061; exact-revision approval and model credentials |
| T051 | T050, T060; trusted working preview/publication settings |
| T052, T054 | T012 |
| T053 | T008, T012; write tests now using provisioned isolated services, execute successfully after T055/T056 |
| T055 | T024, T052, T053 |
| T056 | T025, T055; serialize environment changes after T008 |
| T057 | T018, T025, T055, T056 |
| T058 | T054, T057; serialize stream edits after T017 |
| T059 | T035, T038, T058; serialize Chat/i18n edits after US3 implementation |
| T060 | T027, T029, T041, T048, T049, T053, T056-T059, T062; protected hosting, approved content/assets and complete controls |
| T061 | T052-T060 |
| T062 | T012; owner public asset/link approval; finish before T065 |
| T063 | T029, T048, T062; owner motivation/reflections |
| T064 | T046, T056; serialize CI/package changes after T046/T045 |
| T065 | T050, T051, T061, T062, T064 |
| T066 | T060, T065; provider quota for ten measured requests |
| T067 | T063, T065, T066; owner review |
| T068 | T067; production credentials, required checks and services |
| T069 | T068 |
| T070 | T063, T069 |

Ranges mean every task in the inclusive range. External blockers must be surfaced with the affected IDs. Do not execute live tests with production logs/quotas when an isolated integration setup is required.

### Seven implementation commits versus story grouping

Story grouping is the source of ownership and acceptance; it does not override the owner's seven delivery milestones:

1. Stage 1: T001-T006.
2. Stage 2: T007-T012.
3. Stage 3: T013-T021, with mandatory baseline refusal instructions already in T016.
4. Stage 4: T030-T041; build T025/T028 early enough for UI integration and commit any directly imported shared modules needed for a buildable stage. Do not commit components importing missing stage-5 modules; keep chat disabled.
5. Stage 5: T022-T029 plus T052-T061 integration/verification. T026 augments tested baseline refusals; public chat was never enabled beforehand.
6. Stage 6: T042-T050; perform T048 hosting and T049 content approval before T060 regardless of milestone number. T051 is a private-preview proof after trusted preview activation, not a production prerequisite.
7. Stage 7: T062-T070; obtain T062 assets before T060. T065/T066 are predeployment checks, T068 creates production, T069 verifies production, and T070 announces only after final acceptance. Final live-link/GIF updates may need a small follow-up documentation commit after publication.

Use descriptive English messages and the required co-author trailer. Do not create empty milestone commits or falsely report success when blocked. Each stage report gives the actual preview URL/status and checks from [quickstart.md](quickstart.md). Missing hosting configuration is a blocker, not a made-up preview.

## Parallel Execution Examples

Run only the following bounded waves after the listed prerequisites, using separate file ownership. Parallel opportunities do not require agents or a multi-developer team.

### User Story 1

After foundation, T013 prompt tests, T014 stream tests, and T015 route tests can be written concurrently. After T016, token-count tooling T019 can proceed alongside stream adapter T017; both finish before the real integration smoke test, whose credentials already exist from T008.

### User Story 2

After foundation, T022 adversarial fixtures and T023 log tests can run together. After T025, T027 isolated persistence tests and T028 disclosure components target separate files; the prompt hardening task T026 waits for T021 and its own fixtures.

### User Story 3

T030 reducer tests, T031 chat browser tests, and T032 avatar/accessibility tests can run together. After those tests, T033 hero/cards and T034 language/theme controls can run together; T036 reducer implementation has no shared file with either. T038 and T039 must not edit shared styles concurrently.

### User Story 4

T042 knowledge-publication tests and T043 evaluation-runner tests can run together. T048 protected hosting can start immediately after foundation independently of CI; owner content review T049 follows T044 while T045-T047 establish trusted evaluations. Serialize shared README edits. T051 private-preview proof waits for T050/T060, whereas production verification belongs only to T069.

### User Story 5

T052 limiter unit tests, T053 real-Redis test definitions, and T054 route/UI error tests can be written together. T008 supplies isolated services before these tests; T055 implementation follows the expected failing tests, and successful live execution follows T055/T056. Shared route/stream/chat changes T057-T059 are sequential. Preview activation T060 waits for hosting/content/assets as well as controls, never for a production deployment.

## Implementation Strategy

### MVP first

The smallest internal backend milestone is setup + foundation + US1, demonstrated with controlled evidence and trusted provider tests. It is **not** a public MVP while limits, privacy, approved facts, and the owner-selected illustrated avatar are missing.

The public MVP includes US1-US5 and the release gates. Voice, video, vector search, visitor accounts, and an admin UI remain out of scope.

### Incremental delivery

1. Make cloud scaffolding and deterministic TODO-safe knowledge work.
2. Prove trusted streaming behavior without exposing incomplete public chat.
3. Build the bilingual illustrated experience and privacy modules with independent tests.
4. Integrate exact usage/log/error controls and verify a trusted preview.
5. Establish safe PR checks/live evaluations and prove browser content update/removal in the private preview; content/assets were approved before preview activation.
6. Pass the private-preview latency sample and owner predeployment sign-off, then deploy production without announcing it.
7. Repeat FAQ publication/removal and the independent latency sample in production, run smoke checks, obtain final approval, and announce only the verified release.

### Requirement coverage

| Requirements / outcomes | Principal task IDs |
|---|---|
| FR-001-008; SC-003/004/007 | T007-T021, T022, T026, T044-T045, T049-T050, T067 |
| FR-009-011/021; SC-001/008 | T028, T030-T035, T039-T041, T062, T069 |
| FR-012-014; SC-005 | T012, T015, T018, T052-T061 |
| FR-015-017/024; SC-006/007 | T003, T008, T023-T029, T054, T056-T060, T064 |
| FR-018-020; SC-002/010 | T042-T051, T065, T068-T070 |
| FR-022-023 | T001-T006, T029, T063, T065-T070 |
| FR-025-028; SC-011/012 | T030, T032, T036-T039, T041, T059, T067, T069 |
| SC-009 actual latency/length | T014, T017, T020, T066 (preview), T069 (production) |

## Completion Rules

Only mark a task complete when its artifacts persist and its required checks succeed. A blocked owner/service task remains unchecked with an explicit report; never weaken acceptance to finish the list. Update directly related docs when actual SDK/script names differ from the plan, without silently changing requirements. A passing keyword report alone does not establish factual truth or zero hallucination.
