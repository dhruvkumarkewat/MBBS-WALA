# MBBSWALA — Production Implementation Roadmap

> Premium NEET / MBBS counselling platform  
> Stack: **Vite · React 19 · TypeScript · Tailwind v4 · Supabase · Vercel Serverless**  
> Quality bar: production product ≈ **$10k agency deliverable**

**Doc status:** Aligned to current repo (marketing site + UI kit + auth/dashboard APIs present).  
**Last reviewed against tree:** `src/components/ui/*`, `src/pages/dashboard/*`, `api/*`.

---

## 0. Current State Snapshot

### Already in place
| Area | Status |
|------|--------|
| Marketing pages (Home, Packages, Colleges, Cutoffs, Seat Matrix, Blogs, Contact…) | ✅ |
| Design system primitives (`Button`, `Input`, `Card`, `Table`, `Modal`…) | ✅ Partial |
| Auth context + Google helper + ProtectedRoute | ✅ |
| Dashboard shell + APIs (profile, applications, documents, saved, notifications) | ✅ Early |
| Supabase data (packages, colleges, cutoffs, seat_matrix, inquiries…) | ✅ Seeded |
| `src/lib/api.ts`, contexts (Theme, Toast, Dashboard) | ✅ |

### Biggest gaps to “production $10k”
1. **Hardening** — validation, rate limits, consistent errors, RLS  
2. **Perf** — image weight, route split, LCP  
3. **QA** — automated tests, a11y audit  
4. **SEO / launch ops** — sitemap, OG, analytics, domain  
5. **Dashboard product completeness** — real end-to-end student flows  
6. **Brand purity** — ensure zero legacy third-party branding in copy/assets  
7. **Data ops** — cutoff/seat matrix vintage labels + update process  

---

## 1. Target Folder Structure

```
/
├── api/
│   ├── db-client.js              # KEEP (service role + wake)
│   ├── db-wake.js                # KEEP
│   ├── _auth.js                  # token verify (exists)
│   ├── _lib/                     # ADD: cors, validate, rateLimit, respond
│   │   ├── cors.js
│   │   ├── respond.js
│   │   ├── validate.js
│   │   └── rateLimit.js
│   ├── health.js                 # ADD
│   ├── packages.js
│   ├── colleges.js
│   ├── cutoffs.js
│   ├── seat-matrix.js
│   ├── choices.js
│   ├── rank-calculator.js
│   ├── inquiries.js
│   ├── blogs.js / faqs.js / stats.js / features.js / testimonials.js / careers.js
│   ├── profile.js / applications.js / documents.js / saved.js / notifications.js
│   └── dashboard-summary.js
│
├── public/
│   ├── favicon.svg / favicon.png / apple-touch-icon.png
│   ├── logo.png
│   ├── robots.txt                # ADD
│   ├── sitemap.xml               # ADD or generate
│   ├── og-image.png              # ADD
│   ├── images/mbbswala/          # marketing imagery only
│   └── uploads/                  # user content if needed
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # routes only
│   ├── index.css                 # tokens
│   ├── components/
│   │   ├── ui/                   # primitives (exists — complete & document)
│   │   ├── layout/               # MOVE: Navbar, Footer, Layout, FloatingDock
│   │   ├── marketing/            # MOVE: Hero, Stats, Features, CTA…
│   │   ├── counselling/          # MOVE: ChoiceFinder, tools
│   │   └── dashboard/            # exists
│   ├── pages/
│   │   ├── marketing…            # public site
│   │   └── dashboard/            # authenticated app
│   ├── contexts/                 # Auth, Theme, Toast, Dashboard
│   ├── hooks/                    # ADD: useApiQuery, useColleges, useDebouncedValue…
│   ├── stores/                   # ADD only if needed (shortlist, UI)
│   ├── lib/                      # api.ts, supabase, cn, motion, googleAuth
│   ├── types/                    # ADD shared DTO types
│   └── test/                     # ADD
│
├── e2e/                          # ADD Playwright
├── docs/
│   └── PRODUCTION_ROADMAP.md
├── vercel.json
└── package.json
```

