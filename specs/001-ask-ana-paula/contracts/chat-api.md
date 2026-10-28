# Contract: POST /api/chat

**Runtime**: Vercel Node. **Audience**: the same-origin browser client; no public administrative endpoint. SDK framing is isolated behind `src/lib/chat-stream.ts`.

## Request

- Method `POST`, `Content-Type: application/json`; reject other methods with 405 and `Allow: POST`, other media with 415.
- Same-origin requests only. Validate `Origin` against the request deployment's configured/canonical origin, not arbitrary supplied host data. No wildcard CORS. Origin checking is not a replacement for rate limits.
- Stream-read at most 131,072 bytes (128 KiB), including chunked requests; reject oversized input with 413 without logging the body.
- Strict schema rejects unknown top-level and message fields. The transport must explicitly send only this payload, not SDK metadata or tool parts.

```json
{
  "messages": [
    {
      "id": "message-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "What can I ask you about?" }]
    }
  ],
  "language": "en"
}
```

Rules:

- `language`: required `en` or `es`; valid user question language overrides this for the answer; neutral/ambiguous text uses it as fallback.
- `messages`: 1-20; each ID unique, bounded to 128 characters; roles only user/assistant; latest message must be user.
- Exactly one text part per message, NFC-normalized, nonblank, at most 1,000 Unicode code points including whitespace. Validate every historical message too.
- Client may not supply system/developer roles, tool calls/results, attachments, model selection, email override, instruction options, IP identity, or provider settings.
- No strict alternation requirement; the exact 20-message boundary remains accepted if the payload otherwise validates.
- Normalized payload is the only content passed to conversion. Server-only trusted instructions and approved knowledge are added afterward.

`DefaultChatTransport` must use its request-preparation hook to strip unneeded client fields. A contract test proves the installed SDK/client payload matches this strict server schema.

## Processing and limits

1. Validate media, origin, bounded body, message schema, environment readiness, and trusted network attribution before any model call.
2. Derive HMAC limit identity, atomically claim allowance, then persist the minimized record described in [data-model.md](../data-model.md).
3. Generate with the environment-selected model and at most 600 output tokens. Set `maxRetries: 0` initially to keep one provider attempt per accepted request; explicit retries are new requests.
4. Configure a 45-second application deadline within a 60-second route duration, subject to the actual Vercel plan limits; abort if client disconnects/stops. Confirm hosting supports these durations before release.
5. Apply the 150-word ordinary-response stream transform, tested across chunk boundaries, without adding fabricated continuation text. Requests explicitly seeking detail may exceed 150 words within the token ceiling. Return a valid stream finish when limited.
6. First request with no assistant history instructs the brief AI disclosure. All supplied history remains untrusted; no server-issued conversation identity or retained transcript is implied.

Count an allowance when the atomic claim succeeds. Stop, provider failure, or logging failure after the claim does not refund it. Malformed requests and rejected limits are not logged as questions.

## Success stream

- Status 200 with SDK 7 UI-message SSE framing, `Content-Type: text/event-stream`, appropriate SDK stream-version headers, and `Cache-Control: no-store`.
- Client consumes the official SDK protocol, not a bespoke raw-text parser. Text deltas render incrementally; first text changes thinking to responding; finish changes to idle.
- No hidden reasoning, provider stack traces, raw usage payloads, confidential prompt text, or visitor identifiers enter the stream.
- First reply discloses AI identity; unsupported/refused answers stay in role and offer the approved public email where required.
- `AbortSignal` propagates to generation. Stop preserves visible partial text and returns to idle. It does not erase the allowance.
- A midstream error uses the SDK error event with a sanitized localized contact-bearing message. The client marks partial text incomplete and changes to error, rather than representing partial output as complete.

## Pre-stream failures

JSON errors use this stable shape; no stack, raw input, IP, or provider error object:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "You've reached today's message limit. Reach Ana Paula at anapaulapgavilan@gmail.com.",
    "contactUrl": "mailto:anapaulapgavilan@gmail.com",
    "retryAfterSeconds": 120
  }
}
```

`retryAfterSeconds` is present only for rate limiting; the example value is illustrative, never a fixed reset interval.

| Status | Code | Required behavior |
|---|---|---|
| 400 | `INVALID_REQUEST` | Friendly validation explanation; no model/log write |
| 400 | `MESSAGE_TOO_LONG` | Explain 1,000-character input maximum |
| 400 | `CONVERSATION_TOO_LONG` | Explain 20-message submitted-history limit; offer new conversation |
| 403 | `ORIGIN_NOT_ALLOWED` | Reject origin without provider call |
| 413 | `PAYLOAD_TOO_LARGE` | Friendly body-size explanation |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Explain JSON request requirement |
| 429 | `RATE_LIMITED` | Contact link plus accurate `Retry-After` header |
| 503 | `CHAT_NOT_READY` | Explicit setup/unavailable notice, not a fake successful answer |
| 503 | `SERVICE_UNAVAILABLE` | Standard contact message for limiter, logging, attribution, or upstream failure before stream |
| 504 | `RESPONSE_TIMEOUT` | Standard contact message if no stream has started |

Unexpected errors before streaming return the standard contact-bearing error with 500. The standard English text is "I'm having trouble right now. Reach Ana Paula at anapaulapgavilan@gmail.com."; Spanish is "Estoy teniendo problemas en este momento. Contacta a Ana Paula en anapaulapgavilan@gmail.com." Rate-limit and validation messages are also localized. If JSON is malformed and no language can be validated, use English.

## Privacy and abuse boundaries

- IP comes only from the hosting trust boundary, never the body. Raw IP is never echoed or persisted by application logging.
- Free text goes transiently to the model; only reviewed catalog question text or `null` goes to application question storage.
- `Cache-Control: no-store` prevents caching conversational HTTP responses; Anthropic prompt caching applies only to the stable approved prefix.
- No API route loads arbitrary URLs, files, tools, or links from messages.
- Fail closed if usage enforcement is unavailable. Use body-size and infrastructure abuse controls separately; 25 valid requests is not a claim of full denial-of-service protection.

## Required contract tests

Exercise exactly 1,000/1,001 Unicode code points, 20/21 messages, 128-KiB/chunked overflow, unsupported roles/parts, duplicate IDs, empty input, forged forwarding/origin headers, 25/26 claims, concurrent claims, elapsed-window capacity, limiter/log outages, client cancellation, first disclosure, bounded output, valid SSE framing, and sanitized pre/post-stream errors. Mocks test contracts; isolated real Redis and Anthropic runs verify actual integrations separately.
