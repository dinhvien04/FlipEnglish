# FlipEnglish — Spaced Repetition (SRS) & Adaptive Engines Specification

## 1. Overview & Core Invariants

FlipEnglish implements two core pedagogical engines designed for long-term retention and personalized instruction:
1. **Smart Review Spaced Repetition System (SRS)**: An adaptive scheduler based on the SuperMemo / Anki item-difficulty model with lapse recovery and streak multipliers.
2. **Adaptive Placement Test Engine**: A 4-stage, 24-question test utilizing multi-stage adaptive testing (MSAT) to estimate CEFR proficiency (A1–C2).

---

## 2. Smart Review Spaced Repetition (SRS) Engine

### 2.1 State Lifecycle & Invariants
Each tracked curriculum item transitions across three distinct states:
```
[New / Unseen] ──> [Learning] <───(Memory Lapse / Quiz Mistake)───+
                       │                                         │
                       ▼ (Good / Easy rating)                     │
                   [Review]                                      │
                       │                                         │
                       ▼ (Streak >= 4 & Interval >= 30 days)     │
                  [Mastered] ────────────────────────────────────+
```

### 2.2 Rating Growth & Interval Formulas
Review ratings yield deterministic intervals calculated in minutes:

| Rating | First Recall (Learning) | Subsequent Recall Formula (Review) | Status Transition |
| :--- | :--- | :--- | :--- |
| **Again** | `10 min` | Interval drops to `10 min`, `streak = 0`, `lapseCount++` | $\rightarrow$ `learning` |
| **Hard** | `1 day` (1,440 min) | $\text{Interval} \times 1.2$ (bounded by max 365 days) | $\rightarrow$ `learning` |
| **Good** | `3 days` (4,320 min) | $\text{Interval} \times 2.2$ (bounded by max 365 days) | $\rightarrow$ `review` |
| **Easy** | `7 days` (10,080 min) | $\text{Interval} \times 3.2$ (bounded by max 365 days) | $\rightarrow$ `review` |

- **Mastery Invariant**: An item is classified as `mastered` if and only if $\text{correctStreak} \ge 4$ **and** $\text{intervalMinutes} \ge 43,200\text{ min (30 days)}$.
- **Maximum Cap**: Interval growth is strictly capped at `525,600 min` (365 days).
- **Quiz Mistake Signals**: Any incorrect answer during a lesson exercise or practice quiz immediately emits a mistake signal (`recordMistakeSignal`), resetting the item's interval to 10 minutes and placing it into the learning queue.

### 2.3 Session Resumption & Stale Snapshot Reconciliation
To guarantee the rule **"One User Rating = One SRS Mutation"**, session resumption follows strict reconciliation rules (`normalizeReviewResumeContext`):
1. **Snapshot Timestamp Verification**: When restoring an in-progress review session from storage, the engine compares the snapshot timestamp against canonical item records in `ReviewStorage`.
2. **Backfilling & Index Advancement**: If an item in the queue was rated after snapshot creation, `currentIndex` advances automatically, and the corresponding `ratingBreakdown` is backfilled.
3. **Ghost Prevention**: If all items in a snapshot were rated in canonical storage, the active review session resolves to `null` to prevent duplicate study cycles.

---

## 3. Adaptive Placement Engine (4-Stage MSAT)

### 3.1 Adaptive Routing & Stage Structure
The placement test evaluates learners across 4 adaptive stages with 6 questions per stage (24 questions total):
```
Stage 0 (Entry): Level B1 (6 questions)
   │
   ├── Score >= 5/6 ──> Route UP to Level B2
   ├── Score 3-4/6  ──> STAY at Level B1
   └── Score <= 2/6 ──> Route DOWN to Level A2
        │
Stage 1: Adaptive Level (6 questions)
   │  ... (Dynamic UP / STAY / DOWN routing)
Stage 2: Adaptive Level (6 questions)
   │  ... (Dynamic UP / STAY / DOWN routing)
Stage 3: Adaptive Level (6 questions)
   │
   ▼
[Scoring & CEFR Level Estimation (A1–C2)]
```

### 3.2 Weighted Difficulty Scoring
Skill scores (Vocabulary, Use of English, Reading, Listening) utilize difficulty-weighted accuracy:
$$\text{Weighted Score} = \frac{\sum (\text{Correct}_i \times \text{Weight}(\text{Level}_i))}{\sum \text{Weight}(\text{Level}_i)}$$
Where weights are assigned as: $\text{A1}=1.0$, $\text{A2}=1.2$, $\text{B1}=1.5$, $\text{B2}=1.8$, $\text{C1}=2.2$, $\text{C2}=2.5$.

### 3.3 Placement to Smart Review Export
When a learner finishes a placement test, missed curriculum items can be exported to Smart Review:
- **Canonical Storage**: Recorded directly in `ReviewStorage.exportedReportIds`.
- **Idempotency**: Exporting the same placement report multiple times guarantees zero duplicate items or multiple lapse penalties.
- **Legacy Migration**: Automatically migrates legacy keys (`flipenglish_placement_review_exports_v1`) upon read and safely purges the legacy key after verified write.