### Layer rules
| Layer | Allowed | Forbidden |
|-------|---------|-----------|
| `pages/` | Compose features, route params | Raw business formulas, secrets |
| `components/ui` | Visual primitives | Fetching |
| `hooks/` | Data + UX state | Huge JSX trees |
| `api/` | DB, auth, validation | Browser-only APIs |
| `lib/api.ts` | Typed fetch | Service role key |

---

## 2. Development Order

Ship **vertical slices**, but stabilize foundations first.

```
P0 Foundations & brand freeze
    →
P1 API contracts + DB indexes + health
    →
P2 Public data tools polish (colleges / cutoffs / seat matrix)
    →
P3 Marketing conversion (home, contact, CTAs)
    →
P4 Counselling calculators accuracy UX
    →
P5 Auth + dashboard MVP completeness
    →
P6 SEO + performance
    →
P7 A11y + automated tests
    →
P8 Launch hardening
    →
P9 Post-launch growth (compare, payments, CRM)
```

### Detailed build sequence

1. **Brand freeze** — audit strings/assets; only MBBSWALA  
2. **API `_lib`** — shared CORS, `ok/err` helpers, zod validation  
3. **`GET /api/health`** — deploy probes  
4. **DB indexes + unique slugs** — packages, blogs, colleges filters  
5. **Unify data pages** on `lib/api.ts` + Skeleton/EmptyState/Alert  
6. **Contact funnel** — rate limit, honeypot, thank-you state, WhatsApp fallback  
7. **Homepage perf** — compress images, lazy below-fold, hero priority  
8. **Calculators** — edge-case copy, “indicative” disclaimers, vintage labels  
9. **Auth flows** — email + Google; protected dashboard routes verified  
10. **Dashboard MVP** — profile, saved colleges, applications list, notifications read  
11. **SEO pack** — meta per route, sitemap, robots, OG  
12. **A11y pass** — focus, accordion, forms, contrast  
13. **Playwright smoke + Vitest pure logic**  
14. **Security headers + env audit**  
15. **Production domain cutover + analytics**  
16. **Runbook** — how to update cutoffs/seat matrix each round  

---

## 3. Priority List (MoSCoW)

### P0 — Must (launch)
- [ ] Zero legacy third-party branding in UI  
- [ ] All public tools load from Supabase with loading/error/empty  
- [ ] Inquiry POST validated + stored + friendly errors  
- [ ] Mobile-perfect navbar/footer/tools (375px)  
- [ ] Auth login/signup works; protected dashboard not publicly writable without token  
- [ ] `npm run build` clean; Vercel prod deploy  
- [ ] Correct business contacts: `+91 78801 19983`, `info@mbbswala.in`  
- [ ] Legal pages accurate under MBBSWALA  
- [ ] Data vintage shown on cutoffs & seat matrix  

### P1 — Should
- [ ] Rate limit inquiries + calculators  
- [ ] Image pipeline (WebP, &lt;200KB heroes where possible)  
- [ ] Route-level code splitting  
- [ ] Sitemap + robots + OG image  
- [ ] Dashboard: save college, view saved, basic application status  
- [ ] Toast system used consistently for mutations  
- [ ] 404 page  
- [ ] Lighthouse mobile Performance ≥ 85 (stretch 90)  

### P2 — Nice
- [ ] College detail page + related cutoffs  
- [ ] College compare (2–3)  
- [ ] Shortlist persistence (user RLS)  
- [ ] Document upload to Supabase Storage  
- [ ] Blog MDX/admin  
- [ ] Hindi locale  
- [ ] CSV export cutoffs/seats  

### P3 — Later
- [ ] Payments for packages  
- [ ] Counsellor CRM / admin console  
- [ ] Full national seat matrices automation  
- [ ] AI assistant (explicitly non-authoritative)  

---

## 4. Reusable Components

