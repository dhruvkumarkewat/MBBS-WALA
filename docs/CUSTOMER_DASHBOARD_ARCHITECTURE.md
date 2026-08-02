# MBBSWALA — Customer Dashboard Architecture
### Enterprise SaaS Blueprint (Architecture Only — No Implementation)

**Version:** 1.0  
**Product:** MBBSWALA Medical Admissions & NEET Counselling Platform  
**Audience:** Product, Design, Engineering  
**Status:** Approved for design → implementation handoff  

---

## 1. Executive Summary

This document defines the **complete customer (authenticated user) dashboard architecture** for MBBSWALA. It reorganizes all existing public-site capabilities (colleges, cutoffs, seat matrix, rank calculator, packages, inquiries, blogs, FAQs) into a **premium SaaS workspace** with enterprise navigation, modular IA, API contracts, data model, and component inventory.

### Design principles (premium SaaS UX)

| Principle | Application |
|-----------|-------------|
| **Clarity over density** | One primary job per view; progressive disclosure for advanced filters |
| **Predictable navigation** | Persistent left rail + contextual top bar; max 2 clicks to any module |
| **Trust & calm** | Medical-education tone: teal/ink palette, clear data provenance, no dark patterns |
| **Mobile-first parity** | Collapsible shell; bottom sheet filters; thumb-friendly CTAs |
| **Empty → value fast** | Onboarding checklist + rank profile unlocks personalized tools |
| **Role-aware** | Student vs Parent vs Counsellor-assisted views share shell, differ in defaults |
| **Auditability** | Every prediction/download/application action is logged |
| **Performance budget** | Skeleton-first; paginated tables; stale-while-revalidate for reference data |

---

## 2. Current Platform Inventory (Source of Truth)

### 2.1 Existing public surfaces

| Area | Routes / UI | Backend today |
|------|-------------|---------------|
| Marketing home | `/` | stats, features, packages, testimonials, faqs |
| Choice estimate | Hero `ChoiceFinder` | `POST /api/choices` → `choice_estimates` |
| Rank predictor | `/rank-calculator` | `POST /api/rank-calculator` → `rank_bands` |
| Packages | `/packages`, exam pages | `GET /api/packages` |
| Colleges directory | `/colleges` | `GET /api/colleges` |
| Cutoffs | `/cutoffs` | `GET /api/cutoffs` |
| Seat matrix | `/seat-matrix` | `GET /api/seat-matrix` |
| Contact / lead | `/contact` | `POST /api/inquiries` |
| Content | `/blogs`, FAQs | `GET /api/blogs`, `/api/faqs` |
| Auth (demo) | `/login` | Client-only demo (to be replaced by Supabase Auth) |

### 2.2 Existing tables

`packages`, `testimonials`, `faqs`, `site_stats`, `features`, `choice_estimates`, `rank_bands`, `blogs`, `careers`, `colleges`, `cutoffs`, `seat_matrix`, `inquiries`

### 2.3 Gap vs dashboard product

Missing today: **session identity**, **per-user profile/rank**, **saved colleges**, **applications pipeline**, **documents vault**, **notifications**, **billing/subscription**, **downloads center**, **support tickets**, **settings**.

---

## 3. Information Architecture (IA)

```
/app                          → Dashboard (home)
/app/ai                       → AI hub
/app/ai/chat                  → AI counsellor chat
/app/ai/insights              → Personalized insights feed
/app/predict                  → Prediction Tools hub
/app/predict/rank             → Rank calculator
/app/predict/choices          → Choice estimator
/app/predict/allotment        → Allotment mapping simulator
/app/colleges                 → College explorer
/app/colleges/:id             → College detail
/app/colleges/compare         → Side-by-side compare (max 4)
/app/counselling              → Counselling workspace
/app/counselling/sessions     → Booked / past sessions
/app/counselling/book         → Book counsellor
/app/counselling/timeline     → Round timeline & deadlines
/app/documents                → Document vault
/app/documents/checklist      → Admission checklist
/app/applications             → Applications pipeline
/app/applications/:id         → Application detail
/app/saved                    → Saved colleges & lists
/app/downloads                → Generated PDFs / exports
/app/profile                  → User profile & NEET profile
/app/settings                 → Account, prefs, security
/app/settings/notifications   → Notification preferences
/app/notifications            → Inbox
/app/support                  → Support hub
/app/support/tickets          → Tickets
/app/support/tickets/new      → New ticket
/app/billing                  → Billing overview
/app/billing/subscription     → Plan & usage
/app/billing/invoices         → Invoice history
/app/help                     → Help Center / knowledge base
```

