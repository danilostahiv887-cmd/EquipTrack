# EquipTrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a Ukrainian inventory-management application that runs on Vercel, uses Surreal Cloud, and stores equipment photos and documents in SurrealDB.

**Architecture:** Next.js App Router provides the browser UI plus server-only commands and media routes. A focused SurrealDB layer owns the client connection, schema, repositories and transactions. Binary files exist only as file records; lists select metadata only, while an authorized route streams the requested file variant.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, SurrealDB JavaScript SDK, Zod, bcryptjs, jose and sharp. Automated test coverage is intentionally excluded by the approved specification.

---

## Target file structure

~~~text
.
├── public/
├── scripts/
├── src/app/
├── src/components/
├── src/lib/
├── src/server/
├── .env.example
├── README.md
└── package.json
~~~

### Task 1: Bootstrap setup-safe Next.js runtime

**Files:**
- Create: package.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts, .gitignore, .env.example
- Create: src/app/layout.tsx, src/app/page.tsx, src/app/globals.css, src/app/setup/page.tsx
- Create: src/lib/env.ts, src/lib/errors.ts, src/lib/types.ts

- [ ] **Step 1: Create scripts and dependencies**

Use these scripts:

~~~json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "db:migrate": "tsx scripts/db-migrate.ts",
    "db:seed": "tsx scripts/db-seed.ts",
    "setup": "tsx scripts/setup.ts",
    "check": "npm run typecheck && npm run build"
  }
}
~~~

Install next, react, react-dom, surrealdb, zod, bcryptjs, jose, sharp, clsx and tailwind-merge. Do not install an SVG icon library.

- [ ] **Step 2: Implement environment detection**

Export isConfigured only when SURREAL_URL, SURREAL_NAMESPACE, SURREAL_DATABASE, SURREAL_USERNAME, SURREAL_PASSWORD and AUTH_SECRET are non-empty. No client module exports a database credential.

- [ ] **Step 3: Implement safe root routing**

The root redirects configured deployments to /dashboard and unconfigured deployments to /setup. The Ukrainian setup page lists variable names and the npm run setup command, never actual data.

- [ ] **Step 4: Verify and commit**

Run: npm install and npm run typecheck. Expected: TypeScript exits 0.

~~~text
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts .gitignore .env.example src/app src/lib
git commit -m "feat: bootstrap setup-safe Next application"
~~~

### Task 2: Add SurrealDB schema, indexes, rules and seed data

**Files:**
- Create: src/lib/db/client.ts, src/lib/db/schema.ts, src/lib/db/repository.ts, src/lib/db/seed.ts
- Create: scripts/db-migrate.ts, scripts/db-seed.ts, scripts/setup.ts
- Modify: src/lib/types.ts

- [ ] **Step 1: Define typed records**

Use record IDs such as equipment:abc123. Define role, status and condition unions plus types for user, session, building, room_type, room, category, supplier, equipment, file, movement, transfer_request, repair, audit, audit_item, writeoff_request, notification and audit_log.

- [ ] **Step 2: Define the ordered schema command array**

Create schema-full tables, file.data as bytes, file.previewData as optional bytes, status assertions, timestamps, inventory-number uniqueness and all filtering indexes in the approved design. Deny anonymous database access and require permissions on every table.

- [ ] **Step 3: Add a server-only database helper**

withDatabase checks configuration, connects, signs in, selects the namespace/database, executes a callback and disconnects in finally. Absent configuration throws a Ukrainian SetupError.

- [ ] **Step 4: Implement idempotent migration and seed**

db-migrate executes schema commands. db-seed creates exactly one admin, two managers, eight staff, the reference buildings, rooms, categories, suppliers, equipment and history only when records are absent. setup runs migrate then seed.

- [ ] **Step 5: Verify and commit**

Run npm run typecheck and npm run db:migrate without .env. Expected: typecheck passes, migration reports a Ukrainian setup error.

~~~text
git add src/lib/types.ts src/lib/db scripts
git commit -m "feat: add SurrealDB schema and setup scripts"
~~~

### Task 3: Add authentication, sessions and role boundaries

**Files:**
- Create: src/lib/auth/passwords.ts, src/lib/auth/session.ts, src/lib/auth/permissions.ts
- Create: src/server/actions/auth.ts, src/app/(auth)/login/page.tsx, src/components/auth/login-form.tsx
- Create: src/app/(workspace)/layout.tsx

- [ ] **Step 1: Persist secure sessions**

Hash passwords using bcryptjs. Store only SHA-256 session-token hashes with expiry and user reference. Put the plain random token only in an HttpOnly, SameSite=Lax, production-secure cookie. Invalid or expired sessions return null.

