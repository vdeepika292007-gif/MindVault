# MindVault — Copy-Paste Implementation Prompt

Build **MindVault**, a beginner-friendly, minimal-premium personal knowledge vault (an AI second brain). Do not use frameworks, build tools, databases, authentication, or a live AI API in the first release.

## Goal

Turn a user's quick, messy captures into information they can save, browse, search, and rediscover. The application must work entirely in a browser using **HTML, CSS, vanilla JavaScript, and `localStorage`**.

## Core product

- Users can create, edit, delete, pin, and archive notes.
- A capture may be a **Note**, **Idea**, **Link**, or **Snippet**.
- Each item has a title, body/content, type, tags, created/updated timestamps, and optional URL.
- Provide keyword search plus a natural-language-style search input. In this first release, interpret phrases locally with simple rules (for example, "ideas about travel" filters to the `Idea` type and `travel`); clearly label this as local smart search, not AI.
- Provide a dashboard with note counts, recent captures, pinned items, tags, and one daily insight.
- Generate the daily insight locally from saved content: show a useful old item, a related pair sharing a tag/keyword, or a friendly empty-state suggestion.
- Include an **Ask MindVault** panel. In this first release, answer only from matching saved notes using transparent local retrieval and show the source note titles. Never pretend an answer came from an AI model.
- Include an **AI-ready** section explaining that real summaries, automatic tags, semantic search, and question answering will be added later through a secure server-side backend. Do not expose API keys in browser code.

## UI and experience

- Aim for a quiet, polished, premium feel: warm off-white background, dark ink text, one restrained accent color, generous spacing, subtle borders/shadows, and no visual clutter.
- Make the layout responsive: useful on desktop and comfortable on a narrow mobile screen.
- Prioritize keyboard-friendly capture and accessible controls: semantic HTML, explicit labels, visible focus states, logical tab order, and readable contrast.
- Use a clean dashboard shell with a compact sidebar or top navigation, a prominent quick-capture action, and clear empty states.
- Use no copied branded UI, assets, or third-party UI libraries.

## Build phases

1. **Foundation:** Create a single-page app structure, responsive styling, and a seeded empty-state experience. Define a stable data model and `localStorage` repository helper.
2. **Capture and library:** Implement create, validation, list/grid display, detail view, edit, delete with confirmation, pin/archive, tags, type filters, sorting, and persistent storage.
3. **Find and rediscover:** Implement keyword search, local smart-search parsing, tag filtering, dashboard summaries, and deterministic daily insight.
4. **Ask MindVault:** Implement local retrieval-based answers with clear no-match behavior and citations to matching note cards.
5. **Quality pass:** Check persistence after refresh, keyboard navigation, mobile layout, empty states, destructive-action confirmation, error messages, and data reset/export safeguards.

## Constraints and engineering expectations

- Keep the code beginner-readable and organized by responsibility; use clear function and variable names.
- Store data under a versioned `localStorage` key and validate/normalize loaded data to avoid crashes from malformed storage.
- Do not add an AI SDK, API key, server, PHP, or MySQL in this version. Instead, isolate future AI calls behind a clearly named adapter/interface and provide a local fallback implementation.
- Do not claim local heuristics are real AI. Button labels and help text must set accurate expectations.
- Avoid overengineering. Favor small pure utility functions and event-driven DOM updates over complex architecture.

## Test checklist before handoff

- Create one item of every type and confirm it remains after a refresh.
- Edit, pin, archive, and delete an item; confirm every state is reflected in the library and dashboard.
- Search by title, body, tag, type, and a phrase such as "ideas about travel".
- Confirm the daily insight is deterministic for the current date and changes appropriately when the vault has no items, one item, or related items.
- Ask a question with matching and non-matching terms; ensure results cite saved notes and never invent facts.
- Test at desktop and narrow mobile widths, including keyboard-only operation.

## Future upgrade path (document only; do not implement)

Add a backend (for example, PHP with MySQL, or another server-side service) that keeps LLM credentials secret, authenticates users, persists encrypted data, generates summaries/tags, creates embeddings for semantic search, and performs retrieval-grounded Q&A. The frontend should call this backend rather than any AI provider directly.

Deliver a working browser-only MVP consistent with `PRD.md` and `TRD.md`. Do not create `DESIGN.md` or any other planning documents.