**Public marketing site remains outside `/app/*`.**  
Unauthenticated deep-links to tools redirect: `/login?next=/app/predict/rank`.

---

## 4. Enterprise Navigation System

### 4.1 Shell layout (desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR: Logo | Global Search | Exam Context Chip | Notif | Avatar│
├────────────┬─────────────────────────────────────────────────────┤
│            │ BREADCRUMB                                          │
│  SIDE NAV  │─────────────────────────────────────────────────────│
│  (fixed)   │                                                     │
│            │  PAGE HEADER (title, subtitle, primary actions)     │
│  Modules   │                                                     │
│  + nested  │  MAIN CONTENT (cards / tables / wizards)            │
│            │                                                     │
│  ────────  │                                                     │
│  Plan badge│                                                     │
│  Help      │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

### 4.2 Side navigation groups

| Group | Items | Icon metaphor |
|-------|-------|----------------|
| **Overview** | Dashboard | Home / pulse |
| **Intelligence** | AI · Prediction Tools | Spark / chart |
| **Discovery** | Colleges · Saved Colleges | Building / bookmark |
| **Journey** | Counselling · Applications · Documents · Downloads | Path / folder |
| **Account** | Profile · Notifications · Settings | User / bell |
| **Commerce** | Billing · Subscription | Card |
| **Assist** | Support · Help Center | Life ring / book |

### 4.3 Navigation rules

1. **Active state** = exact match or parent of nested route.  
2. **Exam context switcher** in top bar (NEET UG default) scopes Prediction, Colleges filters, Counselling timeline.  
3. **Badge counts** on Notifications, Support (open tickets), Applications (action required).  
4. **Plan gate**: locked modules show crown + upgrade modal, never dead ends.  
5. **Keyboard**: `⌘K` command palette → jump to module, college, ticket.  
6. **Mobile**: bottom tab bar (Home · Tools · Colleges · Journey · More); side nav becomes drawer.

### 4.4 Top bar elements

| Element | Behavior |
|---------|----------|
| Global search | Colleges, blogs/help articles, saved lists, tickets |
| Exam chip | Sets `active_exam` in user prefs + URL `?exam=` |
| Notifications | Dropdown last 8 + “View all” |
| Avatar menu | Profile, Billing, Settings, Sign out |
| CTA (contextual) | e.g. “Book counsellor” on Dashboard |

### 4.5 Breadcrumb pattern

`App / Prediction Tools / Rank Calculator`  
Always clickable ancestors; last crumb plain text.

---

## 5. User Personas & Access

| Persona | Primary goals | Default landing |
|---------|---------------|-----------------|
| **Student** | Rank → college shortlist → choice list | Dashboard |
| **Parent** | Trust, fees, counsellor access, documents | Dashboard (parent mode: simpler language) |
| **Returning paid** | Timeline, applications, downloads | Dashboard with round countdown |

**Auth:** Supabase Auth (email + Google).  
**Authorization:** RLS on all `user_id` tables; service role only in serverless APIs after `getUser(token)`.

**Subscription tiers (logical):**

| Tier | Access |
|------|--------|
| Free | Dashboard lite, limited predictions/day, browse colleges, 5 saves |
| Essential | Full prediction tools, cutoffs/seat matrix, unlimited saves, downloads |
| Pro / Counselling | + live counsellor sessions, applications pipeline, priority support |
| Abroad Add-on | Abroad college filters, visa checklist docs |

---

## 6. Module Specifications

---

### MODULE A — Dashboard

#### Purpose
Single pane of glass: orientation, next actions, personalized signals, and shortcuts into deep modules.

#### Features
- Welcome + onboarding completion % (profile, rank, exam, first save)
- **NEET profile summary card** (exam, rank/score, category, state, quota)
- **Round countdown / timeline snapshot** (next counselling deadline)
- **AI insight of the day** (1–3 bullets from AI module)
- **Quick actions:** Predict rank, Estimate choices, Browse colleges, Book session
- **Saved colleges preview** (top 5 by list order)
- **Application status strip** (kanban mini)
- **Package / subscription status**
- **Unread notifications** count
- Empty states with guided CTAs for new users

#### Navigation
- Side nav root: **Dashboard**  
- Routes: `/app`  
- Entry from login success, logo click