- [ ] **Step 2: Centralize permissions**

Define equipment:read, equipment:manage, movement:manage, audit:manage, user:manage, writeoff:approve, request:create and repair:report. Map these strictly to staff, inventory_manager and admin.

- [ ] **Step 3: Build a custom login**

Use noValidate, Zod, Ukrainian field errors and a pending state. The server action denies inactive accounts. Do not use required, native alert, native confirm or SVG.

- [ ] **Step 4: Verify and commit**

Run npm run typecheck. After seed, manually check invalid credentials, three roles and a denied staff administrative action.

~~~text
git add src/lib/auth src/server/actions/auth.ts src/app src/components/auth
git commit -m "feat: add secure role-based authentication"
~~~

### Task 4: Build the no-SVG cartotheque shell

**Files:**
- Create: src/components/layout/workspace-shell.tsx, src/components/layout/catalog-index.tsx, src/components/layout/user-menu.tsx
- Create: src/components/ui/button.tsx, dialog.tsx, field.tsx, toast.tsx, pagination.tsx, status-badge.tsx
- Modify: src/app/globals.css, src/app/(workspace)/layout.tsx

- [ ] **Step 1: Define visual primitives**

Create graphite, porcelain, cyan, green and amber tokens, a CSS-only drafting grid, custom scrollbar and keyboard focus treatment. No SVG assets, components or backgrounds are permitted.

- [ ] **Step 2: Implement inventory-cartotheque navigation**

Render a narrow textual index at the right edge for dashboard, rooms, equipment, movements, requests, repairs, audits, write-offs, documents, analytics, users and settings. Filter entries by role. Below 768px, open the same index in a labelled bottom sheet.

- [ ] **Step 3: Implement accessible controls**

Dialog traps focus, supports safe Escape close, blocks accidental dismissal while dirty and shows pending state. Fields display labels and errors. Pagination preserves search parameters. Buttons use Ukrainian text labels.

- [ ] **Step 4: Verify and commit**

Run npm run build. Expected: build succeeds without .env and /setup renders.

~~~text
git add src/app src/components/layout src/components/ui
git commit -m "feat: add cartotheque workspace interface"
~~~

### Task 5: Add reference data and room passports

**Files:**
- Create: src/lib/validation/rooms.ts, src/lib/validation/reference-data.ts
- Create: src/server/actions/rooms.ts, src/server/actions/reference-data.ts
- Create: src/components/rooms/room-form.tsx, room-table.tsx, room-passport.tsx
- Create: src/app/(workspace)/rooms/page.tsx, src/app/(workspace)/rooms/[roomId]/page.tsx, src/app/(workspace)/settings/page.tsx

- [ ] **Step 1: Validate and mutate reference records**

Rooms require number, building, type, non-negative floor/capacity and valid status. Admin manages buildings, room types, categories and suppliers; managers can manage rooms. Actions execute permissions, Zod parsing and route revalidation.

- [ ] **Step 2: Query rooms server-side**

Support q, building, room type, status, sort and pagination. Return items, total, page and pageSize with no file bytes. The passport joins assigned equipment, last audit, recent movements, condition totals and responsible person.

- [ ] **Step 3: Verify and commit**

Create an inactive room manually. Confirm it filters correctly and cannot be selected as a new equipment destination. Run npm run check.

~~~text
git add src/lib/validation src/server/actions src/components/rooms src/app
git commit -m "feat: manage institutional rooms and reference data"
~~~

### Task 6: Add equipment, passports and database-backed files

**Files:**
- Create: src/lib/validation/equipment.ts, src/lib/files/image.ts, src/lib/files/service.ts
- Create: src/server/actions/equipment.ts, src/server/services/equipment.ts
- Create: src/components/files/file-upload.tsx, src/components/inventory/equipment-form.tsx, equipment-table.tsx, equipment-passport.tsx
- Create: src/app/(workspace)/equipment/page.tsx, src/app/(workspace)/equipment/[equipmentId]/page.tsx, src/app/api/files/[fileId]/[variant]/route.ts

- [ ] **Step 1: Bound and transform uploads**

Accept JPEG, PNG, WebP and PDF. Reject unsupported types, absent MIME type and values above the README limit. sharp creates a bounded WebP original plus smaller WebP preview; both bytes are stored in file. PDFs store one binary body.

- [ ] **Step 2: Stream protected media**

Resolve the session, file owner and entity permission before returning full or preview bytes with content type, length, disposition and cache policy. Unknown IDs return 404; denied access returns 403.

- [ ] **Step 3: Make equipment creation transactional**

Create equipment, linked files, first received/assigned movement and audit log together. Catalogue filters execute in the database for name, inventory/serial, category, status, condition, room, responsible user, supplier, date, price, photo, repair and audit state.

