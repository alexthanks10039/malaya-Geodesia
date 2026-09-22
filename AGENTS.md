# AI Project Guide

## Goal
This repository is **Малая геодезия**, a practical geodesy knowledge/service site. Prioritize useful geospatial workflows, calculator conversion, technology selection and clear UX over generic AI features.

## Stack
- Next.js 16 App Router
- React 19
- TypeScript 5.9
- CSS
- Three.js + Motion + lucide-react
- Node.js >= 20
- Prisma schema is present for future/persistent data work

## Repository map
- `app/page.tsx`: homepage composition
- `app/layout.tsx`: root layout/global CSS
- `app/globals.css`: global layout and responsive styles
- `app/product-polish.css`: calculator/product responsive polish
- `app/*`: route pages (calculator, services, technologies, knowledge, cases, partners, contacts)
- `app/api/leads/route.ts`: calculator lead endpoint
- `components/calculator.tsx`: 4-step calculator UI
- `components/geo-scan-scene.tsx`: Three.js visual scene
- `components/geospatial-index.tsx`: geospatial index/animation
- `components/hero.tsx`: homepage hero
- `components/theme-toggle.tsx`: persistent theme switch
- `lib/calculator.ts`: calculator pricing/estimate logic
- `lib/data.ts`: product/knowledge data
- `prisma/schema.prisma`: database schema
- `.github/workflows/`: CI/preview workflows

## Working rules for AI agents
1. Inspect only the files relevant to the requested change. Do not scan the whole repository unnecessarily.
2. Prefer small, focused changes. Preserve existing visual language and architecture.
3. Before changing behavior, inspect the current implementation and its types.
4. Never invent APIs, environment variables, database fields, prices, or deployment status.
5. Keep TypeScript strict and avoid `any`. Use `unknown` plus narrowing when input is untrusted.
6. For client components, avoid unnecessary re-renders and heavy browser work. Three.js code must clean up scenes, renderers, animation frames and event listeners.
7. Keep responsive behavior working at desktop, tablet and narrow mobile widths.
8. Respect `prefers-reduced-motion`.
9. Do not add a dependency when the existing stack can solve the task.
10. For CSS changes, check for existing duplicate rules before adding more overrides.
11. Treat calculator prices as preliminary product logic, not verified market prices.
12. The lead API currently returns a synthetic lead ID and does not constitute durable lead storage unless persistence is explicitly implemented.

## Verification
Run:
- `npm install`
- `npm run lint` (this is TypeScript `tsc --noEmit`)
- `npm run build`

If a check fails, fix the actual reported error before doing unrelated refactors.

## Product roadmap
1. Calculator polish and reliable lead conversion
2. Interactive map
3. Site selection/geospatial binding
4. PostGIS
5. Technology-selection wizard
6. Technology comparison
7. Three.js/3D expansion
8. AI/pgvector after the core commercial/geospatial flow is solid

## Current visual direction
Technical/geospatial, restrained, dark/acid accents, high information density, responsive. The homepage uses animated geospatial visuals. Avoid planets or decorative space imagery unrelated to surveying.