#### User flow
1. User signs in → `/app`  
2. If profile incomplete → dismissible onboarding wizard (3 steps)  
3. User clicks Quick Action → target module with context prefilled  
4. User dismisses insight / marks checklist items  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/dashboard` | Aggregated payload |
| GET | `/api/app/onboarding` | Checklist state |
| PATCH | `/api/app/onboarding` | Mark step complete |
| GET | `/api/app/timeline?exam=` | Next deadlines |

#### Database tables
- `user_profiles`  
- `user_onboarding_steps`  
- `counselling_deadlines`  
- Reads: `saved_colleges`, `applications`, `notifications`, `subscriptions`

#### Required components
- `AppShell`, `SideNav`, `TopBar`, `CommandPalette`  
- `DashboardPage`  
- `OnboardingWizard`, `ChecklistCard`  
- `ProfileSummaryCard`, `DeadlineCard`, `InsightCard`  
- `QuickActionGrid`, `SavedCollegesPreview`, `ApplicationsStrip`  
- `EmptyState`, `SkeletonDashboard`

---

### MODULE B — AI

#### Purpose
Conversational and insight layer that interprets rank/profile against MBBSWALA data (colleges, cutoffs, seat matrix) — **assistive, not autonomous counsellor replacement** (align with “human experts” brand).

#### Features
- **AI Chat:** rank-aware Q&A with citations to internal data rows  
- **Insight feed:** “Colleges in your band”, “MP state vs AIQ”, “Document gaps”  
- **Prompt starters** by exam phase  
- **Safety:** disclaimers; escalate to Book Counsellor / Support  
- **History:** past threads, pin important answers  
- Usage meter by subscription  

#### Navigation
- Side: **AI** (parent)  
  - Chat → `/app/ai/chat`  
  - Insights → `/app/ai/insights`  
- Dashboard insight deep-links to Insights  

#### User flow
1. Open AI → optional select thread or New chat  
2. System injects profile context (exam, rank, category, state)  
3. User asks → streaming answer + source chips (college/cutoff ids)  
4. User clicks source → College detail or Cutoff filtered view  
5. “Talk to human” → Counselling book with chat summary attached  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/ai/threads` | List |
| POST | `/api/app/ai/threads` | Create |
| GET | `/api/app/ai/threads/:id` | Messages |
| POST | `/api/app/ai/chat` | Send message (SSE optional) |
| GET | `/api/app/ai/insights` | Generated cards |
| POST | `/api/app/ai/insights/refresh` | Regenerate |

#### Database tables
- `ai_threads` (`user_id`, title, exam, created_at)  
- `ai_messages` (`thread_id`, role, content, citations jsonb)  
- `ai_insights` (`user_id`, type, payload jsonb, expires_at)  
- `ai_usage_events` (metering)

#### Required components
- `AiHubLayout`, `ThreadList`, `ChatWindow`, `MessageBubble`  
- `CitationChip`, `PromptStarterGrid`  
- `InsightFeed`, `InsightCard`  
- `EscalateToHumanBanner`, `UsageMeter`  
- `StreamingText`

---

### MODULE C — Prediction Tools

#### Purpose
Deterministic + historical-data tools: rank from score, choice volume, allotment likelihood — elevating existing `rank-calculator`, `choices`, and future allotment mapping into one workspace.

#### Features
- **Hub** with tool cards + last-run results  
- **Rank Calculator** (score → predicted rank range; category adjust)  
- **Choice Estimator** (exam, counselling, quota, category, rank → choices)  
- **Allotment Mapper** (rank band × college/course → historical close proximity score)  
- **Save result** to profile / Downloads (PDF)  
- **History** of runs  
- Rate limits for Free tier  

#### Navigation
- Side: **Prediction Tools**  
  - `/app/predict`  
  - `/app/predict/rank`  
  - `/app/predict/choices`  
  - `/app/predict/allotment`  

