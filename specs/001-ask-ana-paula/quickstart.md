# Quickstart and Validation Guide: Ask Ana Paula

This is a future implementation runbook, not proof the commands or app already exist. At planning completion the repository contains design documents only. `/speckit-tasks` and `/speckit-implement` must create the scripts and application first.

## 1. Prerequisites

- Open the repository in a GitHub Codespace; do not run the application/build on the local Windows clone.
- Node 24 LTS devcontainer with automatic npm install, then `npm ci` for locked repeat installs.
- Owner-approved public text, photo, CV, illustration, social/project links. Never upload the private source CV or personal-branding questionnaires into this public repo.
- Vercel project connected to the public repository, Git integration, protected `main`, and production/preview separation.
- Upstash production and isolated preview/test Redis databases, plus an Anthropic account/model.
- Codespaces and Vercel secrets from the [plan environment table](plan.md#required-environment-configuration). GitHub Actions uses only the approved trusted-evaluation key/model exception; actual secrets are never written into commands, docs, or committed env files.
- Confirm actual provider retention, Vercel plan limits/protection, spending alerts, and infrastructure log settings before public launch.

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
| `test:e2e` | Playwright browser checks against controlled/mocked chat transport |
| `evals` | Real model, real system prompt, case report, nonzero fail/blocked |
| `build` | Compile knowledge then production Next build |
| `dev` | Compile knowledge then start Next dev server |

The implementation must supply these scripts or update this runbook to their real names before claiming it is runnable.

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
8. Run ten real requests under recorded normal-network conditions; at least nine show first text within five seconds. Do not confuse animated thinking feedback with first model text.

## 6. PR and deployment checks

- Configure secretless checks for every PR; live evaluation job only gets secrets after exact-revision approval in the protected environment.
- Confirm a fork PR cannot access model/Redis secrets or run privileged code and has a clearly blocked live-evaluation status until reviewed. Do not mark missing-key cases green.
- Verify Vercel fork deployment authorization and review secret exposure before allowing a preview. Early previews are chat-disabled until controls exist.
- For a trusted PR, review its real preview URL, mobile behavior, content revision, and live evaluation report; protect `main` against merging failed/blocked required checks.
- Set production secrets through Vercel, not CI logs. Enable chat only after all safety/privacy/runtime checks pass. Production deploys automatically after approved merges.

## 7. Browser content-edit proof

1. In GitHub's web editor, create a branch, update one owner-approved answer in `content/06-faq.md`, and open a PR.
2. Verify grammar, grounding, secretless checks, approved live evals, and the actual preview.
3. Merge to `main`; confirm automatic Vercel publication.
4. Start a fresh conversation and ask that question. Within 10 minutes of successful publication, the answer reflects the new approved content.
5. Unapprove/remove the test answer in a reviewed follow-up and verify it no longer supplies facts; no stale cached prefix or generated artifact restores it.

This uses GitHub's browser editor without bypassing branch protection or uploading content separately.

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