### Complete & standardize `components/ui/` (exists)
**Core:** Button, Input, SelectField, Textarea (add if missing), Checkbox, Switch, Badge, Avatar  
**Feedback:** Alert, Spinner, Skeleton, EmptyState, Toast (via ToastContext), Progress, Tooltip  
**Overlay:** Modal, Dropdown, Tabs  
**Data:** Table, Pagination, FilterBar, Charts  
**Domain cards:** CollegeCard, StatsCard, PredictionCard, HeroCard, ProfileCard, Timeline, Chat, Notification  

### Layout (refactor into `components/layout/`)
- Layout, Navbar, Footer, FloatingDock, FloatingActions, ProtectedRoute, SeoHead  

### Marketing (`components/marketing/`)
- Hero, ChoiceFinder, Stats, PainPoints, Explainer, Features, PackagesGrid  
- MbbsWalaTools, Support, AppPromo, Testimonials, FAQ, FinalCTA  
- Motion helpers: ScrollReveal, TextReveal, SmoothScroll, Magnetic (use sparingly; respect reduced motion)  

### Dashboard (`components/dashboard/` — exists)
- DashboardLayout, Sidebar, Topbar, RightPanel, navConfig  

### Component rules
1. Variants via `cva` or shared `cn()` — no one-off class soups on pages  
2. Every interactive component keyboardable  
3. No fetch inside `ui/*`  
4. Story/gallery: keep `DesignSystem` + `ComponentLibrary` pages **dev-only** or auth-gated  

---

## 5. Pages

### Public marketing
| Route | Purpose | Primary API |
|-------|---------|-------------|
| `/` | Acquisition | stats, features, packages, testimonials, faqs |
| `/packages`, `/neet-*`, `/inicet`, `/dnb-pdcet` | Offer detail | packages |
| `/colleges` | Directory | colleges |
| `/cutoffs` | Closing ranks | cutoffs |
| `/seat-matrix` | Seat charts | seat-matrix |
| `/rank-calculator` | Score→rank | rank-calculator |
| `/blogs`, `/blogs/:slug` | Content SEO | blogs |
| `/testimonials` | Trust | testimonials |
| `/about-us`, `/careers` | Company | careers |
| `/contact` | Leads | inquiries |
| `/login` | Auth | Supabase Auth |
| Legal routes | Compliance | static |
| `/design-system`, `/components` | Internal | none — gate or remove in prod |

### Authenticated app
| Route | Purpose | API |
|-------|---------|-----|
| `/dashboard` | Overview | dashboard-summary |
| `/dashboard/profile` | Profile | profile |
| `/dashboard/saved` | Shortlist | saved |
| `/dashboard/applications` | Applications | applications |
| `/dashboard/documents` | Docs | documents |
| `/dashboard/notifications` | Alerts | notifications |
| *(future)* `/dashboard/colleges` | In-app tools | colleges/cutoffs |

### Error routes
- `/404` catch-all  

---

## 6. Hooks (add under `src/hooks/`)

| Hook | Responsibility |
|------|----------------|
| `useApiQuery` | GET + loading/error/refetch (or adopt React Query) |
| `useApiMutation` | POST/PUT/DELETE |
| `useDebouncedValue` | search/rank |
| `useColleges` | filters ↔ `/api/colleges` |
| `useCutoffs` | filters ↔ `/api/cutoffs` |
| `useSeatMatrix` | filters + aggregates |
| `usePackages` | list/detail |
| `useChoiceEstimate` | debounced POST choices |
| `useRankPredictor` | calculator |
| `useInquiry` | contact form |
| `useSavedColleges` | dashboard shortlist |
| `useDashboardSummary` | home widgets |
| `useMediaQuery` | breakpoints |
| `useSeo` | title/description per page |

**Recommendation:** Add `@tanstack/react-query` for cache, dedupe, and stale-while-revalidate on public GETs.

---

## 7. Stores

Prefer **React Query + URL params** for server/filter state.  
Use **Zustand** (or context you already have) lightly:

