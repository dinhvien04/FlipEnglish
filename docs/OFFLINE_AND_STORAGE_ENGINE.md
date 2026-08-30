# FlipEnglish — Offline-First Persistence & Storage Architecture

## 1. Storage Philosophy & Invariants

FlipEnglish is engineered as a **Local-First & Offline-Honest** progressive web application. Learning progress, spaced repetition intervals, exam records, placement diagnostics, user wordbooks, and dictionary lookups must function seamlessly without network connectivity.

### 1.1 Core Non-Negotiable Invariants
1. **Zero `localStorage.clear()`**: Never invoke `localStorage.clear()`. Scoped deletion functions must target only application-owned keys.
2. **Quota & Security Error Resilience**: All writes and reads wrap within safe primitives (`safeSetLocalStorage`, `safeGetLocalStorage`, `safeRemoveLocalStorage`) that handle `QuotaExceededError` and `SecurityError` (private mode / sandboxed iframes) without throwing unhandled runtime exceptions.
3. **Atomic Mutations & Tombstones**: Sessions utilize tombstones and state machines to ensure that storage write failures or interrupted teardowns never resurrect stale or completed sessions.
4. **Structured Schema Validation**: All data read from `localStorage` is treated as untrusted and passed through strict schema parsers.

---

## 2. Storage Partitioning & Keys Map

| Key | Storage Engine | Scope / Ownership | Invariant & Retention |
| :--- | :--- | :--- | :--- |
| `flipenglish_review_v1` | LocalStorage | Smart Review SRS data | Contains tracked items, logs ($\le 500$), exported placement IDs ($\le 50$). |
| `flipenglish_review_session_v1` | LocalStorage | Active Review session snapshot | Ephemeral session state. Overwritten by tombstone on complete. |
| `flipenglish_placement_active_v1` | LocalStorage | Active Placement test state | Ephemeral 4-stage active session. |
| `flipenglish_placement_history_v1` | LocalStorage | Placement test history | Retains compact records (max 5 items). |
| `flipenglish_placement_latest_report_v1` | LocalStorage | Most recent placement result | Stores full diagnostic report for review. |
| `flipenglish_today_plan_v1` | LocalStorage | Daily Study Plan | Deterministic daily plan tied to local calendar date (`YYYY-MM-DD`). |
| `flipenglish_study_plan_settings_v1` | LocalStorage | Study plan configuration | Daily goal minutes (5, 10, 15, 20, 30 min). |
| `flipenglish_streak_v1` | LocalStorage | Streak & Meaningful Days | Watermark calendar date tracking with rollback protection. |
| `flipenglish_active_time_v1` | LocalStorage | Active Study Time | Second-accurate study timer with idle debounce. |
| `flipenglish_reminders_v1` | LocalStorage | Study notification preferences | Daily reminder time and notification permission state. |
| `flipenglish_onboarding_v1` | LocalStorage | Onboarding state | Completed step records for initial user setup. |
| `FlipEnglishDictionary` | IndexedDB | Offline Dictionary & Wordbook | `entries` (12,000+ words snapshot), `savedWords` (user wordbook), `metadata`. |

---

## 3. Storage Health Tracker & Safety Primitives

### 3.1 Non-Invasive Probing & Health State
The `storageHealth` utility tracks read, write, and removal failures across localStorage operations without writing artificial probe keys that consume user storage:
- **`isQuotaDegraded`**: Triggered when a write operation raises `QuotaExceededError`.
- **`isAccessBlocked`**: Triggered when browser security blocks access (`SecurityError`).
- **`storageHealthListeners`**: Dispatches `flipenglish_storage_health` events to notify the UI to render non-intrusive warning banners and retry actions.

### 3.2 Safe Scoped Deletions (`dataManagement.ts`)
Three distinct reset scopes ensure granular control without data cross-contamination:
1. **Reset Learning Progress (`resetLearningProgress`)**: Clears curriculum progress, SRS reviews, placement history, exam scores, and study plans while preserving saved vocabulary wordbook and user settings.
2. **Clear Saved Vocabulary (`clearSavedVocabulary`)**: Clears the IndexedDB saved wordbook and recent search history while preserving all learning progress.
3. **Factory Reset (`eraseAllFlipEnglishData`)**: Clears all application keys across LocalStorage and IndexedDB stores while preserving third-party domain storage.
