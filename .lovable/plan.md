# Clea Ops — Role-Based Operational Workflow

Goal: turn the platform from a "shared dashboard" into a permission-aware operations system where every team only sees what's theirs, work items are assignable and trackable end-to-end, and admins/super-admins oversee everything.

Clea is a cross-border payments product (African importers paying foreign vendors in FX). The teams below are tailored to that operation.

---

## 1. Teams (departments) and what they own

| Team | Owns | Typical work items |
|---|---|---|
| **Sales / BD** | Leads, deals, acquisition | Lead → KYC handoff, deal pipeline |
| **Compliance** | KYC/AML review, sanctions, risk | KYC reviews, risk flags, re-KYC |
| **Onboarding** | Activating verified customers | Account setup, welcome, first transfer |
| **Payments Ops / Treasury** | FX execution, payouts, reconciliation | Payment exceptions, FX pricing, settlement |
| **Customer Success** | Retention, follow-ups, account health | Churn risk, follow-ups, engagement |
| **Support** | All customer-reported issues (portal + in-app) | Tickets, escalations |
| **Product / Dev** | Bugs, features, engineering tasks | Engineering tickets, project board |
| **Finance** | Revenue, volumes, fees, reporting | Read-heavy: KPIs, top customers |
| **HR** | People ops, leave, onboarding tasks | HR directory, leave requests |
| **Admin / Super Admin** | Cross-team oversight, user mgmt | Everything |

Roles per team stay: `staff` (own dept), `manager` (own dept edit + read all), `admin` (everything), plus a new `super_admin` (admin + manages other admins + full audit).

---

## 2. Unified "Work Item" model

Work is split today across `clients`, `tickets`, `project_tasks` — each with its own assignment logic. We keep those tables (domain data) but add one consistent layer:

- Every work item gets: `assigned_team` (department), `assignee_id` (user, optional), `status`, `priority`, `due_date`, `resolved_at`, `resolution_note`.
- Normalized statuses: **Open → In Progress → Waiting → Resolved → Closed** (+ Reopened).
- Add `assigned_team` to `clients` and `project_tasks` (tickets already route by category).
- New `work_assignments` table logs every (re)assignment: actor, from, to, timestamp, note — full handoff history.

---

## 3. Workflow lifecycle (tickets, KYC reviews, payment exceptions, project tasks)

```text
                Created
                   │
                   ▼
           Assigned to team ──► team's "My Queue"
                   │
                   ▼
          Picked up by member ──► assignee_id set, In Progress
                   │
                   ├── needs another team? → Reassign (logged) ──► new team's queue
                   ├── waiting on customer? → Waiting
                   ▼
              Resolved (with note) ──► resolved_at, resolver_id stamped
                   │
                   ▼
                Closed
                   │
        (reopen anytime → Open, kept in history)
```

Every transition writes to an `activity_log` so admins can audit.

---

## 4. What each role sees on login

- **Staff**: only their team's tabs + a personal "My Work" dashboard showing items assigned **to them** or **to their team and unassigned**.
- **Manager**: their team's full queue + read-only view of other teams + team KPIs.
- **Admin**: all teams, all queues, user management, audit log.
- **Super Admin**: everything Admin + manage other admins + system settings + audit export.

New **"My Work"** landing page (replaces the generic Index for staff/manager) with three sections:
1. Assigned to me (across tickets, KYC, payment exceptions, tasks)
2. My team's open queue (unassigned)
3. My team's KPIs (this week)

---

## 5. New / changed pages

| Page | Purpose | Who sees it |
|---|---|---|
| **My Work** (new home) | Personal + team queue across all item types | Everyone |
| **Team Queues** (new) | Per-team filterable queue (Compliance, Payments Ops, Support, Dev…) | That team + managers + admin |
| **Payment Exceptions** (new module) | Failed/stuck transfers, FX issues — assigned to Payments Ops | Payments Ops, Admin |
| **Audit Log** (new, admin-only) | Every assignment, status change, role change, deletion | Admin / Super Admin |
| **User Management** (extend Admin) | Assign team + role on invite, deactivate, reset password, view activity | Admin / Super Admin |
| Existing: Customers, Tickets, Sales, Projects, KPIs, HR | Keep — gain the new assignment + status fields | Per current role map |

---

## 6. Permissions matrix

| Action | Staff (own) | Mgr (own) | Mgr (other) | Admin | Super Admin |
|---|---|---|---|---|---|
| View own dept items | ✅ | ✅ | 👁 read | ✅ | ✅ |
| Edit / resolve items | ✅ | ✅ | ❌ | ✅ | ✅ |
| Reassign across teams | ❌ | ✅ | ❌ | ✅ | ✅ |
| Create users / set roles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage other admins | ❌ | ❌ | ❌ | ❌ | ✅ |
| View audit log | ❌ | own team | ❌ | ✅ | ✅ |
| Delete records | ❌ | ❌ | ❌ | ✅ | ✅ |

Compliance stays read-only on customer profiles (their write surface is KYC items) — same as today, just formalized.

---

## 7. Technical changes (for the technically curious)

- **New role**: add `super_admin` to `app_role` enum; existing `admin` keeps current power, super admin gains admin-of-admins management.
- **Schema additions**:
  - `clients.assigned_team app_department`, `project_tasks.assigned_team app_department`
  - `payment_exceptions` (id, client_id, type, amount, currency, status, assigned_team, assignee_id, resolution_note, timestamps)
  - `work_assignments` (item_type, item_id, from_assignee, to_assignee, from_team, to_team, actor_id, note, created_at)
  - `activity_log` (item_type, item_id, actor_id, action, from_value, to_value, created_at)
- **RLS**: per-team SELECT/UPDATE policies using existing `get_user_department()` + `has_role()`; super_admin via new `has_role(uid,'super_admin')`.
- **Frontend**: `useMyWork()` hook aggregating items across tables; reusable `<TeamQueue type="..." />` component.
- **Triggers**: assignment + status changes auto-write to `work_assignments` / `activity_log`.

---

## 8. Rollout phases

1. **Foundation** — `super_admin` role, `assigned_team` columns, `work_assignments` + `activity_log`, RLS updates.
2. **My Work + Team Queues** — new landing page, queue component, wire into tickets/KYC/projects.
3. **Payment Exceptions module** — new table + UI for Payments Ops.
4. **Audit Log + Super Admin** — admin-only audit viewer, super-admin management page.
5. **Polish** — assignment notifications, due-date reminders, SLA badges.

---

## 9. Confirm before I build

1. Team list above (Sales, Compliance, Onboarding, Payments Ops, CS, Support, Product/Dev, Finance, HR) — anything to add or remove?
2. Add **Super Admin** as a distinct role above Admin? (Or keep just Admin.)
3. Add the new **Payment Exceptions** module? (Core to Clea's FX/payouts ops.)
4. Build all 5 phases at once, or start with Phase 1 + 2 only and review before continuing?

Reply with answers (or "go with defaults" = yes to all, all 5 phases) and I'll start.
