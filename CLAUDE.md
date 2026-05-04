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
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- No routing library yet (single-page, only login implemented)
- No global state management (local `useState` only)

**Key structure:**
- `src/pages/` — page-level components (currently only `LoginPage.tsx`)
- `src/index.css` — global styles + all login page styles (`.lg-*` BEM classes, custom animations)
- `src/App.css` — Vite template styles, currently unused

**Styling approach:** Hybrid — Tailwind CSS is imported but most styles are written as custom `.lg-*` BEM classes in `index.css`. New pages should follow the same pattern (custom CSS classes in `index.css` or a co-located CSS file, prefixed with a page-specific namespace).

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

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.