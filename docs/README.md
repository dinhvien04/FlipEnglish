# FlipEnglish Documentation Index

Welcome to the technical documentation for **FlipEnglish** — a modern, local-first progressive web application for English vocabulary mastery, spaced repetition review, adaptive placement testing, and AI-assisted conversational practice.

---

## Documentation Directory

| Document | Description |
| :--- | :--- |
| **[System Architecture](ARCHITECTURE.md)** | High-level architectural overview, frontend state-based routing, technology stack, and server runtime boundaries. |
| **[SRS & Adaptive Engines Specification](SRS_AND_ADAPTIVE_ENGINES.md)** | Spaced repetition interval formulas, rating growth, snapshot reconciliation, and 4-stage adaptive placement scoring. |
| **[Offline-First Persistence & Storage](OFFLINE_AND_STORAGE_ENGINE.md)** | Local-first storage philosophy, partitioned storage keys map, storage health tracking, safe deletion primitives, and zero `localStorage.clear()` invariants. |
| **[Backend API Reference](API_REFERENCE.md)** | Specification of backend REST endpoints, rate limiting, request validation schemas, and AI gating contracts. |
| **[Security Policy](SECURITY.md)** | Secrets isolation, prompt injection defenses, binary magic byte verification, CSP, and rate limiting rules. |
| **[Deployment & Production Hardening](DEPLOYMENT_SECURITY.md)** | Google Cloud Run container specifications, reverse proxy handling, runtime environment variables, and operational checks. |
| **[Validation & Testing Guide](VALIDATION_AND_TESTING.md)** | Comprehensive guide to the 14+ automated validation suites and regression tests. |
| **[Performance QA Report](PERFORMANCE_QA_REPORT.md)** | Bundle size accounting, chunk splitting analysis, Core Web Vitals (LCP, CLS, TBT), and mobile UX forensics. |
