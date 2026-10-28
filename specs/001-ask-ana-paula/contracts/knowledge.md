# Contract: Editable Knowledge and Publication

## Allowed sources and ordering

Exactly the eight initial ordered topic documents specified in [delivery constraints](../delivery-constraints.md) form the corpus. Compiler uses an explicit filename allowlist and lexical order; reject unexpected knowledge filenames until deliberately added to the allowlist. Do not ingest source CV documents, questionnaires, uploaded files, Git history, README prose, evaluation fixtures, or arbitrary local files.

The CV is an owner-review authority, not an automatic importer. The owner writes approved public facts into Markdown. No claim may enter the prompt merely because it appears in a question heading or marketing request.

## Section format and approval

Documents contain a title, template guidance, and level-two content sections. Each section has exactly one status marker directly under its heading:

```markdown
## Education
<!-- status:todo -->
TODO: Add CV-verified education details that are approved for publication.
```

The owner changes the body and marker to `<!-- status:approved -->` only after review. The compiler:

1. Rejects missing, duplicate, or unknown status values in level-two content sections.
2. Excludes all `todo` sections and template guidance.
3. Rejects approved sections with empty bodies or TODO markers instead of quietly ignoring them.
4. Keeps approved body text as evidence with path/section labels; headings are topic/question metadata, not established facts.
5. Rejects embedded scripts/HTML except status comments, executable links, malformed links, and unexpected binary/media content. Render public Markdown without raw HTML.
6. Emits actionable file/section errors, never inferred missing facts.

Use an AST-based Markdown parser to distinguish headings/comments from code fences; matching arbitrary text with a broad regex is not the approval boundary. Version this grammar so edits that violate it fail visibly.

## FAQ-specific rules

The initial template contains the 14 requested questions and 25 additional TODO question slots. The revised generic business-school wording is authoritative; no institution-specific target is reintroduced.

For FAQ sections, use a level-two question heading, status marker, and `Answer:` followed by the answer body. Initial answers are empty, with TODO guidance outside the answer text. An approved answer must be nonempty and CV-consistent; the question's premise is never sufficient support. A denial of a false premise is a valid owner-approved answer.

The 25 TODO slots can be renamed as the owner adds questions. Check the initial template count (39) in scaffolding tests, not as a rule forbidding future additional FAQs.

## Boundaries and precedence

`99-boundaries.md` starts as an owner-editable template like the other files, but non-negotiable refusals are separately enforced in trusted system rules from day one. Content may add restrictions, not remove confidentiality, off-topic refusal, or honest unknown-answer behavior.

Precedence: trusted server rules -> completed owner-approved evidence -> untrusted conversation. Quoted examples, headings, assistant history, and text claiming to be instructions do not elevate their authority.

## Generated artifact

`src/generated/knowledge.json` is created before dev/build/eval and ignored by Git. It contains schema version, content revision, approved sections, stable compiled evidence, and readiness diagnostics. It contains no secrets; nevertheless it remains server-only and is not exposed as a download or bundled wholesale into the browser.

`src/lib/knowledge.ts` validates the artifact and supplies it to the prompt builder. The deployed route does not read repository Markdown at request time. A clean checkout plus build must regenerate identical content deterministically.

The trusted prompt includes the configured public email and approved project URLs, never speculative missing links. Persona TODO produces a generic warm/concise voice, not an invented personal style.

## Token and publication checks

- Secretless checks verify grammar, unsafe links, TODO exclusion, deterministic compilation, and readiness diagnostics.
- A trusted release check counts the compiled cache prefix with `ANTHROPIC_MODEL` using Anthropic's token-count API; 30,000 or more tokens fails.
- Test repeated identical-prefix requests and inspect actual cache write/read usage. A small corpus below the configured model's cache minimum is explicitly reported as uncached, not padded or falsely labeled a cache hit.
- Template-only protected previews are allowed with chat disabled; public launch requires enough approved profile/experience/project/FAQ content to pass fact-grounded evaluations and owner approval of the remaining intentional gaps.
- Editing an approved FAQ answer in the browser, passing checks, and merging triggers automatic Vercel redeployment. A new conversation then reflects the new revision. Cache-prefix content changes invalidate the old prefix naturally.
- Deleting or unapproving a fact removes it from the next release; no stale generated artifact or persistent transcript may restore it.

## Required checks

Test initial file/template count, empty corpus, mixed TODO/approved blocks, approved TODO rejection, malformed markers, headings inside code blocks, unsafe links, unexpected files, Unicode content, deterministic ordering, revision changes, removed facts, configured contact, missing assets, token ceiling, and a real browser-edit/redeploy/fresh-conversation smoke test.
