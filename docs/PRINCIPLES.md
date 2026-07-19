# Smocker — Principles & Opinionated Choices

This document captures **what Smocker is, what it is deliberately not, and the design
choices behind it**. It is meant as a shared reference for triaging issues and reviewing
contributions: when a proposal conflicts with a principle here, that's not a bug to fix —
it's a boundary to discuss explicitly.

It is descriptive of decisions the maintainers have already made (mostly in issue threads,
referenced inline). It is not a roadmap.

---

## 1. What Smocker is

> **Smocker (server mock) is a simple and efficient HTTP mock server, designed for testing.**

- It answers HTTP requests on a **mock port** (`8080`) according to mocks you register on a
  separate **configuration port** (`8081`, which also serves the UI).
- Its primary use case is **integration / narrow tests**: spin it up (often in Docker), load
  mocks, run a test suite against it, and inspect what happened. ([#231], [#271])
- The **configuration API is the product**; the UI is a convenience layer on top of it.
  Anything doable in the UI must be doable via the API.

### What Smocker is not

- **Not a contract-testing tool.** Keeping mocks in sync with real API contracts is out of
  scope; use a dedicated tool (e.g. validate mocks against OpenAPI in your own CI). ([#271])
- **Not an outbound caller / webhook simulator.** Smocker *responds* to inbound requests. It
  does not initiate calls on its own; the only outbound traffic is the **proxy** mock type
  forwarding a request to a real backend. ([#162])
- **Not a general-purpose API gateway or a production service.** It is a testing tool.

---

## 2. Core model

- **Mock**: a `request` matcher + one of `response` / `dynamic_response` / `proxy`, plus
  optional `context` and server-managed `state` (opaque `id`, `times_count`, `locked`,
  `creation_date`).
- **Session**: a logical group of mocks and the history of calls they answered. **One session
  is active at a time** (the most recently created). Mocks are **scoped to their session**,
  not global. A new session does not inherit mocks — **except locked mocks**, which are
  duplicated (and reset) into it. ([#293])
  - Convention: **1 session = 1 test suite or 1 test case**. After a run, everything is neatly
    grouped, so a failing test maps to a browsable session. ([#293])
- **History**: the ordered record of calls the active session answered, each linked to the
  mock that matched (or flagged as unmatched — the `666` status). History powers session
  **verification**.

---

## 3. Opinionated choices (with rationale)

### 3.1 Mocks are append-only once a session has been called
Within a session that has received calls, mocks are **not editable or deletable**. Editing a
mock mid-test would break the meaning of the history↔mock link and of session verification.
Editing/deleting **is** allowed while the history is still empty, and clearing the history
(which resets call counters) re-enables it. ([#231], [#266], [#299], [#303])

> The right way to iterate on mocks is to author them as files and reload them, or work in a
> fresh session — not to mutate a session mid-flight.

### 3.2 Priority is declaration order — no explicit priority field
When several mocks match a request, the one declared **last wins**. An explicit `priority`
parameter was deliberately refused: it "brings a lot of new issues" for little gain. Reorder
your mocks instead. ([#219])

### 3.3 Mocks are self-contained — no external file references
There is intentionally no `bodyFile` / `file:` indirection. A mock (and a mocks file) must be
a **single portable artifact** you can move between machines and sessions. Large bodies inline
are fine — Smocker handles them. ([#161])

### 3.4 Matching is faithful to real HTTP, not lenient
- **Header names** are matched **case-insensitively** (RFC 7230 §3.2: header field names are
  case-insensitive), so a mock declaring `content-type` matches a request's `Content-Type`.
  **Header values** and **query-parameter names** stay **case-sensitive by design**: real
  servers are case-sensitive there (e.g. AWS API Gateway), and being lenient would hide real
  bugs in the system under test. ([#179], [#281])
- Smocker never rewrites the casing it is given: response headers are returned with the exact
  case the mock declares (or the upstream sends, for proxies). Note that Go's `net/http`
  canonicalizes header names when it parses an incoming request or an upstream proxy response,
  so those reach Smocker already canonicalized regardless.
- The default matcher is `ShouldEqual`; a bare string is shorthand for it. The matcher set
  (`ShouldMatch`, `ShouldContainSubstring`, `ShouldEqualJSON`, `ShouldNotBeEmpty`, …) is the
  vocabulary — prefer extending existing semantics over inventing parallel ones.

### 3.5 Dynamic responses: Go templates and Lua
Computed responses use **Go templates** (with the Sprig function set) or **Lua**. This covers
delays, values derived from the request, conditional bodies, etc. Binary payloads have **no
first-class support** today; base64 in a template is the current workaround — a recognized gap,
not a refusal. ([#308])

### 3.6 IDs are opaque
Session and mock IDs are **opaque, randomly generated** strings. Nothing should parse or depend
on their shape or generator. ([#122])

### 3.7 Concurrency safety
The mock server answers concurrent calls; mutation of shared state (e.g. `times_count`) must be
synchronized. Correctness under concurrency is a requirement, not a nice-to-have. ([#272])

---

## 4. The stability contract (the frozen surface)

Users keep large, long-lived collections of mocks across many projects. Two things are treated
as a **backward-compatibility contract** and must not change:

1. **The mock format and its serialization** — YAML/JSON struct tags, matcher names, default
   values, custom (un)marshalling (scalar/slice coercions, string→`ShouldEqual` shorthand,
   `Delay`, `BodyMatcher`, …), and the on-disk layout of `mocks.yml` / `history.yml` /
   `sessions.yml`.
2. **The HTTP/CLI API** — routes, payloads, status codes (including the custom `600`–`666`
   codes), flag names, and `SMOCKER_*` environment variables.

Rules:
- **Additive changes are fine** (new optional fields, new endpoints, new matchers). Changing or
  removing existing observable behavior is not.
- Persisted sessions from older versions **must still load**. Persistence is also expected to be
  **resilient**: one corrupt session directory must never discard the others. ([#292])
- The internal implementation (libraries, server plumbing, frontend stack) is free to evolve as
  long as the observable format/API is byte-for-byte compatible.

This contract is enforced by **golden serialization tests** (`tests/serialization`) and the
**venom integration suite** (`tests/features`). A change that moves a golden file or a venom
assertion is changing the contract — stop and reconsider.

---

## 5. Quality bar

- **Golden serialization tests** guard the on-disk/byte format.
- **venom integration tests** guard the end-to-end API behavior (matchers, templates, sessions,
  history, locks, verify, persistence).
- **Playwright non-regression suite** guards the observable UI features.
- **Unit tests** (Go + Vitest) guard logic.
- A canonical **JSON schema** (`docs/mock.schema.json`) describes the mock format and is
  validated against the fixtures in CI.

A contribution that changes behavior should show up in one of these; a contribution that
changes the *format or API* should be justified against §4 before anything else.

---

## 6. Checklist for judging an issue or PR

1. **Does it fit the purpose?** Is this about mocking HTTP for tests, or is it drifting toward
   contract testing / gateway / outbound-webhook territory (§1)?
2. **Does it respect the frozen surface (§4)?** If it changes the mock format or the API, is the
   change strictly additive and backward-compatible? Do old mocks still load?
3. **Does it conflict with an opinionated choice (§3)?** (explicit priority field, file
   references, case-insensitive matching, mutating called sessions…). If so, the default answer
   is "no, and here's the rationale" — reopen the discussion only with a strong new argument.
4. **Is it self-contained and portable?** Mocks stay one artifact; behavior stays reproducible.
5. **Is it covered by the quality bar (§5)?** New behavior needs a test at the right layer.
6. **Is the UI change also expressible via the API?** The API is the product.

---

## 7. Known, accepted limitations

These are recognized gaps, not oversights — worth improving, but not regressions:

- No first-class **binary file** responses (base64-in-template workaround). ([#308])
- No **outbound webhook / callback** simulation. ([#162])
- No **contract-testing** integration. ([#271])

---

*References point to the GitHub issues where the decision or explanation was recorded.*

[#122]: https://github.com/smocker-dev/smocker/issues/122
[#161]: https://github.com/smocker-dev/smocker/issues/161
[#162]: https://github.com/smocker-dev/smocker/issues/162
[#179]: https://github.com/smocker-dev/smocker/issues/179
[#281]: https://github.com/smocker-dev/smocker/issues/281
[#219]: https://github.com/smocker-dev/smocker/issues/219
[#231]: https://github.com/smocker-dev/smocker/issues/231
[#266]: https://github.com/smocker-dev/smocker/issues/266
[#271]: https://github.com/smocker-dev/smocker/issues/271
[#272]: https://github.com/smocker-dev/smocker/issues/272
[#292]: https://github.com/smocker-dev/smocker/issues/292
[#293]: https://github.com/smocker-dev/smocker/issues/293
[#299]: https://github.com/smocker-dev/smocker/issues/299
[#303]: https://github.com/smocker-dev/smocker/issues/303
[#308]: https://github.com/smocker-dev/smocker/issues/308
