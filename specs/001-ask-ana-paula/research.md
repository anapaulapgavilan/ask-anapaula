# Research: Ask Ana Paula

**Date**: 2026-10-28. Planning research, not a successful implementation test. Decisions preserve [spec.md](spec.md) and [delivery constraints](delivery-constraints.md).

## 1. Runtime and package baseline

**Decision**: Node 24 LTS across Codespaces, GitHub Actions, and Vercel; Next.js stable App Router and strict TypeScript. Registry queries from the existing Codespace resolved Next 16.4.3, `ai` 7.0.156, `@ai-sdk/anthropic` 4.0.91, `@ai-sdk/react` 4.0.160, TypeScript 7.0.2, Tailwind 4.3.3, `@upstash/redis` 1.40.0. These are planning observations, not an installed compatibility matrix.

**Rationale**: The observed AI SDK requires Node >=22, while Next's minimum is 20.9; Node 24 meets both and the owner requested LTS. Scaffolding must reconfirm the current stable releases, compile the chosen tuple, and commit its exact lockfile. Use ESLint CLI rather than assuming a `next lint` command.

**Alternatives considered**: Node 20 fails the observed SDK engine; unpinned `latest` in repeat builds makes evaluations irreproducible; local application installation violates the cloud workflow.

**Implementation evidence**: Cloud scaffolding confirmed the observed Next/AI SDK/Tailwind releases. The actual lint/type/build-compatible tuple pins TypeScript 6.0.3 because typescript-eslint rejects 7.0, and ESLint 9.39.5 because the installed Next plugins exclude ESLint 10 in their peer ranges. The ESLint 9 deprecation is documented rather than hidden by peer overrides. Node 24 devcontainer rebuild and controlled browser/axe checks passed; no real provider or Redis check has run. The AST compiler uses unified 11.0.5 and remark-parse 11.0.0, with tsx 4.23.15 for TypeScript scripts.