- [ ] **Step 4: Render, verify and commit**

Use fixed-aspect preview frames, text status, CSS rails and skeletons. The passport shows placement, acquisition, files, custody, repairs, audits and write-off state. Create an asset with photo/PDF manually, then verify first movement and protected download. Run npm run check.

~~~text
git add src/lib/files src/lib/validation/equipment.ts src/server src/components/files src/components/inventory src/app
git commit -m "feat: add equipment catalog and database-backed files"
~~~

### Task 7: Add movements, transfer requests and repairs

**Files:**
- Create: src/lib/validation/movements.ts, requests.ts, repairs.ts
- Create: src/server/actions/movements.ts, requests.ts, repairs.ts
- Create: src/server/services/movements.ts, workflows.ts
- Create: src/components/workflows/movement-form.tsx, transfer-request-form.tsx, repair-form.tsx
- Create: src/app/(workspace)/movements/page.tsx, requests/page.tsx, repairs/page.tsx

- [ ] **Step 1: Centralize custody transitions**

recordMovement validates active destination room, equipment status, required reason/acceptor, updates room/responsible user and writes movement plus audit log atomically.

- [ ] **Step 2: Implement transfer requests and repairs**

Staff can draft, submit and cancel their own request. Manager/admin can approve/reject and complete; a user cannot approve their own request. Damage reports carry equipment, room, severity, description and optional evidence. Sending/returning repair creates matching movements and updates condition.

- [ ] **Step 3: Verify and commit**

Submit as staff, approve/complete as manager and confirm room/responsible/timeline. Report and complete a repair. Run npm run check.

~~~text
git add src/lib/validation src/server/actions src/server/services src/components/workflows src/app
git commit -m "feat: add custody and repair workflows"
~~~

### Task 8: Add audits, write-offs, notifications, analytics and final admin pages

**Files:**
- Create: src/lib/validation/audits.ts, writeoffs.ts
- Create: src/server/actions/audits.ts, writeoffs.ts, notifications.ts
- Create: src/server/services/analytics.ts
- Create: src/components/workflows/audit-form.tsx, audit-item-form.tsx, writeoff-form.tsx
- Create: src/components/analytics/metric-strip.tsx, condition-chart.tsx, activity-list.tsx
- Create: src/app/(workspace)/audits/page.tsx, writeoffs/page.tsx, notifications/page.tsx, analytics/page.tsx, dashboard/page.tsx, users/page.tsx, documents/page.tsx, audit-log/page.tsx

- [ ] **Step 1: Implement audit and write-off workflows**

Audits snapshot expected room equipment, record found/missing/damaged/moved results, store completion summary and notify responsible users. Managers propose write-off with a reason/document; only admin approves/rejects. Approval sets written_off/archived and calls recordMovement.

- [ ] **Step 2: Implement local notifications and analysis**

Create notifications for request, movement, repair, audit and write-off events. Query unread/read pages. Return total count/value, distributions, repair risk, audit gaps, recent moves and high-value equipment. Render CSS bars and tables instead of SVG charts.

- [ ] **Step 3: Implement dashboards and remaining administration**

Staff sees own rooms/assets/requests/reports; manager sees repair, transfer, audit and high-value indicators; admin sees user/value/audit-log/health indicators. Users protect the final active admin from deactivation. Documents list metadata and protected links. Audit log filters/paginates actor/action/entity.

- [ ] **Step 4: Add raster identity and Ukrainian documentation**

Create ICO/PNG icon assets, manifest and OG image only. Configure Ukrainian metadata. README documents Surreal Cloud creation, Vercel variables, commands, seed accounts, roles, data map, workflows, protected database files, limits and setup-safe mode.

- [ ] **Step 5: Final verification and commit**

Run npm run check without .env. Search tracked files for real secrets. Against a configured Surreal Cloud instance, manually complete audit and write-off, then verify history, notification and analytics.

~~~text
git add src/app src/lib src/server src/components public README.md .env.example
git commit -m "feat: complete EquipTrack operational workflows"
~~~

## Plan self-review

- **Spec coverage:** Tasks 1–3 cover safe deployment, schema, sessions and roles. Tasks 4–6 cover the agreed no-SVG cartotheque, rooms, equipment and SurrealDB binary files. Tasks 7–8 cover movement, repair, audit, write-off, notifications, analytics, metadata and documentation.
- **Intentional exception:** The approved requirements prohibit automated test coverage, overriding normal TDD. Every task uses type/build checks and exact manual acceptance scenarios.
- **Consistency:** The same record names, roles, file model and workflow transitions are used throughout. Binary data remains confined to file records.