| Store / Context | Keep? | Holds |
|-----------------|-------|-------|
| `AuthContext` | ✅ Keep | session, user |
| `ThemeContext` | ✅ Keep | light/dark |
| `ToastContext` | ✅ Keep | toasts |
| `DashboardContext` | Slim | sidebar collapsed, active section |
| `shortlistStore` (new, optional) | P2 | local optimistic IDs before auth |
| `uiStore` (new, optional) | Maybe | global modal only |

**Do not** duplicate full college lists into global stores.

---

## 8. API Layer

### Client (`src/lib/api.ts`)
```ts
apiGet<T>(path, init?)
apiPost<T>(path, body, init?)
apiPut / apiDelete
// Attach Authorization: Bearer <access_token> when session exists
// Throw ApiError { status, message }
```

### Server conventions
```js
// every handler
withCors(req, res)
if (OPTIONS) 204
try {
  // validate
  // auth if needed via _auth.js
  // supabase from db-client.js
  // return res.status(x).json(data)
} catch (e) {
  return res.status(e.status || 500).json({ error: e.message, code: e.code })
}
```

### Public endpoints
| Method | Path | Auth |
|--------|------|------|
| GET | packages, colleges, cutoffs, seat-matrix, blogs, faqs, stats, features, testimonials, careers | No |
| POST | choices, rank-calculator | No (rate limit) |
| POST | inquiries | No (rate limit + honeypot) |

### Private endpoints (Bearer)
| Method | Path | Auth |
|--------|------|------|
| GET/PUT | profile | Yes |
| CRUD | applications, documents, saved, notifications | Yes |
| GET | dashboard-summary | Yes |

### Validation (zod) — minimum
- inquiries: `name` min 2, `phone` E.164/IN mobile, email optional  
- choices: `rank` int ≥ 1, `exam` enum  
- rank-calculator: score within exam max  

### DB hardening
- Unique: `packages.slug`, `blogs.slug`  
- Indexes: `colleges(country, state, college_type)`, `cutoffs(category)`, `seat_matrix(college_kind)`, `inquiries(created_at desc)`  
- RLS: enable on user tables (`profile`, `saved`, `applications`…) with `auth.uid() = user_id`  
- Storage bucket policies for documents  

---

## 9. Testing Strategy

### Unit — Vitest
- Rank band selection / choice estimate math  
- Phone validators  
- `cn` / format helpers  
- navConfig integrity  

### Component — Testing Library (selective)
- Button disabled/loading  
- Contact form validation messages  
- ProtectedRoute redirect  

### API — integration (node)
- Inquiry 400 without phone  
- Choices 200 shape  
- Protected route 401 without token  

### E2E — Playwright (`e2e/`)
1. Home → tools section → Colleges  
2. Filter colleges  
3. Cutoffs category switch  
4. Seat matrix renders rows  
5. Rank calculator result  
6. Contact submit success  
7. Login page renders; optional demo login  
8. Dashboard redirect when logged out  
9. Mobile nav  

### CI
```yaml
install → lint → unit → build → (e2e on preview optional)
```

### Release QA (manual)
- iOS Safari, Chrome Android  
- Slow 3G  
- Keyboard-only  
- Dark mode if supported  

---

## 10. Accessibility

**Target:** WCAG 2.2 AA

- [ ] Skip link → `#main`  
- [ ] Landmarks + single `h1`  
- [ ] Focus rings on all controls (including custom Tabs/Modal)  
- [ ] `aria-expanded` on Navbar dropdowns & FAQ  
- [ ] Form errors tied with `aria-invalid` + `aria-describedby`  
- [ ] Modals focus trap (`Modal.tsx` audit)  
- [ ] Charts have text summary (not color-only)  
- [ ] `prefers-reduced-motion` disables SmoothScroll/marquee/heavy motion  
- [ ] Contrast audit on teal/coral on white and dark footer  
- [ ] Alt text: photos descriptive; illustrations decorative  

**Tooling:** axe + eslint-plugin-jsx-a11y  

---

## 11. Performance Optimization

