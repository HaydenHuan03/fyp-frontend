# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Design source of truth: [`DESIGN.md`](./DESIGN.md).**
> Every visual decision — colors, typography, spacing, radii, elevation, component patterns — must come from `DESIGN.md`. Read it before any UI or styling work. If anything in this file appears to conflict with `DESIGN.md`, `DESIGN.md` wins. The tokens and component conventions documented below describe the *current* state of `src/index.css`; when they drift from `DESIGN.md`, treat `DESIGN.md` as the target and align the code to it (don't codify the drift here).

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Type-check (tsc -b) then bundle for production
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

There is no test runner configured in this project.

## Architecture

**FinGuardMY** — AI Assistant for Financial Crime Analysis. React 19 + TypeScript frontend built with Vite.

**Tech stack:**
- React 19 with TypeScript (strict mode)
- Vite 8 + Oxc (build/HMR)
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin) — imported but mostly unused; all styles are custom CSS
- React Router DOM — `/` (login), `/admin/dashboard`, `/dashboard` (chat)
- `lucide-react` for icons, `react-markdown` + `remark-gfm` for chat rendering
- No global state management (local `useState` only); auth via `AuthContext`

**Key structure:**
```
src/
  pages/
    LoginPage.tsx                  — login, .lg-* CSS namespace
    admin/
      AdminDashboard.tsx           — shell (.app grid + .adm-shell-body), topbar, section router
      Overview.tsx                 — stat tiles + recent alerts + system health
      UserManagement.tsx           — user table + role filter popover
      KnowledgeBase.tsx            — file upload, staging, ingest, chunk preview
      Documents.tsx                — documents grouped by uploader
      Conversations.tsx            — conversation list + Drawer detail
      Alerts.tsx                   — alert list with search/chip filters
      CaseReports.tsx              — stub (backend gap)
      BackgroundJobs.tsx           — stub (backend gap)
      AuditLog.tsx                 — stub (backend gap)
      RagAnalytics.tsx / RagEvaluation.tsx — RAG analytics & evaluation
    user/
      UserDashboard.tsx            — AI chat interface, .ch-* CSS namespace
  components/admin/
    AdminSidebar.tsx               — .side CSS classes, 3-group nav, health strip, user strip
    Drawer.tsx                     — right-side 540px overlay, Esc/scrim-to-close
    StatTile.tsx                   — stat card: label/value/delta/sparkline
    Sparkline.tsx                  — SVG 64×22 sparkline with area fill
    IngestStatusBadge.tsx          — .pill variant badges for ingest status
    UserTable.tsx                  — .t table with .who/.avatar/.pill/.row-btn
    UserModal.tsx                  — create/edit user drawer
    ConfirmModal.tsx               — generic confirm modal (adm-modal classes)
    ResetPasswordModal.tsx         — reset password modal (adm-modal classes)
  index.css                        — ALL styles (~5200 lines); never create separate CSS files
  App.css                          — unused Vite template styles
```

## Styling

**All styles live in `src/index.css`. Never create separate CSS files.** When adding styles, **append a new override block at the end** of `index.css` rather than editing existing blocks — this avoids breaking old modal/login rules.

**Before styling anything, open [`DESIGN.md`](./DESIGN.md)** and use its tokens (colors, typography scale, spacing, radii, component specs). The CSS variables in `index.css` should map to `DESIGN.md` values; if they don't, align them.

**CSS namespace map:**
| Namespace | Surface | Lines (approx) |
|-----------|---------|----------------|
| `.lg-*`   | Login page | ~31–370 + override block ~4173+ |
| `.adm-*`  | Admin modals (legacy, keep as-is) | ~400–1580 |
| `.ch-*`   | Chat (UserDashboard) | ~1588–3130 + override block ~4497+ |
| `.app .side .top .page .stats .card .pill .drawer …` | Admin shell + all admin pages | ~3139+ |

**Design tokens** — defined at `:root` (line ~3139), dark mode via `[data-theme="dark"]`. The variable *names* are stable; the *values* should match `DESIGN.md`:

```css
--bg --surface --surface-2 --surface-3      /* canvas + lifted card surfaces */
--line --line-2                             /* hairline borders */
--ink --ink-2 --ink-3 --ink-4               /* text scale, darkest → faintest */
--accent --accent-deep --accent-tint        /* reserved for AI/Fin product CTAs only */
--success / --success-tint
--danger  / --danger-tint
--warn    / --warn-tint
--font-sans                                  /* display + UI font */
--font-mono                                  /* monospace */
--r --r-2                                    /* radius base + larger */
```

