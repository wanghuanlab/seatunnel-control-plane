# Design QA — Control Plane workspace

## Comparison target

- Source visual truth: `/Users/wanghuan/.codex/generated_images/01a0663f-85b2-7823-a872-dd9d273a6cf0/exec-f83c8276-2ece-48cf-89d2-906975146ee4.png`
- Source pixels: 1440 × 1024.
- Implementation: browser-rendered `http://127.0.0.1:5174/` in Chrome (authenticated administrator session); captured through the desktop browser verification session after the visual changes.
- Implementation comparison viewport: 1440 × 1024 CSS px, device density 1×. The browser viewport override was reset after verification.
- State: SeaTunnel 2.3.13 connected; 1 Worker; 1 enabled scheduled task; no running or Pending jobs. This differs intentionally from the busy mock state and verifies the real empty-state path.

## Evidence and comparison history

### Pass 1 — 1440 × 1024 desktop

The source and rendered implementation were opened and visually compared at the same desktop viewport. Both use a dark, slim navigation rail; a top command/action area; a compact operational status strip; and a central, lane-based workstream rather than a generic metric-card dashboard.

The implementation uses actual `/overview`, `/running-jobs`, `/pending-jobs`, task schedules, Worker data, and system-monitoring values. Empty run and queue lanes are deliberately quiet, explanatory states instead of fabricated mock jobs. The selected design's idea of a live emphasized run is represented by an animated live marker when the real running-job response has entries.

**Findings**

- No actionable P0, P1, or P2 visual mismatches.
- [P3] The source has a denser busy-workflow scenario, while the verified environment was idle.
  - Location: workstream lanes.
  - Evidence: the selected mock contains active and Pending job nodes; the connected cluster returned zero for both states.
  - Impact: the populated presentation remains runtime-dependent rather than directly testable in this environment.
  - Follow-up: repeat a short visual capture while a real running/Pending job exists.

### Pass 2 — 390 × 844 responsive check

The rendered implementation was captured at a mobile-width browser viewport. Navigation wraps into an accessible operation grid; the status strip becomes a two-column stack with a full-width submit action; workstream lanes remain readable; and persistent navigation or submit controls are not clipped.

**Findings**

- No P0/P1/P2 responsive overflow or control-access issues observed.

## Required fidelity surfaces

| Surface | Review result |
| --- | --- |
| Fonts and typography | Dense operational hierarchy is preserved: compact mono values/labels, larger workspace heading, legible Chinese system sans fallback, consistent status sizing and truncation. |
| Spacing and layout rhythm | The 1440px screen uses a 236px navigation rail, a thin top command bar, spaced operational bands, aligned lane labels, and paired data surfaces. Mobile collapses deliberately rather than shrinking desktop columns. |
| Colors and tokens | Deep navy/ink base, cyan runtime signal, blue primary action, teal healthy state, violet pending state, amber warning and red failure tokens are consistently applied through shared tokens. |
| Image and asset fidelity | The selected mock contains no required photographic/raster content. Product icons are supplied by `@phosphor-icons/react`, not custom inline SVG or CSS-drawn icons. The SeaTunnel mark is represented as a neutral runtime pulse rather than borrowing a third-party logo asset. |
| Copy and content | Product copy has been localized to operational decisions and all surface values come from current API responses; empty states explain the next meaningful action. |

## Interaction checks

- Global command trigger opens a quick-action menu with submit, new task, and Pending diagnostic destinations.
- Sidebar navigation closes the quick-action menu after route changes.
- Worker Tag filter, auto-refresh toggle, refresh action, primary submit actions, task links, and existing form/table routes remain visible and reachable.
- A prior Vite HMR console message referenced the temporary `Activity` import while the icon package was being wired in. It was corrected to `Pulse`, production build passed, and the page reloaded/rendered successfully afterward; no current render failure is present.

## Implementation checklist

- [x] Replace generic navigation with a grouped operations rail and icon system.
- [x] Add command/action surface and connection feedback.
- [x] Rebuild the dashboard around actual task, job, queue, Worker, and monitoring API responses.
- [x] Add loading, empty, connected, active, pending, focused, hover, keyboard-focus, and reduced-motion states.
- [x] Apply the visual system to existing tables, forms, panels, badges, and responsive breakpoints.
- [x] Verify desktop and mobile browser rendering.

## Follow-up polish

- Capture populated run and Pending lanes when the target cluster has live work.
- Consider a self-hosted Chinese-capable UI font if deployment requirements permit adding a font asset.

final result: passed