#### User flow
1. User opens hub → picks tool  
2. Form prefilled from `user_profiles`  
3. Submit → result panel + confidence/disclaimer  
4. Actions: Save to profile · Export PDF · Find colleges in range · Ask AI to explain  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/rank-calculator` | Existing — auth optional → required in app |
| POST | `/api/choices` | Existing |
| POST | `/api/app/predict/allotment` | New |
| GET | `/api/app/predict/history` | User runs |
| POST | `/api/app/predict/history` | Persist run |
| POST | `/api/app/downloads` | Queue PDF from result |

#### Database tables
- Existing: `rank_bands`, `choice_estimates`, `cutoffs`  
- New: `prediction_runs` (`user_id`, tool, input jsonb, output jsonb)  
- `allotment_snapshots` (optional precomputed)

#### Required components
- `PredictHub`, `ToolCard`  
- `RankCalculatorForm`, `RankResultPanel`  
- `ChoiceEstimatorForm`, `ChoiceResultPanel`  
- `AllotmentMapperForm`, `AllotmentHeatTable`  
- `PredictionHistoryTable`, `DisclaimerBanner`  
- `ExportResultButton`

---

### MODULE D — Colleges

#### Purpose
Full discovery of India & abroad MBBS (and related) colleges with filters, detail, compare — productizing `/colleges` + cutoff/seat context.

#### Features
- Search + filters: country, state, type (Govt/Private), course, exam relevance  
- Results grid/table toggle  
- **College detail:** overview, cutoffs (if any), seat matrix rows, fees placeholder, save/compare  
- **Compare** up to 4 colleges  
- “Fits my rank” badge using profile + cutoffs  
- Abroad vs India tabs  
- Pagination / infinite scroll  

#### Navigation
- Side: **Colleges**  
  - `/app/colleges`  
  - `/app/colleges/:id`  
  - `/app/colleges/compare?ids=`  
- From Prediction “Find colleges” with query params  

#### User flow
1. Browse/filter → open detail  
2. Save to list OR add to compare tray  
3. Compare → export or start application interest  
4. From detail → view related cutoffs / seat matrix deep-link  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/colleges` | Existing + pagination params |
| GET | `/api/colleges/:id` | New detail (or query id) |
| GET | `/api/cutoffs` | Existing, filter by college_name |
| GET | `/api/seat-matrix` | Existing |
| GET | `/api/app/colleges/fit` | Rank-fit scoring for current user |

#### Database tables
- Existing: `colleges`, `cutoffs`, `seat_matrix`  
- Optional: `college_media`, `college_fees` (future enrichment)

#### Required components
- `CollegeExplorer`, `FilterBar`, `CollegeCard`, `CollegeTable`  
- `CollegeDetailPage`, `CutoffMiniTable`, `SeatMiniTable`  
- `CompareTray`, `ComparePage`, `FitBadge`  
- `Pagination`, `ViewToggle`

---

### MODULE E — Counselling

#### Purpose
Human counselling operations: booking, session history, round timeline — bridging brand promise (“No AI bots for final decisions”) with product.

#### Features
- **Timeline:** counselling rounds & deadlines by exam/state  
- **Book session:** slot picker, mode (call/WhatsApp/video), topic  
- **My sessions:** upcoming, completed, notes (counsellor-visible)  
- Attach prediction summary / saved list to booking  
- Reschedule / cancel rules  
- Contact shortcuts (phone/WhatsApp) for Pro  

#### Navigation
- Side: **Counselling**  
  - `/app/counselling` (overview)  
  - `/app/counselling/timeline`  
  - `/app/counselling/book`  
  - `/app/counselling/sessions`  
  - `/app/counselling/sessions/:id`  

#### User flow
1. User reviews timeline → sees urgency  
2. Book → select slot → confirm (subscription check)  
3. Reminder notifications fired  
4. Post-session: notes + next steps → Applications/Documents  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/timeline` | Deadlines |
| GET | `/api/app/counselling/slots` | Availability |
| POST | `/api/app/counselling/bookings` | Create |
| GET | `/api/app/counselling/bookings` | List mine |
| PATCH | `/api/app/counselling/bookings/:id` | Reschedule/cancel |
| GET | `/api/app/counselling/bookings/:id` | Detail + notes |

#### Database tables
- `counselling_deadlines`  
- `counsellor_slots`  
- `counselling_bookings` (`user_id`, slot_id, status, topic, attachments jsonb)  
- `session_notes`  
- Bridge: create/update `inquiries` for ops visibility  

#### Required components
- `CounsellingOverview`, `TimelineCalendar`, `DeadlineList`  
- `BookingWizard`, `SlotPicker`, `SessionList`, `SessionDetail`  
- `AttachmentPicker` (saved list / prediction run)  
- `PlanGateModal`

---

### MODULE F — Documents

#### Purpose
Secure vault + admission checklist so families never lose NEET scorecard, IDs, category certificates, etc.

#### Features
- Upload (PDF/JPG/PNG) with type tags  
- Checklist templates by pathway (India UG, State MP, Abroad)  
- Status: missing / uploaded / verified  
- Preview, replace, delete  
- Share link with counsellor (time-boxed)  
- Storage quota by plan  

#### Navigation
- Side: **Documents**  
  - `/app/documents`  
  - `/app/documents/checklist`  

#### User flow
1. Pick pathway checklist  
2. Upload against each required item  
3. System marks complete % → Dashboard onboarding  
4. Counsellor booking can request doc pack  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/documents` | List metadata |
| POST | `/api/app/documents/upload` | Base64 → Supabase Storage |
| DELETE | `/api/app/documents/:id` | |
| GET | `/api/app/documents/checklist` | Template + progress |
| PATCH | `/api/app/documents/checklist/:itemId` | Status |

