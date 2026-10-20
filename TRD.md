# MindVault — Technical Requirements Document

## 1. Scope and architecture

The MVP is a static, single-page web application built with HTML, CSS, and vanilla JavaScript. It runs entirely in the browser and stores user data in `localStorage`.

```text
Browser UI
  ├─ presentation and event handlers
  ├─ application state and rendering
  ├─ local smart-search / retrieval utilities
  └─ versioned localStorage repository
```

No framework, package manager, database, authentication service, external API, or remote analytics is required.

## 2. Technology requirements

| Area | Requirement |
| --- | --- |
| Markup | Semantic HTML5 with native form controls where practical. |
| Styling | Plain CSS with custom properties for colors, spacing, typography, radii, and shadows. |
| Logic | Modern browser JavaScript using ES modules or clearly separated scripts. |
| Persistence | Browser `localStorage`; no sensitive information stored. |
| Compatibility | Latest stable Chrome, Edge, Firefox, and Safari; responsive from 320 px wide upward. |
| Dependencies | None for the MVP. |

## 3. Data model

Store one versioned JSON object under a single key such as `mindvault:v1`.

```json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "unique-string",
      "title": "Example idea",
      "content": "A short description.",
      "type": "idea",
      "url": "",
      "tags": ["learning", "web"],
      "isPinned": false,
      "isArchived": false,
      "createdAt": "2026-10-20T09:00:00.000Z",
      "updatedAt": "2026-10-20T09:00:00.000Z"
    }
  ],
  "settings": {
    "lastInsightDate": "2026-10-20"
  }
}
```

### Validation and normalization

- Generate unique IDs with `crypto.randomUUID()` where available, with a safe fallback.
- Require a trimmed title and content; set practical length limits and show inline messages.
- Limit `type` to `note`, `idea`, `link`, or `snippet`.
- Normalize tags by trimming, lowercasing for comparisons, removing duplicates, and ignoring blanks.
- Validate a supplied link as an `http:` or `https:` URL before saving.
- On load, parse JSON defensively; if corrupted or incompatible, retain a recoverable backup key where possible and start with a valid empty model.
- All writes must update `updatedAt` and serialize the complete valid model.

## 4. Application modules

| Module | Responsibility |
| --- | --- |
| `storage` | Load, validate, migrate when needed, save, back up, export, and reset local data. |
| `items` | Create, update, delete, pin, archive, and select captures. |
| `search` | Normalize text, perform keyword matching, parse small local smart-search patterns, rank results. |
| `insight` | Select a deterministic daily item or related pair from active items. |
| `ask` | Find relevant captures and compose transparent local responses with source references. |
| `ui` | Render screens, manage dialogs/forms, surface feedback, and bind DOM events. |
| `aiAdapter` | Define a future integration boundary; MVP implementation always uses local fallback behavior. |

The implementation may use different filenames, but it must preserve this separation of responsibilities.

## 5. Local search and Q&A behavior

### Keyword search

1. Convert query and searchable item fields to lowercase normalized text.
2. Tokenize the query into meaningful terms.
3. Match terms against title, content, tags, type, and URL.
4. Rank title and tag matches above body-content matches.
5. Return an explicit no-results state for empty matches.

### Local smart-search

Support a small documented rule set, for example:

- `ideas about <term>` → filter to `idea`, search `<term>`.
- `links about <term>` → filter to `link`, search `<term>`.
- `tag:<term>` → filter to a tag.
- `pinned <term>` → restrict to pinned active items.

Any phrase that does not match a rule must use normal keyword search. UI copy must describe this as local smart search, not natural-language AI.

### Ask MindVault

1. Reuse normalized question tokens to rank active, non-archived items.
2. Select a small number of top matches, with a minimum relevance threshold.
3. Build a response from titles and short excerpts only; do not extrapolate facts.
4. Render source links/cards for every included item.
5. If no item meets the threshold, state that the vault does not contain relevant information yet and suggest saving more detail.

## 6. Daily insight algorithm

- Use the local calendar date as a stable seed so the same vault returns the same insight all day.
- Prefer a pair of active items sharing at least one tag or meaningful token.
- Otherwise choose an active item not updated today, favoring an older item.
- With no items, show a capture prompt; with one item, surface that item.
- Never create a relationship unless the matching shared tag/term is displayed or otherwise evident to the user.

## 7. UI, accessibility, and privacy requirements

- Use one `h1`, logical heading order, labels for all inputs, button text or accessible names, and `aria-live` feedback for form status when appropriate.
- Provide visible keyboard focus, Escape to close dialogs, Enter to submit capture where it does not conflict with multiline writing, and accessible destructive-action confirmation.
- Respect `prefers-reduced-motion`; do not use animation as the sole feedback channel.
- Do not load remote fonts, tracking scripts, or third-party assets in the MVP.
- Treat all capture text as untrusted when rendering: use safe text insertion, never raw HTML injection.
- Clearly state that data stays in the browser unless the user exports it; provide an export option before any reset if reset is implemented.

## 8. Future secure AI integration boundary

The browser must call a first-party backend endpoint, never an LLM provider directly. The future adapter contract can expose operations such as `summarize(item)`, `suggestTags(item)`, `search(query)`, and `answer(question, context)`.

Minimum backend requirements:

- Keep provider keys only in server environment variables or a secrets manager.
- Authenticate users before accessing their vault.
- Authorize every request against the requesting user.
- Validate input sizes and sanitize/log safely.
- Ground generated answers in retrieved user content and return source IDs.
- Rate-limit requests and handle provider failures without exposing secrets.
- For an optional PHP/MySQL path, use parameterized queries, password hashing, HTTPS, migrations, backups, and per-user record ownership checks.

## 9. Test plan

| Area | Checks |
| --- | --- |
| Storage | Empty initialization, save/load, refresh persistence, malformed JSON recovery, and version handling. |
| CRUD | Required fields, all four types, edit timestamps, delete confirmation, pin/archive state. |
| Search | Title/body/tag/type/URL matches, filters, ranking, rule parsing, and no-result state. |
| Insight | Empty, single-item, related-pair, unpaired-item, and same-day determinism cases. |
| Ask | Matching question sources, no-match response, archived-item exclusion, and no invented claims. |
| UX | Keyboard-only capture/edit/delete, focus management, readable errors, desktop width, and 320 px width. |

Manual checks are sufficient for the first release. Add lightweight unit tests for pure search, insight, and storage functions if a simple no-dependency test setup is introduced later.

## 10. Delivery gates

1. Foundation works without console errors on an empty vault.
2. Core vault data survives refresh and all CRUD acceptance criteria pass.
3. Search and daily insight produce predictable local results.
4. Ask MindVault shows source-based local results or an honest no-match message.
5. Final manual test plan passes in supported browsers and responsive widths.