**Sources**: [Next installation](https://nextjs.org/docs/app/getting-started/installation), published npm metadata queried with `npm view` in Codespaces. SDK declaration sources below.

## 2. Streaming and SDK 7 API compatibility

**Decision**: `useChat` from `@ai-sdk/react` with `DefaultChatTransport` from `ai`; text-only validated `UIMessage` input; `await convertToModelMessages`; `streamText` with `maxOutputTokens: 600`; standalone `toUIMessageStream({ stream: result.stream })` and `createUIMessageStreamResponse`.

**Rationale**: SDK 7 declarations deprecate the result object's older `toUIMessageStreamResponse` helper. Its non-deprecated instruction property is `instructions`; `system` is a deprecated alias. For per-block caching, prepend explicit server-built system-role messages carrying provider options rather than attempting to put provider options on UI messages. Keep an adapter module and compile-contract test against pinned declarations.

Use the SDK's cancellation signal and a bounded request timeout; ensure word-limiting the text delta stream preserves SDK framing and does not leave a responding avatar active after Stop. Do not stream hidden reasoning or raw provider errors.

**Live compatibility evidence**: The configured model accepted real bilingual streaming and cancellation/deadline tests. It does not support fully disabled thinking; the provider-supported `between_tools` option removes up-front thinking without adding tools. The adapter suppresses reasoning in all visible output. The scaffold's optional Cache Components/partial-prefetch settings were removed because Next.js rejects explicit route runtime configuration with Cache Components; the chat endpoint remains explicitly Node and `no-store`.

**Alternatives considered**: Raw hand-built SSE without SDK framing; deprecated `maxTokens`; copying older SDK examples untested; using an arbitrary client system message.

**Sources**: [Chatbot guide](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot), [streamText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text), [Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), [published ai 7.0.156 declarations](https://unpkg.com/ai@7.0.156/dist/index.d.ts).

## 3. Complete knowledge block and prompt caching

**Decision**: Compile all completed approved sections in lexical topic order at build time; include the stable system rules and evidence before dynamic conversation data. On the evidence system message set `providerOptions.anthropic.cacheControl = { type: 'ephemeral' }` for the default five-minute TTL.

**Rationale**: There is no need for retrieval or a vector database under a 30,000-token corpus. Caching depends on an identical prefix and model-specific minimum length; empty templates may never produce a cache hit. Do not pad invented content or claim a hit when usage shows none. Inspect cache read/write token counters in controlled tests with the configured model.

Use Anthropic's token-count endpoint on the actual compiled prefix and configured model as a trusted release check; fail at 30,000 or more tokens. An estimated count is not a guarantee of billed tokens; recheck after model/content changes. Secretless PR builds validate structure/size conservatively but explicitly do not claim a provider token-count pass.

**Alternatives considered**: A vector store adds infrastructure without retrieval value; conversation-dependent cache blocks destroy reuse; one-hour cache writes add cost not justified for low-volume recruiting traffic.

**Sources**: [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting), [provider cache control](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic). Minimum thresholds depend on the operator-selected model; do not hardcode a model or rely on older provider-doc tables.

## 4. Exact rolling-day allowance

**Decision**: Use `@upstash/redis` and one atomic Redis sorted-set Lua script, not the stock weighted `@upstash/ratelimit` sliding window. Enforce 25 claims in `(now - 24h, now]`, using Redis server time and removing scores at or before the cutoff.

**Rationale**: Upstash documents its sliding window as an approximation. The specification tests exact 25/26 boundaries and release of individual expired claims. Atomic pruning/counting/claiming prevents concurrent serverless requests exceeding the limit. One database avoids multi-region consistency assumptions.

**Alternatives considered**: Fixed windows allow boundary bursts; weighted windows can reject or admit differently from an exact rolling log; non-atomic client pipelines race. The selected Lua design is an application design based on documented Redis primitives, not an advertised built-in Upstash exact-limiter feature.

**Sources**: [Upstash rate-limit algorithms](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms), [Upstash Redis TypeScript SDK](https://upstash.com/docs/redis/sdks/ts/overview), [Redis EVAL](https://redis.io/docs/latest/commands/eval/), [Redis sorted sets](https://redis.io/docs/latest/develop/data-types/sorted-sets/).

## 5. Safe question records and provider processing

**Decision**: Free-text questions are never retained as text. Store an owner-approved safe catalog question only on exact normalized match; otherwise use `question: null`. Store only that question value, supported language, timestamp, and domain-separated HMAC IP identifier with 30-day expiry. Never store transcripts.

**Rationale**: Regex or model-based redaction cannot guarantee removal of arbitrary names or private details. The specification permits omission when safe redaction is uncertain. This resolves the conflict between useful question analytics and the absolute no-names requirement without making false anonymization claims. Canonical catalog questions must themselves be reviewed to contain no personal identifiers.

Vercel supplies client network information; the application must not echo or persist raw IP. Infrastructure and Anthropic process some data outside the application's four-field log. Do not claim global anonymity, zero provider retention, or training guarantees unsupported by the actual service agreement. Before public launch, verify account/model-specific provider retention and platform logging settings and publish a truthful concise disclosure.

**Alternatives considered**: Plain hashes are enumerable over IP space; storing all questions after heuristic redaction violates the privacy target; default SDK telemetry/logging of bodies is prohibited.

**Sources**: [Vercel request headers](https://vercel.com/docs/headers/request-headers), [Anthropic commercial terms](https://www.anthropic.com/legal/commercial-terms), [Anthropic API retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention). Research did not establish contract-specific zero-retention eligibility; that is an operational prerequisite, not a design assumption.

## 6. Illustrative avatar without voice/video

**Decision (owner update 2026-10-29)**: Self-hosted owner-supplied PNG, CSS-only whole-image movement/state accents, and a typed chat-state reducer. The owner explicitly chose the supplied raster illustration over layered SVG blinking; do not invent facial layers.

**Rationale**: Gentle whole-image movement and thinking/responding accents preserve the supplied illustration without redrawing the owner's likeness or adding an external service. Static-by-default styling with a `prefers-reduced-motion: no-preference` enhancement prevents a motion flash on first render. A localized pause control and state text preserve the full experience without movement.

**Alternatives considered**: Lottie/Rive add an asset/runtime workflow not needed for this small state machine; real-time video, lip-sync, TTS, and camera/microphone permissions exceed the owner-selected scope. A talking mouth without audio would misleadingly imply speech.

**Sources**: [Reduced-motion media feature](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [WCAG pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## 7. PR evaluations, previews, and production

**Decision**: Secretless checks on all PRs; protected environment approval for live evaluations of an exact reviewed revision. No privileged `pull_request_target` execution of proposed code. Keep fork previews pending deployment authorization; same-repo code also needs review before receiving secrets.

**Rationale**: PR code and dependencies can exfiltrate credentials. Approval must apply to the code actually executed, not just author identity or a label. If live checks cannot run safely, the required status remains blocked/failed, not green. Use a reviewed maintainer branch for fork live checks and do not send model or Redis credentials into untrusted preview deployments.

Protect `main`, edit content through browser-created branches/PRs, and merge only after required checks. Vercel then automatically deploys the approved revision. Keep incomplete previews chat-disabled and visibly marked setup-only. Configure service quotas/alerts and separate preview/test Redis from production.

**Alternatives considered**: All PRs with secrets; `pull_request_target` plus head checkout; bypassing evaluations when a secret is absent; exposing unlimited chat in early previews.

**Sources**: [GitHub secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions), [secure workflow use](https://docs.github.com/en/actions/reference/security/secure-use), [environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Vercel GitHub integration](https://vercel.com/docs/git/vercel-for-github), [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 8. Clarified output finalization

**Decision**: For ordinary answers, reserve exact localized identity/contact word costs, hold incomplete model sentences/links, emit only complete units that fit, and discard an unfinished or over-budget tail. Include a short contact sentence on all successful replies, with AI identity on first replies, so unknown/refusal contact is never lost. Keep the 600-provider-token ceiling and SDK stream framing; explicit detail requests may exceed 150 words.

**Rationale**: The owner explicitly chose complete sentences and mandatory notices within 150 words, not a flexible target. Once arbitrary deltas have been sent they cannot be retracted, so buffering is necessary. A trusted short guidance-only outcome with an honest completion notice handles a model that supplies no complete fitting sentence without inventing facts. Measure first visible model sentence separately from local disclosure/status to preserve the latency requirement.

**Alternatives considered**: Cutting at the 150th word breaks sentences/links; adding notices after budgeting can exceed the ceiling; buffering the entire answer needlessly sacrifices incremental delivery; dropping required contact to fit optional prose violates the clarification.

**Evidence**: Owner decisions in [spec.md, Clarifications](spec.md#clarifications). This is an application design decision, not a provider guarantee. Implementation must test EN/ES segmentation, URL/email punctuation, split chunks, output-token exhaustion, aborts, and valid stream finish behavior.

## 9. Separate provisioning, deployment, verification, and announcement

**Decision**: Provision isolated cloud services before real integration tests. Approve content before model-backed private preview activation. Validate FAQ publication and ten-request latency in an access-protected release preview, then deploy production without announcing it, repeat publication/latency checks in production, and announce only after final acceptance.

**Rationale**: Tests cannot depend on credentials that are only provisioned after those tests pass. Production checks cannot be prerequisites for creating their own production deployment. The owner selected private-preview-first testing and independent performance acceptance in both environments. An unlisted public URL is not a private preview.

**Alternatives considered**: Run all checks only in preview (fails production acceptance); enable production before any preview proof (rejects the chosen sequence); place provisioning in the last activation task (blocks earlier real tests); treat disabled chat as access protection (does not make the site private).

**Evidence**: [Owner clarifications](spec.md#clarifications), [Vercel deployment protection](https://vercel.com/docs/deployment-protection), and the earlier cross-artifact analysis. Existing SDK/runtime research remains applicable; no new model, dependency, or account-level service capability was assumed or provisioned in this revision.

## Resolution status

No unresolved design questions. The operator must still choose `ANTHROPIC_MODEL`, configure service accounts and any required paid features, approve text/photo/CV/illustration, review provider retention, and supply actual deployment URLs. Those are explicit release dependencies. The planning documents make no claim that factual correctness, caching, latency, or live deployment has already been verified.

The task list has been reconciled with these decisions while preserving T001-T070: early provisioning and approvals, private-preview acceptance, deployment, independent production verification, and announcement now have separate prerequisites. Cross-artifact analysis should confirm consistency before implementation.