#### Database tables
- `documents` (`user_id`, type, file_url, file_name, size, status)  
- `document_checklist_templates`  
- `user_checklist_items`  
- Storage bucket: `user-documents` (private)

#### Required components
- `DocumentsPage`, `UploadDropzone`, `DocumentRow`  
- `ChecklistProgress`, `ChecklistItemRow`  
- `FilePreviewModal`, `QuotaBar`

---

### MODULE G — Applications

#### Purpose
Track counselling/admission applications (AIQ, state, deemed, abroad) as a lightweight CRM for the student.

#### Features
- Pipeline board: Interested → Applied → Document stage → Allotted → Admitted / Rejected  
- Application cards linked to college + counselling body  
- Tasks & due dates  
- Notes & status history  
- Convert from Saved College  

#### Navigation
- Side: **Applications**  
  - `/app/applications`  
  - `/app/applications/:id`  
  - Create modal from colleges/saved  

#### User flow
1. Save college → “Start application”  
2. Move stages as rounds progress  
3. Attach documents  
4. Mark allotted seat → celebrate state + download summary  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/app/applications` | |
| GET/PATCH/DELETE | `/api/app/applications/:id` | |
| POST | `/api/app/applications/:id/events` | Status history |
| POST | `/api/app/applications/from-saved` | |

#### Database tables
- `applications` (`user_id`, college_id, body, stage, meta jsonb)  
- `application_events`  
- `application_tasks`  

#### Required components
- `ApplicationsBoard` (kanban) / `ApplicationsTable`  
- `ApplicationDetail`, `StageSelector`  
- `TaskList`, `EventTimeline`  
- `CreateApplicationModal`

---

### MODULE H — Saved Colleges

#### Purpose
Shortlists and ordered choice-list practice — emotional + operational core of counselling prep.

#### Features
- Multiple lists (e.g. Dream / Realistic / Safe / Abroad)  
- Drag-and-drop ordering (choice priority)  
- Notes per item  
- Bulk add from explorer  
- Export list PDF  
- Share read-only with parent/counsellor  

#### Navigation
- Side: **Saved Colleges** → `/app/saved`  
- List detail: `/app/saved/:listId`  

#### User flow
1. Create list → add colleges from explorer  
2. Reorder → annotate  
3. Export / attach to counselling booking  
4. Push selected → Applications  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/app/lists` | |
| GET/PATCH/DELETE | `/api/app/lists/:id` | |
| POST | `/api/app/lists/:id/items` | |
| PATCH | `/api/app/lists/:id/reorder` | |
| DELETE | `/api/app/lists/:id/items/:itemId` | |

#### Database tables
- `college_lists` (`user_id`, name, type)  
- `college_list_items` (`list_id`, college_id, sort_order, notes)  

#### Required components
- `SavedListsPage`, `ListTabs`, `SortableCollegeRow`  
- `AddToListModal`, `ListEmptyState`  
- `ExportListButton`

---

### MODULE I — Downloads

#### Purpose
Central repository of generated artifacts (prediction PDFs, choice lists, seat matrix exports, invoices).

#### Features
- Filter by type/date  
- Re-download / delete  
- Generation status (queued, ready, failed)  
- One-click regenerate  

#### Navigation
- Side: **Downloads** → `/app/downloads`  