**Shell layout** (both admin and chat use the same grid pattern):
```css
.app     { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
.ch-root { display: grid; grid-template-columns: 232px 1fr; height: 100dvh; }
```

**Key reusable CSS components** (visual specs live in `DESIGN.md` — the list below is just the API surface):
- `.side` — sticky 232px sidebar with right hairline
- `.side__mark` — 22×22px brand mark
- `.top` — sticky 52px topbar with bottom hairline
- `.page` — main content area (`padding: 32px 28px`)
- `.stats` — 4-column stat tile grid
- `.card` — content card (surface + line border)
- `.pill` — status badge (`pill--success | --danger | --warn | --accent | --dot`)
- `.btn` — button base (`btn--primary | --ghost | --danger | --sm`)
- `.t` — data table
- `.drawer` — right-side 540px overlay with `.drawer__scrim`
- `.toolbar` / `.search` / `.chips` / `.filter` — list-page filter row
- `.popover` — absolute-positioned dropdown panel

**Active/selected state rule:** hover = `surface-2`, active/selected = `surface-3` + `ink` text + `font-weight: 550`. Never use accent color for nav active state.

**Dark mode:** toggled by `document.documentElement.setAttribute('data-theme', 'dark')`, persisted to `localStorage` key `adm_theme`. All token-using components inherit it automatically. (`DESIGN.md` does not currently specify dark mode — the dark theme in `index.css` is an extension; keep it internally consistent but `DESIGN.md` governs the light theme.)

**Legacy modals:** `adm-modal` + `adm-modal-*` classes — keep these exactly as-is. Do not migrate modal styles to the new token system.

## API integration

Always refer to `../fyp-backend/app/modules` to understand the backend API. Open the module that corresponds to the feature you're working on before writing client code.

**Critical API contract rules — must follow every time:**
- Backend uses **snake_case** field names (`full_name`, `is_active`, `created_at`). Never invent camelCase aliases in TypeScript interfaces; mirror the backend exactly.
- Always derive TypeScript types (enums, interfaces) from the actual backend schemas (`schemas.py` / `models.py`). Do NOT infer or guess field names, role values, or status representations.
- Active/inactive state is `is_active: boolean` — never a string status like `'active' | 'suspended'`.
- User roles are `'admin' | 'user'` — never `'investigator'` or other invented values.
- Do not add frontend-only fields (`department`, `lastLoginAt`) to shared API types. If a field is not in the backend response, it does not belong in the `User` interface.
- Before calling an endpoint (e.g. `POST /users/{id}/reset-password`), verify it exists in the backend router. Do not implement calls to non-existent endpoints.
- PATCH update payload for users: `{ full_name?, role?, is_active? }` — email is not updatable via PATCH.
- All user endpoints except `/users/login` require `Authorization: Bearer <token>` and admin role.

## TypeScript & editing rules

- `tsconfig.app.json` enforces `noUnusedLocals` and `noUnusedParameters` — unused imports/variables will cause build errors.
- **Make surgical edits only.** Change only what was asked. Do NOT rewrite entire files, sections, or CSS blocks unless the task explicitly requires it. Use the Edit tool with targeted `old_string`/`new_string` pairs.
- When replacing an import block with the Edit tool, check that interface/type definitions immediately following the imports are NOT part of the selection being replaced. Interface definitions often appear right after imports with no blank-line separation — always verify the `old_string` boundary ends at the last import line, not beyond it.
- After any edit that touches the top of a file, run `npm run build` immediately to catch missing declarations before proceeding.
- `lucide-react` is installed — use it for all icons. Never write inline SVG icon components when a Lucide equivalent exists.

## Design workflow

1. **Open [`DESIGN.md`](./DESIGN.md) first.** It is the authoritative spec for colors, typography, spacing, radii, elevation, components, and do/don't rules.
2. Confirm with the user what's being built, which surface it lives on, and which `DESIGN.md` components/tokens apply — before writing code.
3. Use the tokens defined in `:root` in `src/index.css`. If a needed value isn't represented, align the variable to `DESIGN.md` rather than hard-coding a one-off.
4. Match implementation effort to the aesthetic vision in `DESIGN.md`. Restraint is the brand — favor precision, hairlines, and surface-lift over shadows, gradients, or decorative chrome.
5. Reserve the accent color for the contexts `DESIGN.md` permits (AI/Fin product CTAs). Never use it for nav active states, generic primary buttons, or backgrounds.

**Do NOT invoke any Claude "superpowers" skills** (brainstorming, writing-plans, executing-plans, frontend-design, systematic-debugging, TDD, etc.) via the Skill tool. Work directly with standard code edits and built-in tools only.
