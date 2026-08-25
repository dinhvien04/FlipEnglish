# Frontend Architecture & UI/UX Guidelines

## 1. UI Principles & Visual Design

- **EdTech Professionalism**: Maintain a clean, calm, modern, and trustworthy aesthetic suited for language learners.
- **No Decorative Emojis**: Do not use emojis as icons or decorative embellishments in buttons, headers, navigation chips, or cards. Use clean text labels, CEFR level badges (A1–C2), or purposeful SVGs.
- **Semantic Color Tokens**: Rely on Tailwind CSS v4 palette (slate/indigo/emerald/rose/amber/sky) consistently for states (success, error, warning, informational).
- **Typography & Hierarchy**: Clear distinction between Vietnamese translations, English prompts, IPA transcriptions, and contextual examples.

## 2. Responsive & Layout Rules

- **Mobile & Tablet First**: Design screens for smartphone viewport widths (~360px–430px) and tablet/iPad widths (~768px–1024px) before wide desktop.
- **Accessible Touch Targets**: All interactive elements (buttons, option cards, chips, pagination controls) must meet minimum touch target dimensions (~44px to 48px height/width).
- **No Global Overflow Hacks**: Do not apply `overflow-x: hidden` or `width: 100vw` hacks on `html`, `body`, or `#root`. Fix underlying horizontal overflow at the component level using `w-full`, `max-w-*`, `overflow-x-auto` on scrollable containers, or `break-words`.
- **Safe Area Insets**: Support devices with notches/home bars using Tailwind classes and `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`.

## 3. Component Architecture & State

- **State-Driven Routing**: Navigation is managed via state transitions in `src/App.tsx` (`currentView`, `selectedLesson`, `examConfig`, etc.). Keep routing transitions predictable and preserve state in `localStorage` when appropriate.
- **Safe Image Fallbacks**: Use `SafeImage.tsx` for remote images. Remote images must not collapse layouts when uncached offline; render a clean text fallback (`"Visual unavailable offline"`) and auto-retry on reconnection.
- **Keyboard Navigation**: Support accessible keyboard shortcuts where applicable (e.g. Spacebar to flip flashcards, Arrow keys to navigate, number keys 1–4 for multiple choice).
- **Speech Playback**: Web Speech API audio playback should provide fallback states gracefully when local voices are missing.
