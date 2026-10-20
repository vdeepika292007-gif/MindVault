# MindVault — Product Requirements Document

## 1. Product summary

MindVault is a personal knowledge vault for quickly saving notes, ideas, links, and snippets, then finding and rediscovering them later. The first release is a browser-only MVP that feels like an AI second brain while accurately using local, rule-based features until a secure AI backend is added.

## 2. Problem and opportunity

Useful thoughts often end up scattered across notebooks, browser tabs, and chat windows. People need a low-friction place to capture information, organize it lightly, and return to it with confidence. MindVault makes captured information feel useful again through fast recall and a daily rediscovery moment.

## 3. Target user

An individual learner, creator, or early-career professional who wants a simple personal system for collecting thoughts and references without learning a complex productivity tool.

## 4. Product goals

- Make a new capture take under one minute.
- Preserve each user's vault locally after browser refresh.
- Make saved information easy to browse and locate with search, filters, and tags.
- Surface one helpful daily insight from existing content.
- Establish an honest, safe foundation for future AI-powered organization and Q&A.

## 5. Non-goals for MVP

- User accounts, sign-in, syncing, sharing, collaboration, or multi-device use.
- Real LLM calls, embeddings, semantic/vector search, or automatic AI-generated output.
- Server-side storage, PHP, MySQL, payment, analytics, browser extensions, or file uploads.
- Claiming that local rules are AI.

## 6. Functional requirements

### 6.1 Capture management

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-01 | Create a capture | User can save a title, content, type, and zero or more tags. A link may include a URL. Required-field errors are clear. |
| FR-02 | Support four types | User can select Note, Idea, Link, or Snippet; the selected type is visible in lists and detail view. |
| FR-03 | Edit a capture | User can update allowed fields and sees the updated result without losing other data. |
| FR-04 | Delete a capture | User must confirm deletion; confirmed deletion removes the item from all views. |
| FR-05 | Pin and archive | User can pin/unpin and archive/unarchive items; archived items do not appear in the default active library. |
| FR-06 | Persist data | Items and their state remain after a page refresh in the same browser profile. |

### 6.2 Browse and find

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-07 | Library view | User can view active items with title, excerpt, type, tags, and updated date. |
| FR-08 | Filters and sorting | User can filter by type, tag, and archived status and sort predictably by newest, oldest, or recently updated. |
| FR-09 | Keyword search | Search matches normalized title, content, tags, type, and URL where applicable. |
| FR-10 | Local smart search | Plain phrases such as “ideas about travel” apply simple transparent local parsing. Unrecognized wording gracefully falls back to keyword search. |

### 6.3 Dashboard and rediscovery

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-11 | Dashboard overview | Dashboard shows total active items, type or tag summary, recent items, and pinned items. |
| FR-12 | Daily insight | Dashboard displays one deterministic insight per calendar day: an old capture, a related pair, or an empty-state prompt. It never fabricates user content. |

### 6.4 Ask MindVault

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-13 | Local answers | A question retrieves relevant saved content using local text matching and presents a concise response based solely on matches. |
| FR-14 | Source transparency | Every result identifies its source note titles; no-match results clearly say that no relevant saved information was found. |
| FR-15 | Honest AI boundary | UI calls the MVP capability local retrieval/smart search and explains that live AI is planned for a later secure backend. |

## 7. User stories

- As a user, I want to save a thought immediately so I do not lose it.
- As a user, I want to label a capture by type and tags so my vault stays understandable.
- As a user, I want to search with normal words so I can find something without remembering exact phrasing.
- As a user, I want to see a daily connection or resurfaced item so old ideas remain valuable.
- As a user, I want answers tied to my saved content so I can trust where they came from.
- As a user, I want clear privacy boundaries so I know that no secret key or external AI service is silently used.

## 8. Experience requirements

- Minimal, premium, calm visual tone with intentionally limited color and decoration.
- Responsive layout for desktop and mobile.
- Clear primary action for adding a capture.
- Semantic, keyboard-accessible controls, visible focus treatment, descriptive labels, and readable contrast.
- Useful empty, loading-free, validation, no-search-result, and no-answer states.

## 9. Release plan and success criteria

| Phase | Scope | Done when |
| --- | --- | --- |
| 1 | Foundation | App shell, stable local data model, storage initialization, and responsive baseline work. |
| 2 | Core vault | Full capture CRUD, tags, type, pin/archive, and persistence work. |
| 3 | Discovery | Library search, filters, sorting, dashboard, and daily insight work. |
| 4 | Local Q&A | Retrieval answers include sources and no-match behavior. |
| 5 | Quality | Manual acceptance checks pass at desktop and mobile sizes. |

MVP succeeds when a new user can create and later recover a saved item, understand every automated result, and refresh without losing their vault.

## 10. Future AI product direction

When a secure backend exists, MindVault may add LLM summaries, suggested tags, semantic search, and retrieval-grounded answers. The backend must own provider credentials; the browser must never contain them. An optional PHP/MySQL implementation may support accounts and durable cloud storage, but it is outside the MVP.
