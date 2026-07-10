# Real Estate CRM — UI Design System

Extracted from the current frontend implementation (`frontend/src`). Tailwind CSS utility-first, no external UI library — every primitive below lives in `src/components/shared/`.

## Brand & Color

Defined in [`tailwind.config.js`](tailwind.config.js).

| Token | Hex | Usage |
|---|---|---|
| `primary` (DEFAULT / 500) | `#4F46E5` | Buttons, active nav, links, focus rings |
| `primary-50` … `primary-900` | `#EEEEFF` → `#0C085D` | Tints/shades (badges, hover backgrounds, icon chips) |
| `secondary` | `#0EA5E9` | Secondary actions (falls back to Tailwind `sky-*` scale) |
| `bg-app` | `#F8FAFC` | App background (very light slate) |
| `success` | `#10B981` (50 `#ECFDF5`, 600 `#059669`) | Success toasts/badges |
| `warning` | `#F59E0B` (50 `#FFFBEB`, 600 `#D97706`) | Warning toasts/badges |
| `danger` | `#EF4444` (50 `#FEF2F2`, 600 `#DC2626`) | Destructive actions, error states |
| `info` | `#3B82F6` (50 `#EFF6FF`, 600 `#2563EB`) | Informational toasts/badges |

Status/stage badges (`StatusBadge.jsx`) use a hand-mapped palette on top of this — emerald (success-ish), amber (warning-ish), red, blue, indigo, violet, purple, teal, sky, gray — one entry per enum value (roles, stages, statuses, payment modes, document types).

**Font:** `Inter`, falling back to `ui-sans-serif, system-ui, sans-serif` (`fontFamily.sans`).

## Motion

Tailwind `animation`/`keyframes` extensions:

| Class | Effect | Used by |
|---|---|---|
| `animate-fade-in` | opacity 0→1, 0.15s ease-out | Modal/Sidebar backdrop |
| `animate-scale-in` | opacity+scale(0.95→1), 0.15s ease-out | Modal panel, dropdown menus, Login card |
| `animate-slide-in-right` | translateX(0.5rem)+opacity, 0.15s ease-out | (available for toasts/side content) |

Drawer and the mobile Sidebar use native Tailwind `transition-transform duration-300 ease-in-out` with `translate-x-*` for slide in/out (since they stay mounted, unlike Modal).

## Layout Primitives

- **`PageLayout`** — outer wrapper for every authenticated page: `bg-app`, `p-4 sm:p-6`, content capped at `max-w-screen-xl mx-auto`.
- **`PageHeader`** — title + optional subtitle + right-aligned actions. Stacks vertically on mobile (`flex-col sm:flex-row`), title `text-xl sm:text-2xl font-semibold`.
- **`AppLayout`** — `Sidebar` (fixed `w-60` at `lg+`, off-canvas drawer below `lg`) + `Topbar` + scrollable `<main>`.

## Components

### Button (`Button.jsx`)
Variants: `primary` (indigo fill), `secondary` (sky fill), `danger` (red fill), `ghost` (transparent, gray hover), `outline` (white, gray border).
Sizes: `sm` / `md` / `lg`.
Base: `rounded-lg font-medium transition-all focus:ring-2 focus:ring-offset-2`, `active:scale-[0.98]` micro-interaction, built-in loading spinner (`Loader2`) and optional left/right icon slot.

### Card (`Card.jsx`)
`bg-white rounded-xl shadow-sm border border-gray-200`, optional `hover` prop adds `hover:shadow-md`. Supports `title` (string or node), `actions` slot (right-aligned), `footer` slot (bordered, right-aligned buttons), configurable `padding` (default `p-5`). Backs every dashboard panel, detail-page section, and standalone form card (Login, Company Settings, Profile).

### StatCard (`StatCard.jsx`)
Icon chip (12×12, tinted background per `color` prop: `primary/sky/amber/emerald/red`) + label (uppercase, xs) + value (2xl bold) + optional `sub` caption. Used across all three dashboard scopes (Platform/Company/Personal).