#### User flow
1. User exports from Prediction/Saved/Billing  
2. Job async → notification when ready  
3. Downloads page shows file  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/downloads` | |
| POST | `/api/app/downloads` | Create job |
| GET | `/api/app/downloads/:id` | Status + URL |

#### Database tables
- `download_jobs` (`user_id`, type, status, file_url, payload jsonb)  
- Storage: `user-exports`  

#### Required components
- `DownloadsPage`, `DownloadRow`, `StatusBadge`  
- `GenerateExportDialog`

---

### MODULE J — Profile

#### Purpose
Identity + academic counselling profile that powers personalization across AI, Prediction, Fit badges.

#### Features
- Personal: name, phone, email, role (student/parent)  
- **NEET profile:** exam, year, score, rank, category, state, domicile, quota prefs  
- Preferences: preferred states, budget band, India/abroad  
- Avatar upload  
- Completeness meter  

#### Navigation
- Side / avatar: **Profile** → `/app/profile`  

#### User flow
1. Edit sections → save  
2. Changes invalidate cached insights / fit scores  
3. Onboarding writes initial profile  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET/PATCH | `/api/app/profile` | |
| POST | `/api/app/profile/avatar` | Storage |

#### Database tables
- `user_profiles` (1:1 auth.users)  
- Fields: `full_name`, `phone`, `role`, `exam`, `score`, `rank`, `category`, `state`, `quota_prefs jsonb`, `budget_max`, `pathway`, `avatar_url`, `onboarding_completed`  

#### Required components
- `ProfilePage`, `PersonalForm`, `NeetProfileForm`  
- `PrefsForm`, `CompletenessMeter`, `AvatarUploader`

---

### MODULE K — Settings

#### Purpose
Account security, preferences, privacy — standard SaaS account center.

#### Features
- Password / linked providers  
- Language & theme (light default; optional dark)  
- Exam default  
- Privacy: data export, delete account request  
- Active sessions (optional v2)  

#### Navigation
- **Settings** → `/app/settings`  
- Nested: `/app/settings/notifications` (prefs only; inbox separate)  
- `/app/settings/security`  

#### User flow
1. Update pref → toast confirm  
2. Delete account → support ticket + cool-down  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET/PATCH | `/api/app/settings` | |
| POST | `/api/app/settings/password` | Via Supabase |
| POST | `/api/app/settings/delete-request` | |

#### Database tables
- `user_settings` (`user_id`, theme, locale, default_exam, marketing_opt_in)  
- `account_deletion_requests`  

#### Required components
- `SettingsLayout`, `SettingsNav`  
- `SecurityPanel`, `AppearancePanel`, `PrivacyPanel`

---

### MODULE L — Notifications

#### Purpose
In-app inbox for deadlines, booking updates, export ready, billing, system.

#### Features
- List with read/unread  
- Types: deadline, booking, download, billing, system, ai  
- Mark read / mark all  
- Deep link to entity  
- Preference matrix (email / WhatsApp / in-app) under Settings  

#### Navigation
- Side + top bell: **Notifications** → `/app/notifications`  
- Prefs: `/app/settings/notifications`  

#### User flow
1. Event occurs → row inserted  
2. User opens inbox → click → navigate + mark read  
3. User tunes channels in settings  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/notifications` | |
| POST | `/api/app/notifications/read` | ids or all |
| GET/PATCH | `/api/app/settings/notifications` | Channel prefs |

#### Database tables
- `notifications` (`user_id`, type, title, body, href, read_at, created_at)  
- `notification_preferences`  

#### Required components
- `NotificationsPage`, `NotificationItem`  
- `TopBarNotificationDropdown`  
- `NotificationPrefsForm`

---

### MODULE M — Support

#### Purpose
Structured help requests + escalation from AI/chat failures.

#### Features
- Ticket list & detail thread  
- Categories: billing, technical, counselling, data correction  
- Priority for Pro  
- File attachments  
- SLA display (soft)  
- Quick links to WhatsApp/phone  

#### Navigation
- **Support** → `/app/support`  
  - `/app/support/tickets`  
  - `/app/support/tickets/new`  
  - `/app/support/tickets/:id`  

#### User flow
1. New ticket → category + description  
2. Agent replies (admin tooling out of scope; DB-ready)  
3. User closes or reopens  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/app/support/tickets` | |
| GET | `/api/app/support/tickets/:id` | |
| POST | `/api/app/support/tickets/:id/messages` | |

#### Database tables
- `support_tickets`  
- `support_messages`  

#### Required components
- `SupportHub`, `TicketList`, `TicketComposer`  
- `TicketThread`, `PriorityBadge`  
- `ContactChannelsCard`

---

### MODULE N — Billing

#### Purpose
Transparency on charges, payment methods, invoices (Razorpay/Stripe-ready; abstract provider).

#### Features
- Current plan & renew date  
- Payment method on file (masked)  
- Invoice list + PDF  
- Upgrade CTA  
- GST fields (India)  

#### Navigation
- **Billing** → `/app/billing`  
  - `/app/billing/invoices`  

#### User flow
1. View plan → upgrade → Subscription module checkout  
2. Download invoice from list  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/billing/overview` | |
| GET | `/api/app/billing/invoices` | |
| GET | `/api/app/billing/invoices/:id` | |

