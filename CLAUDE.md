# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Type-check (tsc -b) then bundle for production
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

## Architecture

**FinGuardMY** — AI Assistant for Financial Crime Analysis. React 19 + TypeScript frontend built with Vite.

**Tech stack:**
- React 19 with TypeScript (strict mode)
- Vite 8 + Oxc (build/HMR)
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin) — imported but mostly unused; all styles are custom CSS
- React Router DOM — `/` (login), `/admin/dashboard`, `/dashboard` (chat)
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
    user/
      UserDashboard.tsx            — AI chat interface, .ch-* CSS namespace
  components/admin/
    AdminSidebar.tsx               — .side CSS classes, 3-group nav, health strip, user strip
    Drawer.tsx                     — right-side 540px overlay, Esc/scrim-to-close
    StatTile.tsx                   — stat card: label/value/delta/sparkline
    Sparkline.tsx                  — SVG 64×22 sparkline with area fill
    IngestStatusBadge.tsx          — .pill variant badges for ingest status
    UserTable.tsx                  — .t table with .who/.avatar/.pill/.row-btn
    UserModal.tsx                  — create/edit user modal (adm-modal classes)
    ConfirmModal.tsx               — generic confirm modal (adm-modal classes)
    ResetPasswordModal.tsx         — reset password modal (adm-modal classes)
  index.css                        — ALL styles (~5200 lines); never create separate CSS files
  App.css                          — unused Vite template styles
```

**Styling approach — token-based design system:**

All styles live in `src/index.css`. Never create separate CSS files. When adding styles, **append a new override block at the end** of `index.css` rather than editing existing blocks — this avoids breaking old modal/login rules.

**CSS namespace map:**
| Namespace | Surface | Lines (approx) |
|-----------|---------|----------------|
| `.lg-*`   | Login page | ~31–370 + override block ~4173+ |
| `.adm-*`  | Admin modals (old, keep as-is) | ~400–1580 |
| `.ch-*`   | Chat (UserDashboard) | ~1588–3130 + override block ~4497+ |
| `.app .side .top .page .stats .card .pill .drawer …` | Admin shell + all admin pages | ~3139+ |

**Design tokens** — defined at `:root` (line ~3139), dark mode via `[data-theme="dark"]`:
```css
--bg            /* page background */
--surface       /* card/panel background */
--surface-2     /* subtle fill */
--surface-3     /* active/selected fill */
--line          /* primary border */
--line-2        /* subtle border */
--ink           /* primary text + button bg */
--ink-2         /* secondary text */
--ink-3         /* tertiary/placeholder text */
--ink-4         /* faintest text */
--accent        /* indigo #4f46e5 */
--accent-deep   /* darker indigo */
--accent-tint   /* pale indigo fill */
--success / --success-tint
--danger  / --danger-tint
--warn    / --warn-tint
--font-sans     /* display + UI font */
--font-mono     /* monospace */
--r             /* border-radius base (6px) */
--r-2           /* larger radius (10px) */
```

**Shell layout** (both admin and chat use the same grid pattern):
```css
.app   { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
.ch-root { display: grid; grid-template-columns: 232px 1fr; height: 100dvh; }
```

**Key reusable CSS components:**
- `.side` — sticky sidebar (232px, `height: 100dvh`, `border-right: 1px solid var(--line)`)
- `.side__mark` — 22×22px black square brand mark, "F" in white, `border-radius: 5px`
- `.top` — sticky topbar (`height: 52px`, `border-bottom: 1px solid var(--line)`)
- `.page` — main content area (`padding: 32px 28px`, `max-width: none` when inside `.adm-shell-body`)
- `.stats` — 4-column stat tile grid
- `.card` — content card (`background: var(--surface); border: 1px solid var(--line)`)
- `.pill` — status badge (variants: `pill--success`, `pill--danger`, `pill--warn`, `pill--accent`, `pill--dot`)
- `.btn` — button base (variants: `btn--primary` ink bg, `btn--ghost` transparent, `btn--danger`, `btn--sm`)
- `.t` — data table (`border-collapse: collapse`, `th`/`td` with `--line-2` borders)
- `.drawer` — right-side 540px overlay panel with `.drawer__scrim`
- `.toolbar` — flex row with search + filters, `gap: 8px`
- `.chip` / `.filter` — filter chip buttons
- `.popover` — dropdown panel (`position: absolute`, `z-index: 20`, shadow)

**Active/selected state rule:** hover = `surface-2`, active/selected = `surface-3` + `ink` text + `font-weight: 550`. Never use accent color for nav active state.

**Dark mode:** toggled by `document.documentElement.setAttribute('data-theme', 'dark')`, persisted to `localStorage` key `adm_theme`. All token-using components get dark mode automatically.

**Modals:** legacy `adm-modal` + `adm-modal-*` classes — keep these exactly as-is. Do not migrate modal styles to the new token system.

**API integration:**  Always refer to the directory ../fyp-backend/app/modules to understand the API structure. Based on the feature you are working on, refer to the corresponding module in the backend directory to understand the API structure.

**Critical API contract rules — must follow every time:**
- Backend uses **snake_case** field names (`full_name`, `is_active`, `created_at`). Never invent camelCase aliases in TypeScript interfaces; mirror the backend exactly.
- Always derive TypeScript types (enums, interfaces) from the actual backend schemas (`schemas.py` / `models.py`). Do NOT infer or guess field names, role values, or status representations.
- Active/inactive state is `is_active: boolean` — never a string status like `'active' | 'suspended'`.
- User roles are `'admin' | 'user'` — never `'investigator'` or other invented values.
- Do not add frontend-only fields (`department`, `lastLoginAt`) to shared API types. If a field is not in the backend response, it does not belong in the `User` interface.
- Before calling an endpoint (e.g. `POST /users/{id}/reset-password`), verify it exists in the backend router. Do not implement calls to non-existent endpoints.
- PATCH update payload for users: `{ full_name?, role?, is_active? }` — email is not updatable via PATCH.
- All user endpoints except `/users/login` require `Authorization: Bearer <token>` and admin role.

**TypeScript config:** `tsconfig.app.json` enforces `noUnusedLocals` and `noUnusedParameters` — unused imports/variables will cause build errors.

**Editing rules — must follow every time:**
- **Make surgical edits only.** Change only what was asked. Do NOT rewrite entire files, sections, or CSS blocks unless the task explicitly requires it. Use the Edit tool with targeted `old_string`/`new_string` pairs.
- When replacing an import block with the Edit tool, check that interface/type definitions immediately following the imports are NOT part of the selection being replaced. Interface definitions often appear right after imports with no blank-line separation — always verify the `old_string` boundary ends at the last import line, not beyond it.
- After any edit that touches the top of a file, run `npm run build` immediately to catch missing declarations before proceeding.
- `lucide-react` is installed — use it for all icons. Never write inline SVG icon components when a Lucide equivalent exists.

# Design Thinking

**ALWAYS refer to `DESIGN.md`** in the project root before designing or styling any UI element. `DESIGN.md` is the authoritative design reference for this project — use its color palette, typography scale, spacing system, radius tokens, and component patterns as the source of truth for all visual decisions.

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**NEVER use Claude “superpowers” skills** (brainstorming, writing-plans, executing-plans, frontend-design, systematic-debugging, TDD, etc.). Do not invoke any skill via the Skill tool. Work directly with standard code edits, reasoning, and built-in tools only.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

**Always** confirm with on how the design should be look like, like what we going to build, which colour should we use, how the layout looks like, should it add in some simple animation.

**Always** refer to the DESIGN.md