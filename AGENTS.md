# AGENTS.md — Mandatory Agent Rules

**This file is binding on ALL agents operating in this repository.**  
Any agent that ignores these rules produces invalid work.

---

## 1. GitHub Open Code Review & Verification
**Source:** `coderabbitai/skills` -> `code-review`, `autofix`

Every agent MUST apply these checks before any commit lands:

- **Pre-commit diff check** — No secrets, keys, tokens, or PII in diffs. Run `git diff --cached` and scan.
- **Security audit** — No `eval`, `innerHTML` with user data, unsanitized redirects, or prototype pollution vectors.
- **Build gates** — `npm run build` (or project equivalent) exits 0 with **zero warnings**.
- **Clean commits** — Conventional commit messages (`feat:`, `fix:`, `chore:`), one logical change per commit, no "wip" or "fixup" in history.
- **Autofix first** — Run the skill's autofix before manual edits. If autofix cannot resolve, escalate with a precise reason.

---

## 2. Modern Web Quality & React Best Practices
**Source:** `vercel-labs/agent-skills` + `addyosmani/web-quality-skills`

Every agent MUST enforce these standards on every web change:

### Performance (Core Web Vitals)
- **LCP < 2.5s** — Eliminate waterfalls: preload critical CSS/fonts, inline critical CSS, defer non-critical JS.
- **INP < 200ms** — No main-thread blocking >50ms. Use `requestIdleCallback`, web workers, or `useDeferredValue`.
- **CLS < 0.1** — Reserve space for images/ads/iframes with `aspect-ratio` or explicit dimensions. No layout shifts on font load (`font-display: optional` or `fallback` with size-adjust).

### Bundle Optimization
- **Code-split by route** — Dynamic `import()` for every non-critical page/component.
- **Tree-shake aggressively** — No barrel exports that pull in unused code. Side-effect-free packages only.
- **No duplicate deps** — `npm ls` shows single version per package. Deduplicate or explain why not.

### Technical SEO
- **Canonical URLs with trailing slashes** — `<link rel="canonical" href="https://domain.com/path/">` always.
- **Meta tags on every page** — `title`, `description`, `og:*`, `twitter:*`, `robots`.
- **Structured data** — `application/ld+json` for Article, Product, Organization, BreadcrumbList.
- **Sitemap & robots.txt** — Auto-generated, served with correct content-types (`application/xml`, `text/plain`).

### Accessibility (WCAG 2.2 AA)
- **Semantic HTML** — `<main>`, `<nav>`, `<article>`, `<section>`, heading hierarchy (h1-h6, no skips).
- **Color contrast** — 4.5:1 text, 3:1 UI elements. Test with `axe-core` or equivalent.
- **Keyboard navigation** — Focus visible, tab order logical, no keyboard traps. `focus-visible` polyfill if needed.
- **ARIA only when native HTML fails** — Prefer `<button>` over `<div role="button">`.
- **Alt text** — Every `<img>` has meaningful `alt` (empty `alt=""` only for decorative).

### React Specifics (Vercel Patterns)
- **Server Components by default** — `'use client'` only for interactivity (state, effects, browser APIs).
- **No `useEffect` for data fetching** — Use Server Components, `fetch` with `next/cache`, or SWR/TanStack Query on client.
- **Suspense boundaries** — Every async boundary wrapped in `<Suspense fallback={<Skeleton />}>`. No naked promises in render.
- **Stable keys** — `key={item.id}` never `key={index}` or `key={Math.random()}`.
- **Memoization only when measured** — `React.memo`, `useMemo`, `useCallback` after profiling proves necessity.

---

## Enforcement
- **CI fails** if any rule is violated (see `.github/workflows/jev-monitor.yml`).
- **CodeRabbit review** runs on every PR — unaddressed findings block merge.
- **Jev audit** runs every 6h + on push — critical errors = failed deployment.

---

## Quick Reference: Skill Commands
```bash
# Code review (run before commit)
npx @coderabbitai/code-review

# Web quality audit
npx @addyosmani/web-quality-audit

# Performance budget check
npx @vercel-labs/vercel-optimize

# SEO validation
npx @addyosmani/seo
```