### Budgets
| Metric | Target |
|--------|--------|
| LCP | ≤ 2.5s mobile |
| CLS | ≤ 0.1 |
| INP | ≤ 200ms |
| Initial JS (gzip) | ≤ 200KB critical |
| Lighthouse Perf | ≥ 90 |

### Actions
1. **Images:** recompress `public/images/mbbswala/*.png` (several are 1MB+); serve WebP; set width/height  
2. **Route split:** `React.lazy` for dashboard, blogs, design-system  
3. **Defer motion:** load framer-heavy sections after idle  
4. **Fonts:** self-host or limit weights; `font-display: swap`  
5. **API:** column select; paginate colleges at 50–100  
6. **Cache:** short CDN cache on public GETs that are seed-stable  
7. **Remove** `public/mbbswala-website.zip` from deploy artifacts if still present (~20MB)  
8. **Bundle analyze** after each milestone  

---

## 12. Deployment Checklist

### Build & config
- [ ] `npm run build` exit 0  
- [ ] Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, anon, `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth vars  
- [ ] SPA fallback rewrite excluding `/api/*`  
- [ ] No service role in client bundle (grep build output)  

### Product
- [ ] Favicon/logo/title/OG  
- [ ] robots.txt + sitemap.xml  
- [ ] 404  
- [ ] Contact + WhatsApp + tel verified  
- [ ] Dashboard gated  
- [ ] Design system routes disabled in production (`import.meta.env.PROD`)  

### Security
- [ ] Rate limits on POST  
- [ ] Security headers  
- [ ] RLS on user tables  
- [ ] File upload type/size limits  

### Post-deploy
- [ ] Smoke E2E on prod URL  
- [ ] `/api/health` uptime  
- [ ] Analytics + conversion events (form submit, click-to-call)  
- [ ] Search Console sitemap  
- [ ] Data update runbook shared with ops  

---

## 13. Git Commit Plan

**Conventional Commits** · branch off `main` · PR per milestone slice.

```
chore: add production roadmap doc
chore(api): extract cors respond validate helpers
feat(api): health endpoint and inquiry rate limit
fix(brand): purge legacy naming and assets
feat(hooks): useApiQuery mutation and domain hooks
refactor(pages): colleges cutoffs seat-matrix use shared ui states
perf(images): compress mbbswala media and lazy load
feat(seo): per-route meta sitemap robots og
feat(dashboard): wire saved colleges and applications end-to-end
feat(a11y): skip link focus accordion form errors
test: vitest calculator validation + playwright smoke
chore(ci): github actions build and test
chore(release): production env checklist
```

### PR template
- Summary / screenshots (mobile+desktop)  
- Risk / data migrations  
- Test plan  
- Checklist: build, a11y, no secrets  

---

## 14. Milestones

| ID | Name | Outcome | Exit criteria |
|----|------|---------|---------------|
| **M0** | Brand & foundation | Shared API helpers, brand clean | No legacy brand; health OK |
| **M1** | Public tools v1.1 | Colleges/cutoffs/seats polished | Filters + empty/error; vintage labels |
| **M2** | Conversion | Contact + CTAs optimized | Lead in DB; event tracked |
| **M3** | Calculators | Rank/choices trustworthy UX | Validation + disclaimers |
| **M4** | Dashboard MVP | Auth user can save & track | E2E login→save→list |
| **M5** | Quality | Perf + a11y + tests | Budgets + smoke green |
| **M6** | Launch | Domain + monitoring | Checklist signed |
| **M7** | Growth | Compare, docs upload, admin | P2 items prioritized |

### Timeline (1 full-stack engineer)
| Week | Milestone |
|------|-----------|
| 1 | M0 + M1 |
| 2 | M2 + M3 |
| 3 | M4 |
| 4 | M5 + M6 |

(2 engineers can compress launch to ~2.5 weeks.)

---

## 15. Complexity Estimate

| Workstream | Size | Rationale |
|------------|------|-----------|
| Brand/UI polish | **S–M** | System exists; consistency pass |
| API hardening + RLS | **M** | Auth routes already started |
| Public tools UX | **S–M** | Pages exist |
| Dashboard MVP completeness | **M–L** | Multiple entities + storage |
| Perf (images/bundle) | **M** | Large media risk |
| Test harness | **M** | Greenfield tests |
| SEO/analytics | **S** | Standard |
| Payments / CRM | **L** | New domain |
| Full India data ops | **L** | Ongoing content engineering |

### Overall
| Scope | Effort | Complexity |
|-------|--------|------------|
| **Launch P0–P1 (polished marketing + tools + lead + basic auth dashboard)** | **3–5 eng-weeks** | **Medium** |
| **+ solid dashboard (docs, applications, RLS, notifications)** | **+2–4 eng-weeks** | **Medium–High** |
| **+ payments + admin CRM + nationwide live data** | **+6–10 eng-weeks** | **High** |

**Current completion vs launch P0–P1:** ~**60–70%**.  
**Risk level to launch in 4 weeks:** **Medium** (mainly perf, RLS, test gaps).

---

## 16. Best Practices

### Architecture
- Browser never talks to Supabase service role; use `/api`  
- Typed DTOs shared between api mappers and pages  
- Feature folders when a domain exceeds ~5 files  

### Product / trust
- Always show **year + round** on counselling tables  
- Label predictors as **estimates**  
- Human support is the hero CTA (call/WhatsApp)  
- Don’t bury contact behind login  

### React
- Pages &lt; 200 lines; extract sections  
- Debounce expensive fetches  
- Prefer server filtering when lists grow  
- Suspense boundaries per route  

### Supabase
- Migrations in repo (SQL files) even if tools apply them  
- RLS before storing PII beyond simple inquiries  
- Least-privilege storage buckets  

### UX
- Skeleton for tables; never blank white  
- Sticky filter bars on data pages  
- Preserve filters in URL query string  

### Process
- Definition of Done = **build + mobile + keyboard + no console errors**  
- Data updates = versioned seed or admin, not hotfixes in UI  
- Keep Design System page as living documentation  

### Security
- Validate all inputs server-side  
- Rate limit POSTs  
- CSP gradually; start with basics  
- Audit dependencies monthly  

---

## 17. This Week — Concrete Backlog

1. Add `api/_lib/*` + `api/health.js`  
2. Rate-limit `inquiries` + calculator POSTs  
3. Grep purge any non-MBBSWALA brand leftovers  
4. Delete or `.vercelignore` huge `mbbswala-website.zip`  
5. Compress top 10 hero/feature images  
6. Wire `useSeo` on top 8 routes  
7. Playwright: 5 smoke tests  
8. RLS policies for `saved` / `applications` / `profile`  
9. Gate `/design-system` in production  
10. Freeze M6 launch checklist owners  

---

## 18. Success Metrics (30 days post-launch)

| KPI | Target |
|-----|--------|
| Inquiry submits / week | Track & grow WoW |
| Click-to-call or WhatsApp CTR | ≥ 3% of sessions |
| Tool pages (≥1 of colleges/cutoffs/seats) | ≥ 25% sessions |
| Dashboard activation (login→save) | ≥ 20% of signups |
| API 5xx rate | &lt; 1% |
| LCP mobile p75 | ≤ 2.5s |

---

## 19. Suggested Best-Practice Stack Add-ons

| Concern | Suggestion |
|---------|------------|
| Server state | `@tanstack/react-query` |
| Validation | `zod` (shared client/server) |
| Class names | `cn` (exists) + `class-variance-authority` for variants |
| Tables | Keep custom Table; virtualize if &gt;500 rows |
| E2E | Playwright |
| Unit | Vitest |
| Errors | Sentry (API + window) |
| Analytics | GA4 + optional Meta; respect consent |
| Email notify on lead | Resend/SendGrid via API (secret in Vercel) |

---

*Version 1.1 — production roadmap for MBBSWALA. Update exit criteria at each milestone.*