#### Database tables
- `subscriptions`  
- `invoices`  
- `payment_methods` (token refs only)  

#### Required components
- `BillingOverview`, `InvoiceTable`  
- `PaymentMethodCard`, `UpgradeBanner`

---

### MODULE O — Subscription

#### Purpose
Plan selection, checkout, usage limits, add-ons (Abroad, Counselling hours).

#### Features
- Plan comparison (maps to existing `packages` + SaaS tiers)  
- Checkout session  
- Proration / cancel at period end  
- Usage meters: AI messages, predictions, downloads, sessions  
- Success / failure return URLs  

#### Navigation
- **Subscription** → `/app/billing/subscription`  
- Marketing packages can deep-link here when logged in  

#### User flow
1. Compare plans → select  
2. Checkout → webhook activates entitlement  
3. Entitlements unlock modules  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/app/subscription` | Current + entitlements |
| GET | `/api/packages` | Catalog (existing) |
| POST | `/api/app/subscription/checkout` | |
| POST | `/api/app/subscription/portal` | Manage |
| POST | `/api/webhooks/billing` | Provider webhooks |

#### Database tables
- Existing `packages` (catalog)  
- `plans` (normalized SaaS plans if split from counselling packages)  
- `subscriptions`, `entitlements`, `usage_counters`  
- `checkout_sessions`  

#### Required components
- `PlanComparisonTable`, `CheckoutButton`  
- `UsageMeters`, `CancelPlanDialog`  
- `EntitlementGate` (HOC/wrapper)

---

### MODULE P — Help Center

#### Purpose
Self-serve education: FAQs, guides, blog articles — reusing `faqs` + `blogs`.

#### Features
- Search articles  
- Categories (NEET UG, MP counselling, Abroad, Account)  
- Article detail  
- “Was this helpful?”  
- Escalate to Support  

#### Navigation
- **Help Center** → `/app/help`  
  - `/app/help/articles/:slug`  
  - FAQ section embedded  

#### User flow
1. Search → read article  
2. Still stuck → create ticket with article context  

#### Required APIs
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/faqs` | Existing |
| GET | `/api/blogs` | Existing |
| GET | `/api/blogs?slug=` | Existing |
| POST | `/api/app/help/feedback` | Optional |

#### Database tables
- Existing: `faqs`, `blogs`  
- Optional: `help_article_feedback`  
- Optional: `help_categories`  

#### Required components
- `HelpHome`, `ArticleSearch`, `ArticleList`  
- `ArticleDetail`, `FaqAccordion`  
- `HelpfulToggle`, `EscalateCard`

---

## 7. Cross-Cutting Architecture

### 7.1 Auth & session

```
Login/Signup (Supabase) 
  → access_token 
  → all /api/app/* require Authorization: Bearer 
  → supabase.auth.getUser(token) 
  → RLS / user_id scoping
```

- `ProtectedRoute` wraps `/app/*`  
- Refresh via Supabase client on frontend  
- Demo user seed for QA  

### 7.2 Entitlement middleware

```
Request → Auth → Load subscription/entitlements → Feature flag check → Handler
```

Feature keys examples: `ai.chat`, `predict.allotment`, `counselling.book`, `documents.vault`, `exports.pdf`.

### 7.3 API surface map (summary)

| Namespace | Responsibility |
|-----------|----------------|
| `/api/*` (existing) | Public/reference data; become dual-mode (public read, app write where needed) |
| `/api/app/*` | Authenticated customer APIs |
| `/api/webhooks/*` | Billing provider |

### 7.4 Target database schema (new tables)

```
user_profiles
user_settings
user_onboarding_steps
notification_preferences
notifications
college_lists
college_list_items
saved_college_notes (optional)
prediction_runs
ai_threads
ai_messages
ai_insights
ai_usage_events
documents
user_checklist_items
document_checklist_templates
applications
application_events
application_tasks
counselling_deadlines
counsellor_slots
counselling_bookings
session_notes
download_jobs
support_tickets
support_messages
plans
subscriptions
entitlements
usage_counters
invoices
payment_methods
checkout_sessions
account_deletion_requests
help_article_feedback
```

**Retain & join:** `colleges`, `cutoffs`, `seat_matrix`, `rank_bands`, `choice_estimates`, `packages`, `faqs`, `blogs`, `inquiries`.

### 7.5 Storage buckets