### Form fields (`Input.jsx`, `Select.jsx`, `Textarea.jsx`)
Shared visual language: label (+ red `*` if required) → field → red inline error text.
Field style: `rounded-lg border px-3 py-2 text-sm`, `focus:ring-2 focus:ring-primary`, error state swaps border/background to `border-red-400 bg-red-50`, disabled state `bg-gray-50 text-gray-500`.

### FormLayout (`FormLayout.jsx`)
Wraps any form: `flex flex-col gap-4` field stack + bottom action row (`Cancel` outline button + submit button with `loading` state), separated by a top border.

### Modal / Drawer / ConfirmDialog
- **Modal** — centered dialog, backdrop blur + `animate-fade-in`, panel `animate-scale-in`, sizes `sm/md/lg/xl`, header/body/scrollable-body/footer, Esc-to-close, body-scroll lock.
- **Drawer** — right/left off-canvas panel, `translate-x` transition (300ms), same Esc/scroll-lock behavior. Also the pattern the mobile Sidebar reuses.
- **ConfirmDialog** — built on Modal + Button, `danger` variant shows an amber/red warning icon, supports `loading` and inline `error`. The single pattern for every destructive/state-changing confirmation (deactivate, suspend, cancel, delete).

### DataTable (`DataTable.jsx`)
One generic table for every list view and dashboard panel: sticky `<thead>` (`sticky top-0 z-10`), zebra-free row hover (`hover:bg-primary-50` when clickable, else `hover:bg-gray-50`), column `render()` functions for custom cells, built-in `LoadingState`/`EmptyState` fallbacks, wrapped in `overflow-x-auto rounded-xl shadow-sm border`.

### StatusBadge (`StatusBadge.jsx`)
Pill (`rounded-full px-2.5 py-1 text-xs font-medium`), color resolved from a centralized enum→color map (roles, project/inquiry/booking/site-visit statuses, payment modes, document types). Single source of truth — never hand-colored inline.

### Toast (`lib/toast.js` + `sonner`)
`showSuccess / showError / showWarning / showInfo`, mounted once via `<Toaster position="top-right" richColors closeButton>` in `App.jsx`, styled to match the card language (`rounded-xl shadow-lg border`). Rule of use:
- **Toast** → transient confirmation for actions with no other feedback surface (create/update/delete success, status/stage changes, ERP sync, document upload/delete/download failures).
- **Inline field errors** (red text under a field) → validation, unchanged, never toasted.
- **Inline banner** (red box under a form) → form-level API errors, kept alongside a toast only where the action has no other visible surface (e.g. `ConfirmDialog` quick actions).

### Empty / Loading / Error states
- **EmptyState** — centered icon chip (gray-100 circle) + message + optional CTA button.
- **LoadingState** — centered spinning `Loader2` (primary color) + label.
- **ErrorState** — centered red icon chip + message + "Try Again" retry button.

### Navigation
- **Sidebar** — grouped nav (Dashboard → Inventory → CRM Workflow → Admin), active link = solid `bg-primary text-white` pill, role-filtered per item. Fixed column at `lg+`; off-canvas drawer with backdrop + Esc/route-close below `lg`.
- **Topbar** — company branding (logo/name) on the left, hamburger button (`lg:hidden`) that opens the mobile Sidebar, user menu on the right (avatar initial, name, role badge — collapses to just avatar+chevron on mobile) with an animated dropdown (`animate-scale-in`).

## Interaction Rules

1. Every destructive/state-changing action goes through `ConfirmDialog` — never a native `confirm()`.
2. Every successful mutation shows a toast; validation stays inline; forms keep working with JS disabled from a UX-affordance standpoint (labels, `required`, etc.) but rely on the app's own `validate()` functions.
3. Buttons disable + show a spinner while their action is in flight; never a second click during submission.
4. All interactive elements use `focus:ring-2 focus:ring-primary` (or role color) for keyboard accessibility.
5. Table/detail pages are read via `Card` sections rather than ad-hoc divs — one visual container style everywhere.
