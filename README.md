# Ask Ana Paula

A bilingual AI career profile with an illustrated avatar, grounded in owner-approved public content.

**Live site: not deployed or verified.** Chat is disabled. A chat demonstration is pending a working, approved release; there is no placeholder GIF.

## Why I built this

TODO: Ana Paula will supply and approve three sentences about her motivation.

## How it works

The setup page, approved-Markdown compiler, disabled chat endpoint, avatar lifecycle reducer and independent privacy/allowance modules exist. Streaming, minimized Redis persistence and the exact rolling allowance are tested directly; public chat, route enforcement/logging integration and the illustrated UI are not yet active:

```mermaid
flowchart LR
  Owner[Owner-approved Markdown in GitHub] --> Build[Next.js build on Vercel]
  Visitor[Visitor browser] --> App[Next.js page and chat API]
  Build --> App
  App --> Limits[Upstash allowance and minimized logs]
  App --> Claude[Anthropic via Vercel AI SDK]
```

## Design decisions

- A small approved corpus will be compiled at build time; no vector database.
- Stable prompt caching and exact rolling rate limits are independently verified modules, not integrated release guarantees. Full factual/boundary evaluations and real deployment acceptance remain release gates.
- No photo, CV, biography, or illustration is published before owner approval.
- Development and application verification run only in GitHub Codespaces.

## What I learned

TODO: Owner-approved learning reflections after implementation.

## Roadmap

First complete the reviewed written-chat and illustrated-avatar release. Voice (ElevenLabs), a video avatar, and knowledge of other projects remain future work.

## Cloud development

Open this repository in Codespaces. The Node 24 devcontainer installs locked dependencies and Chromium with its operating-system dependencies. Port 3000 is private. Do not copy private CVs or questionnaires here.

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser command selects only the `mocked` project. Real acceptance must explicitly select `--project=live-preview` or `--project=live-production` in a trusted Codespace with HTTPS `E2E_TARGET_URL` and matching `E2E_TARGET_ENV` (`preview` or `production`). Live suites do not exist yet; a missing suite/configuration is not acceptance.

`npm run test:integration -- tests/integration/anthropic.test.ts` runs the trusted real-provider smoke matrix, not Redis or release acceptance. It consumes API quota and must never receive secrets from untrusted changes.

Set secrets through Codespaces/Vercel settings, never committed files or command history. The ten blank names are in [.env.example](.env.example). `CHAT_ENABLED` defaults to disabled; the endpoint also retains an unconditional setup gate until controlled preview activation.

### Stage 1 verification

- Cloud scaffold: Next.js 16.4.3, React 19.3.0, Tailwind 4.3.3, AI SDK 7.0.156.
- TypeScript 6.0.3 is pinned: the current Next.js ESLint stack rejects TypeScript 7. ESLint 9.39.5 is retained for the installed plugins' peer ranges; npm marks it deprecated. Update the tuple together when those upstream plugins support ESLint 10/TypeScript 7.
- Verified in Codespaces: locked clean install, lint, typecheck, two unit checks, production build, and two browser/axe checks at 360/1,280 pixels. These checks cover only setup, not chat, factual correctness, or live services.
- The devcontainer was rebuilt; SSH was absent from the base image and was restored. The explicit `sshd` feature now makes that requirement reproducible.
- Vercel preview: no deployment is recorded or verified. Once hosting is connected, verify the honest setup message, disabled chat, mobile layout, and absence of unapproved personal assets. A disabled page does not establish private access protection.
- T008 services are now available in Codespaces: Anthropic authentication/configured-model lookup and isolated Redis read/write/TTL succeeded, with synthetic-key cleanup. These checks do not prove paid generation or release acceptance. SSH automation must use a login shell (`bash -l`) to load Codespaces secrets; do not print their values.

### Stage 3 verification

- Trusted rules, stable cached evidence and dynamic language/first-turn guidance are separate. No TODO premise supplies facts.
- The shared formatter reserves identity/contact inside the ordinary 150-word ceiling, buffers whole sentences and intact links, discards unfinished tails and keeps SDK framing valid on Stop/errors.
- `/api/chat` validates origins, media, bounded bytes and strict messages but always returns `CHAT_NOT_READY` after validation until US2/US5 are integrated, even if an operator prematurely enables the environment flag.
- Verified: 60 unit/contract checks, two setup browser/axe checks, lint/types/build, and a real-provider matrix covering EN/ES with opposite UI-language fallbacks, missing information, a test-only synthetic fact, repeated-prefix cache usage, cancellation and deadline cleanup.
- The current trusted token check passed at 578 tokens including its synthetic envelope. Repeated real calls reported 561 cache-read tokens. This does not predict cache behavior for future approved content or models.
- The selected model rejects completely disabled thinking. Use the supported `between_tools` mode (no up-front thinking), no tools, and suppress all reasoning from visible streams. Model changes require a fresh compatibility/evaluation run.
- Vercel preview is still not verified. Once connected, confirm setup-only UI and a contact-bearing 503 from the disabled endpoint, with no public model generation. Hosting-duration support, rate limiting, privacy policy approval, content/assets, illustrated UI and full release evaluations remain pending.

### Privacy module verification (not stage-5 activation)

