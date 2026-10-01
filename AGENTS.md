# AIMS-2026 AGENT DIRECTIVES & ARCHITECTURAL STANDARDS

> **MANDATORY POLICY FOR ALL AGENTS & AI ASSISTANTS**  
> Every agent operating in this repository is strictly required to apply, enforce, and adhere to both core skill suites established in `.agents/skills/` and tracked in `skills-lock.json`. No code shall be merged, committed, or deployed without passing these gates.

---

## 1. Core Skill Sets & Required Frameworks

All agents must leverage the 13 installed official skills across three specialized domains:

### A. GitHub Open Code Review & Security Suite (`coderabbitai/skills`)
- **`code-review`**: High-signal code quality review, diff inspection, error handling validation, architectural alignment.
- **`autofix`**: Automated resolution of lint, type, and runtime hazards prior to submission.

### B. Modern Web Quality, SEO & Accessibility Suite (`addyosmani/web-quality-skills`)
- **`accessibility`**: Strict WCAG 2.2 AA compliance, color contrast (>= 4.5:1 text, >= 3:1 UI), keyboard navigability, semantic ARIA roles.
- **`performance`**: Request waterfall elimination, non-blocking I/O, server-side caching, bundle trimming.
- **`core-web-vitals`**: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 on all patient- and doctor-facing routes.
- **`seo`**: Technical SEO enforcement, clean canonical URLs with trailing-slash normalization, dynamic XML sitemaps, open graph metadata.
- **`best-practices`**: Resilient error boundaries, defensive input validation, structured response envelopes.
- **`web-quality-audit`**: Automated audits combining performance, accessibility, SEO, and operational reliability.

### C. Vercel Architecture & Optimization Suite (`vercel-labs/agent-skills`)
- **`vercel-react-best-practices`**: React Server Components / client boundary minimization, suspense patterns, zero hydration mismatch.
- **`vercel-composition-patterns`**: Modular component composition, slot pattern architecture, separation of clinical business logic from UI rendering.
- **`vercel-optimize`**: Script optimization, dynamic image compression, route-level code splitting.
- **`web-design-guidelines`**: High-clarity clinical ergonomics, responsive layout hierarchy, mobile-friendly forms.
- **`deploy-to-vercel`**: Edge runtime compatibility, zero-downtime deployments, atomic preview builds.

---

## 2. Mandatory Agent Rules & Pre-Commit Gates

### Rule 1: Zero Secret Exposure & DevSecOps Integrity
1. **Never commit secrets**: No API keys, credentials, JWT secrets, passwords, or connection strings in code or git history.
2. **Environment Isolation**: Always use `process.env.*`. Local secrets belong strictly in `.env` (which must remain in `.gitignore`).
3. **Database Guardrails**: Never expose raw MongoDB connection strings or unhashed credentials in transcripts or commits.

### Rule 2: Pre-Commit Code Review & Static Analysis
Before any commit, every agent must perform:
1. `git diff` review: Confirm only intentional, minimal, and well-scoped changes are staged.
2. Syntax & Build Validation: Execute `npm run build` (and `node --check` across modified files). There must be **0 errors and 0 warnings**.
3. Regression Verification: Run existing test suites (`node tests/remediation_verification_suite.js`) to guarantee zero functional regressions.

### Rule 3: Clinical & Healthcare Backwards Compatibility
1. **Zero Downtime**: Production APIs must never break live clinical web or mobile clients.
2. **Dual-Casing & Response Envelopes**: Maintain backwards-compatible response fields (e.g. `Assessment` / `assessment`, `Plan` / `plan`).
3. **Audit Trail & Integrity**: Never alter clinical histories without an audit trail; avoid destructive regex or unvalidated updates.

### Rule 4: Automated Error Monitoring & Quality Gates (Jev System-1)
1. **Continuous Monitoring**: All key application routes (`/`, `/categories`, `/products`, `/contact`, `/sitemap.xml`, `/robots.txt`) are audited by Jev's System-1 model (`scripts/jev-audit.mjs`).
2. **CI/CD Build Gate**: Automated CI workflow (`.github/workflows/jev-monitor.yml`) runs on push and cron every 6 hours.
3. **Deterministic Alerting**: When severity is `medium` or `high`, alerts dispatch automatically to Resend / Webhook channels.

---

## 3. Commit Message Standards

All commits must follow Conventional Commits format:
- `feat(scope): ...` for new features or capabilities
- `fix(scope): ...` for bug fixes and patches
- `refactor(scope): ...` for architectural refactors
- `chore(scope): ...` for dependencies and configuration updates
- `test(scope): ...` for tests and verification scripts