| Bucket | Access |
|--------|--------|
| `user-documents` | Private; signed URLs |
| `user-exports` | Private; signed URLs |
| `avatars` | Public or signed |

### 7.6 Shared component system (design system)

| Layer | Components |
|-------|------------|
| Foundation | `Button`, `Input`, `Select`, `Modal`, `Drawer`, `Toast`, `Tabs`, `Badge`, `Skeleton` |
| Data | `DataTable`, `EmptyState`, `ErrorState`, `Pagination` |
| App chrome | `AppShell`, `SideNav`, `TopBar`, `Breadcrumbs`, `CommandPalette` |
| Commerce | `EntitlementGate`, `PlanBadge`, `UpgradeModal` |
| Feedback | `ConfirmDialog`, `Banner`, `Disclaimer` |

### 7.7 Key user journeys (end-to-end)

**J1 — New student activation**  
Signup → Profile NEET fields → Rank predict → Save 5 colleges → Checklist 30% → Dashboard green.

**J2 — Choice filling week**  
Timeline alert → Choice estimator → Saved list reorder → Export PDF → Book counsellor with list attached.

**J3 — Paid upgrade**  
Hit Free limit on AI → Upgrade modal → Subscription checkout → Entitlements refresh → Resume chat.

**J4 — Abroad pivot**  
Profile pathway Abroad → Colleges country filter → Documents abroad checklist → Application stage Abroad.

### 7.8 Non-functional requirements

| NFR | Target |
|-----|--------|
| LCP app shell | < 2.5s on 4G |
| API p95 | < 400ms for reads; predictions < 1.2s |
| A11y | WCAG 2.1 AA on nav & forms |
| Security | RLS, signed uploads, no PII in logs |
| Audit | `prediction_runs`, booking, billing events immutable |

### 7.9 Analytics events (product)

`dashboard_viewed`, `prediction_run`, `college_saved`, `list_exported`, `booking_created`, `ai_message_sent`, `upgrade_clicked`, `checkout_completed`, `ticket_created`

---

## 8. Navigation ↔ Module Matrix

| Nav label | Route prefix | Primary modules |
|-----------|--------------|-----------------|
| Dashboard | `/app` | A |
| AI | `/app/ai` | B |
| Prediction Tools | `/app/predict` | C |
| Colleges | `/app/colleges` | D |
| Counselling | `/app/counselling` | E |
| Documents | `/app/documents` | F |
| Applications | `/app/applications` | G |
| Saved Colleges | `/app/saved` | H |
| Downloads | `/app/downloads` | I |
| Profile | `/app/profile` | J |
| Settings | `/app/settings` | K |
| Notifications | `/app/notifications` | L |
| Support | `/app/support` | M |
| Billing | `/app/billing` | N |
| Subscription | `/app/billing/subscription` | O |
| Help Center | `/app/help` | P |

---

## 9. Implementation Phases (recommended)

| Phase | Scope | Outcome |
|-------|-------|---------|
| **P0** | App shell, auth, profile, dashboard skeleton | Logged-in home |
| **P1** | Prediction tools + colleges + saved lists | Core value loop |
| **P2** | Cutoff/seat integration in detail, downloads | Data depth |
| **P3** | Counselling booking + notifications + timeline | Human layer |
| **P4** | Documents + applications | Journey ops |
| **P5** | AI chat/insights + metering | Intelligence |
| **P6** | Billing/subscription/entitlements | Monetization |
| **P7** | Support tickets + help center polish | Scale support |

---

## 10. Open Decisions (product)

1. Single subscription vs separate “counselling package” SKUs from marketing `packages` table — **recommend:** `plans` for SaaS + optional one-time `counselling_products` linked to bookings.  
2. Parent linked accounts (family) — **v2** via `family_links`.  
3. Realtime: notifications + ticket messages via Supabase Realtime.  
4. AI provider abstraction (env secret) with strict RAG over internal tables only.

---

## 11. Deliverable Checklist (for engineering handoff)

- [x] Module purposes & features  
- [x] Enterprise nav system & IA  
- [x] User flows per module  
- [x] API catalog (existing + new)  
- [x] Database tables (existing + new)  
- [x] Component inventory per module  
- [x] Entitlements, NFRs, phases  
- [ ] UI wireframes (design)  
- [ ] OpenAPI spec (next)  
- [ ] React implementation (explicitly out of scope for this document)

---

*End of architecture document. No application code is specified herein — implementation should follow this blueprint module-by-module under `/app`.*