- Canonical IPv4/IPv6 aliases produce the same identity; rate and analytics IDs use separate HMAC domains. Only `x-vercel-forwarded-for` within the Vercel deployment boundary is accepted, never arbitrary forwarding headers in Codespaces.
- Question text is retained only on exact normalized match to the identifier-free safe catalog; all other free text becomes `null`. Exactly four fields are written atomically with a 30-day TTL. Real isolated Redis tests verify both persistence and sanitized write rejection, then delete only test-created keys.
- Bilingual refusal/injection fixtures and localized AI/privacy components exist. Prompt inspection is not proof of model refusal; the full live adversarial evaluation suite remains pending.
- T022-T028 are verified independently. Owner console evidence is recorded below, but T029 remains pending provider operational-retention details and actual hosting/Redis diagnostic settings. No zero-retention or global anonymity guarantee is made. The components are not yet wired into the setup page, and the endpoint remains disabled.
- Keep this integration Redis isolated from future preview/production data. Do not rotate `IP_HASH_SECRET` without the overlapping-window controls required by the plan.
- Vercel verification remains pending hosting: confirm no active chat or collection of visitor questions; later verify the real footer and controls only after route/UI integration.

### Owner-observed service settings (2026-10-28)

- Anthropic organization default: retention enabled for 30 days; zero data retention is not applied at this scope. The Default workspace screen shows unrestricted inference/global routing and workspace geography United States, not an explicit retention override. Workspace geography is not a US-only inference guarantee. No training-use guarantee is inferred.
- Upstash integration database: AWS primary N. Virginia (`us-east-1`), TLS enabled, eviction disabled. Daily backups are off and no configurable backups are listed. Prometheus/Datadog activation is offered rather than shown active. These observations do not establish internal backup, replica or operational-log retention.
- These are owner-shared console observations, not a provider audit or production approval. Screenshots, account addresses/IDs and credentials are not committed. T029 stays open until applicable provider policies and actual Vercel settings are reviewed; repeat these checks for preview/production services.

### Independent avatar lifecycle

- T030/T036 cover idle, thinking, responding and error, Stop/finish/error cleanup, stale-request event rejection, and single-active-request behavior. Asset loading/failure, reduced motion and manual pause remain independent of requests.
- Initial motion is disabled until system preference is known; manual resume cannot override reduced motion. Missing assets do not stop written responses. This reducer is not yet wired to browser chat: illustration approval T037 and the full UI/accessibility matrix remain pending.

### Exact rolling allowance and namespace verification

- T052/T053/T055/T056 are verified independently. One atomic Redis Lua operation uses server time, prunes claims at or before the 24-hour cutoff, counts/adds unique request IDs, and sets a 24-hour TTL only on success. Exactly 25 claims may exist in `(now - 24h, now]`; there is no refund, automatic retry, local counter or approximate fallback.
- A real isolated Redis test accepted exactly 25 of 40 concurrent claims, rejected 15, released individual claims precisely at their rolling boundaries, verified key TTL/expiry and no TTL extension on rejection, and checked a sanitized fail-closed storage error. Only a test fixture can replace the script clock, and it rejects keys outside its generated integration namespace; the production adapter accepts no client clock.
- Runtime namespaces are checked even with chat disabled: Vercel production requires `production`, preview requires `preview:<reviewed-target>`, and Codespaces/development requires `integration:<run>` or `test:<run>`. No implicit prefix exists. The shared client disables automatic retries. Namespace validation cannot prove two URLs refer to different databases: provision isolated credentials/databases and verify them before activation.
- Run only these Redis integrations with isolated credentials: `npm run test:integration -- tests/integration/log.test.ts tests/integration/rate-limit.test.ts`. Live provider tests remain a separate paid command.
- Preview remains unconfigured/unverified. The setup page and disabled endpoint are unchanged; these checks do not prove route enforcement, a working animated interface, or production readiness.
- Continuation verification in Codespaces: 108 unit/contract tests, two real Redis integration tests, two setup browser/axe tests, lint, typecheck and production build passed. No provider/approved prompt changes were made, so the paid Anthropic matrix was not repeated for this continuation.

#### HMAC rotation without resetting an active allowance

The application currently supports one HMAC secret, not dual-key overlap. Use controlled downtime:

1. Disable chat on every deployment sharing the Redis namespace/secret and revoke access to older chat-enabled deployments. The unconditional setup gate currently keeps this project disabled.
2. Abort/drain in-flight work and verify no deployment is still accepting allowance claims. Record the last possible accepted claim time; start the waiting period only after all claimers are stopped.
3. Wait at least 24 hours after that time. Keep the existing secret and namespace unchanged throughout the interval; do not delete allowance keys, flush Redis, enable eviction, or deploy a different prefix to reset the limit.
4. Rotate the secret through cloud secret settings, redeploy every participating deployment, and verify isolation, attribution and protected-preview controls before re-enabling. Never print the old/new values. Existing question records retain their original pseudonyms until their own TTL.
5. If uninterrupted service is required, first implement and verify atomic overlapping old/new identity checks for the full rolling window; that feature does not exist yet. An urgent credential incident requires disabling access first, not bypassing this window.

### Independent knowledge foundation

- Eight owner-editable templates exist in [content/](content/), including 14 requested FAQ questions and 25 empty extension slots. No personal facts are approved.
- `npm run content:build` compiles only approved Markdown sections into ignored server-only generated data. It runs before dev, build, and typecheck. The current result has zero approved sections; this is expected, not release readiness.
- Approval grammar, unsafe markup/URL rejection, deterministic output, fact removal, and failure cleanup are covered by synthetic tests. Synthetic fixtures never become public knowledge.
- Foundation T007-T012 is complete: typed public configuration represents unapproved facts/assets as null, server configuration rejects invalid values without exposing them, chat defaults disabled, and strict normalized text-only requests enforce 1,000-code-point/20-message boundaries. Content check/readiness commands exist; readiness correctly fails on the 14 current approval gaps.
- Vercel verification, once hosting is available: the setup page must remain unchanged and chat disabled with empty templates. Actual FAQ-answer publication cannot be checked until the API, approved content, trusted hosting, and controls exist.

See [implementation tasks](specs/001-ask-ana-paula/tasks.md) for completed work and remaining gates.
