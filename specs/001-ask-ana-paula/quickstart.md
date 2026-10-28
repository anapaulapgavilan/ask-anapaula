# Quickstart and Validation Guide: Ask Ana Paula

Implementation is partial: setup-only UI, cloud tooling, approved-Markdown compilation, configuration, strict request validation and the disabled streaming backend exist. Content build/check/readiness/token commands are implemented; readiness correctly fails until public content/assets are approved. The direct real-provider smoke test runs through `npm run test:integration -- tests/integration/anthropic.test.ts`. Public chat, full Redis integrations, illustrated UI, the evaluation runner and deployment acceptance remain pending. Commands describing pending features are not yet runnable proof. See [task status](tasks.md) and [repository status](../../README.md).

## 1. Prerequisites

- Open the repository in a GitHub Codespace; do not run the application/build on the local Windows clone.
- Node 24 LTS devcontainer with automatic npm install, then `npm ci` for locked repeat installs.
- Owner-approved public text, photo, CV, illustration, social/project links. Never upload the private source CV or personal-branding questionnaires into this public repo.
- Vercel project connected to the public repository, Git integration, protected `main`, and production/preview separation.
- Upstash production and isolated preview/test Redis databases, plus an Anthropic account/model.
- Codespaces and Vercel secrets from the [plan environment table](plan.md#required-environment-configuration). GitHub Actions uses only the approved trusted-evaluation key/model exception; actual secrets are never written into commands, docs, or committed env files.
- Confirm actual provider retention, Vercel plan limits/protection, spending alerts, and infrastructure log settings before public launch.

Provision isolated Redis and Codespaces provider credentials before attempting real integration tests; do not defer that setup to the task that enables preview chat. Request content/illustration approvals early. Verify actual access protection before calling a Vercel preview private; an unannounced URL or disabled chat is not access protection. If protection is unavailable, the private-preview gate remains blocked.

## 2. Cloud setup

In the Codespaces terminal, once implementation exists:

```sh
npm ci
npm run content:build
npm run dev
```

Open the Codespaces forwarded port 3000 privately. With templates only or missing service configuration, expect an explicit setup/unavailable notice, not a fabricated answer. Set actual secrets in Codespaces settings and rebuild/restart the workspace as needed; do not paste secret values into shell history or `.env` files.

Required package scripts to implement:

| Script | Purpose |
|---|---|
| `content:build` | Deterministically compile approved Markdown and report gaps |
| `content:check` | Validate grammar, links, approval, and template exclusion |
| `content:ready` | Fail if required release content/assets/approval fixtures are missing |
| `content:tokens` | Trusted provider count for configured model; fail at >=30,000 prefix tokens |
| `lint` | ESLint CLI |
| `typecheck` | Strict TypeScript, no emit |
| `test` | Vitest unit/contracts; explicit excludes for live integrations |
| `test:integration` | Isolated real Redis boundary/concurrency/expiry tests |
| `test:e2e` | Default selects only the Playwright `mocked` project; explicit live projects require trusted target configuration |
| `evals` | Real model, real system prompt, case report, nonzero fail/blocked |
| `build` | Compile knowledge then production Next build |
| `dev` | Compile knowledge then start Next dev server |

The implementation must supply these scripts or update this runbook to their real names before claiming it is runnable.

Keep the `mocked`, `live-preview`, and `live-production` browser projects explicitly separated by file/tag selectors. Ordinary PR CI selects only `mocked`. In a trusted Codespace, T051 explicitly uses `npm run test:e2e -- --project=live-preview` for real publication acceptance; after deployment, T069 uses `npm run test:e2e -- --project=live-production` for production publication and release smoke checks. Shared publication tests are live-only, not part of the default suite. Validate the actual target and access configuration before either live run; missing setup is a visible failure, and unexecuted acceptance remains pending.

## 3. Secretless checks

```sh
npm run content:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: TODO content is excluded, strict API boundaries pass, SDK framing compiles against pinned versions, browser tests pass with mock streams, and template-only build remains explicitly not production-ready. Missing model credentials must not force live calls during secretless build/tests.

Check `git status --short` and tracked files for actual env/secrets/private source files. Use the repository's secret scanner when implemented; never print credentials to demonstrate configuration.

## 4. Real provider and Redis checks

Only in a trusted Codespace or approved CI environment with isolated service configuration:

```sh
npm run content:ready
npm run content:tokens
npm run test:integration
npm run evals
```

Expected:

- Approved content <30,000 prefix tokens for the actual `ANTHROPIC_MODEL`; unfilled supported-fact cases fail readiness instead of being silently skipped.
- At least 20 real bilingual evaluations pass, including confidentiality, off-topic, injected instructions, missing answer/contact, AI disclosure, ordinary-answer length, and known approved facts.
- A reviewer checks every factual assertion against approved sources; keyword matches alone are insufficient.
- Repeated identical-prefix calls demonstrate actual cache read/write usage when above the configured model's minimum; otherwise report explicitly uncached.
- Exactly 25 concurrent accepted limit claims, rejection of the 26th, and release at the oldest claim's 24-hour boundary. Use an isolated test clock/script, never a production debug endpoint.
- Stopped/failed requests retain their claim. Limiter outage fails closed; logging outage yields a sanitized failure before model generation.
- Stored question records contain exactly the four permitted fields; arbitrary synthetic names/contact input produces `question: null`; never raw IP or transcript. Verify 30-day expiry and 24-hour limiter expiry using TTL assertions.

Avoid sending real personal identifiers or confidential information to providers during tests.

## 5. Browser and avatar acceptance

Use [UI contract](contracts/ui.md) and [API contract](contracts/chat-api.md) for precise assertions.

1. Open a 360-pixel mobile viewport and a 1,280-pixel desktop viewport in both themes and languages.
2. Confirm approved hero content, valid CV/professional links, four cards, four to six chips, disclaimer, footer, and social metadata.
3. Submit an English and Spanish question. See incremental text and matching response language. First reply discloses AI.
4. Observe idle -> thinking -> responding -> idle; Stop preserves partial text and ends responding; failure displays error rather than hanging animation.
5. Enable reduced motion before page load. Confirm no blink/continuous motion, with static illustration and localized state text. Test pause/resume and system preference changes.
6. Simulate a missing SVG: explicit localized notice and fallback, with full written conversation still usable.
7. Test Copy, clipboard failure, keyboard focus/order, labels, live-region behavior, contrast, overflow, and 20/21-message plus 1,000/1,001-code-point input boundaries.
8. Run ten real requests in the private release preview under recorded normal-network/model/revision conditions; at least nine show first model answer text within five seconds. Repeat with ten independent requests in production after deployment and before announcement; do not pool results or count animated feedback/server-authored notices as model text. Sentence buffering is part of the measured delay.
9. Exercise ordinary answers at the 150-word boundary including disclosure/contact: finish at complete sentences with intact links, no dropped mandatory guidance, and no unfinished token-exhausted tail labeled complete. Test explicit detail requests separately within the provider-token ceiling.

## 6. PR and deployment checks

- Configure secretless checks for every PR; live evaluation job only gets secrets after exact-revision approval in the protected environment.
- Confirm a fork PR cannot access model/Redis secrets or run privileged code and has a clearly blocked live-evaluation status until reviewed. Do not mark missing-key cases green.
- Verify Vercel fork deployment authorization and review secret exposure before allowing a preview. Early previews are chat-disabled until controls exist.
- For a trusted PR, review its real preview URL, mobile behavior, content revision, and live evaluation report; protect `main` against merging failed/blocked required checks.
- Set production secrets through Vercel, not CI logs. After private-preview acceptance and owner predeployment sign-off, deploy with production chat enabled and all controls verified. Production deploys automatically after approved merges. Only then run production-specific publication/performance checks; keep announcement blocked until they pass and the owner signs off. Disable chat or correct the deployment if those checks fail.

## 7. Two-stage browser content-edit proof

**A. Before production deployment: private preview**

1. In GitHub's web editor, create a branch, update one owner-approved answer in `content/06-faq.md`, and open a PR. Do not introduce invented test biography.
2. Verify grammar, grounding, secretless checks, approved live evals, and actual preview access protection.
3. In a fresh preview conversation, verify the approved answer update within 10 minutes of successful preview publication.
4. On that reviewed branch, unapprove/remove the test answer and verify a new preview revision no longer supplies it. Restore only content the owner approves for release and rerun affected checks.
5. Complete preview mobile/avatar/privacy/limit checks and the preview's independent ten-request latency sample. Record preview acceptance; it requires no production result.

**B. After accepted preview: production, before announcement**

1. Deploy the reviewed release to production with isolated production credentials and all controls active; do not announce it yet.
2. Make another genuine owner-approved FAQ edit through the browser editor and a reviewed PR. Merge to `main` and confirm automatic production deployment.
3. In a fresh production conversation verify the new answer within 10 minutes of successful publication. Repeat removal/unapproval through a reviewed follow-up and verify no stale prefix/artifact restores the fact.
4. Repeat the ten-request latency sample independently in production and run mobile/avatar/privacy/limit smoke checks. Any relevant correction requires affected checks to run again.
5. Record the actual tested production revision, owner final acceptance, real URL, and demonstration before announcing the site.

This uses GitHub's browser editor without bypassing branch protection or uploading content separately.

Application test scripts may use a trusted browser/deployment adapter, but must never add public test-only bypass endpoints, expose secrets, or substitute preview results for production. The full public proof is a postdeployment release gate, not a predeployment prerequisite.

## 8. What to verify after each implementation commit

| Stage | Preview verification |
|---|---|
| 1: scaffold | Codespace builds; responsive shell and setup-only notice; no active model endpoint |
| 2: templates/loader | Eight templates, 39 FAQ slots, deterministic compilation, zero TODO facts in evidence |
| 3: prompt/streaming | Mocked stream and real trusted cloud checks; public preview remains chat-disabled |
| 4: UI/avatar | Hero/cards/chips, EN/ES, themes, avatar states, reduced motion/pause, fallback, keyboard/copy/stop |
| 5: controls | Isolated 25/26 limit, outages, log omission/TTL/HMAC, friendly errors before enabling trusted preview chat |
| 6: evals/CI | Real passing cases, exact-revision approval, fork protection, separate endpoint/browser checks |
| 7: README | Real live-link status/GIF, approved motivations/reflections, architecture, tradeoffs, voice/video roadmap |

Record actual preview URLs and observed results after each stage. If deployment is not configured, report that blocker instead of claiming preview verification.

The reconciled [task list](tasks.md) schedules T008 service provisioning before integration tests, T048/T049/T062 hosting/content/assets before T060 preview activation, T051/T065/T066 private-preview validation before T068 deployment, and T069 production publication/performance checks before T070 announcement. T014/T017 cover sentence-safe 150-word output. Follow the authoritative dependency table rather than story numbering.
