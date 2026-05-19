# KPI System & Cross-Team Workflows — Plan

Goal: KPIs stop being manual numbers in a table. They are **computed automatically from real activity** in the system (tickets, clients, deals), and shown per department on the KPIs tab and on each staff member's dashboard. Some KPIs depend on more than one team working together, so we also wire up the **hand-off flows** between Support, Sales, Compliance, Onboarding, and Finance.

---

## 1. KPI definitions per department

All KPIs are computed for a selected period (default: current month) from existing tables.

### Support
Source: `tickets` table.
- **Tickets opened** — count where `created_at` in period.
- **Tickets closed** — count where `status in ('resolved','closed')` and `resolved_at` in period.
- **Open backlog** — tickets still `open` / `in_progress` / `waiting_on_client`.
- **Avg first-response time** — `first_response_at - created_at`.
- **Avg resolution time** — `resolved_at - created_at`.
- **SLA breaches** — tickets past `due_date` and not resolved.

### Sales
Source: `clients` + (new) `deals` activity.
- **New leads added** — clients created in period with `stage='Lead'`.
- **Leads contacted** — clients moved out of `Lead` in period.
- **Conversion to transacting customer** — % of leads that reach `stage='Active'` (transacting). This is the headline Sales KPI.
- **Active customers this month** — `stage='Active'` and `transaction_volume > 0`.
- **Revenue / volume** — sum of `transaction_volume` for converted customers.

### Compliance
Source: `clients` (KYC fields).
- **KYC submitted** — clients entering `KYC Submitted` in period.
- **KYC reviewed** — clients moved to `Verified` or rejected in period.
- **Avg KYC turnaround time** — time between `KYC Submitted` → `Verified`.
- **Pending KYC queue** — clients stuck in `KYC Review`.

### Onboarding
Source: `clients`.
- **Customers onboarded** — clients with `onboard_date` in period.
- **Avg time from Verified → Onboarded**.
- **Drop-offs** — clients verified > 14 days ago and not onboarded.

### Customer Success
Source: `clients` + `tickets`.
- **Active customers engaged** — clients with `last_contact_date` in period.
- **Follow-ups pending** — `follow_up_required = true`.
- **Churn risk** — Active customers with no contact > 30 days.

### Finance / Operations
Source: `clients`.
- **Total transaction volume** — sum across all Active customers.
- **Top 10 customers by volume**.
- **Volume growth** — vs previous period.

### HR
Manual KPIs (no transactional source yet) — keep current manual entry.

### Product / Dev
Source: `tickets` filtered to `category in ('bug','feature','engineering')` + Projects board.
- **Bugs opened / closed** in period.
- **Tasks moved to Done** on the project board.

---

## 2. Cross-team workflows (who hands off to whom)

```text
Lead (Sales)
   │  capture lead, qualify
   ▼
KYC Submitted (Sales → Compliance)
   │  Compliance reviews documents
   ▼
Verified (Compliance → Onboarding)
   │  Onboarding sets the customer live
   ▼
Onboarded → Active (Onboarding → Customer Success / Finance)
   │  CS monitors engagement, Finance tracks volume
   ▼
Support tickets can be raised at any stage (Support owns resolution,
may re-route to Compliance, Sales, or Product/Dev via ticket category).
```

Concretely this means:
- When **Sales** moves a client to `KYC Submitted`, it appears in **Compliance's queue** automatically.
- When **Compliance** marks `Verified`, it appears in **Onboarding's queue**.
- A **Support ticket** tagged `kyc` is visible to Compliance; tagged `billing` to Finance; tagged `bug` to Product/Dev — they can comment/resolve in their own tab without leaving their module.

No new tables needed — these are filtered views over `clients` and `tickets`.

---

## 3. What gets built

1. **`kpi_metrics` SQL view (or RPC functions)** — one function per department that returns the numbers above for a given date range. Computed live from `tickets` and `clients`. No more manual KPI entry for the data-driven ones.
2. **Refactor `KpisModule.tsx`** — switch from the manual `kpi_targets` table to calling these RPCs. Show big stat cards per department, with period selector (This month / Last month / Quarter / Custom).
3. **Per-staff dashboard widgets** — on login, staff see their department's top 3 KPIs as cards above their main tab.
4. **Department queues** — small "Needs your attention" panel on each module:
   - Compliance tab: clients in `KYC Submitted`
   - Onboarding tab: clients `Verified` but not onboarded
   - CS tab: customers with no contact > 30 days
   - Sales tab: leads not contacted in 7 days
5. **Ticket category routing** — when a ticket has category `kyc`, `billing`, `bug`, it shows in the relevant department's ticket view in addition to Support.
6. **Stage history tracking** — add a tiny `client_stage_history` table (client_id, from_stage, to_stage, changed_at, changed_by) so we can compute "avg KYC turnaround" and "time from Verified → Onboarded". Filled by a trigger on `clients.stage` change.
7. **Keep manual KPI entry** only for HR and any custom target a manager wants to track alongside the auto ones.

---

## 4. Technical notes

- New table: `client_stage_history` (client_id, from_stage, to_stage, changed_at, changed_by uuid). Trigger `clients_stage_history_trg` on `UPDATE OF stage`.
- New RPCs (SECURITY DEFINER, search_path=public):
  - `kpi_support(p_from, p_to)`
  - `kpi_sales(p_from, p_to)`
  - `kpi_compliance(p_from, p_to)`
  - `kpi_onboarding(p_from, p_to)`
  - `kpi_cs(p_from, p_to)`
  - `kpi_finance(p_from, p_to)`
  - `kpi_product(p_from, p_to)`
  - Each returns a JSON object with the named metrics above.
- RLS: RPCs gated by `is_user_active(auth.uid())`; staff only see their own department's RPC results from the UI.
- Frontend: new `src/components/kpis/` cards per department; `useKpis(department, range)` hook.

---

## 5. Confirm before I build

1. Headline Sales KPI = **% of leads that reach `stage='Active'`** in the period. OK?
2. Treat `stage='Active' AND transaction_volume > 0` as "transacting customer". OK?
3. Default KPI period = **current calendar month**, with selector for Last month / Quarter / Custom. OK?
4. Keep manual KPI entry for HR only, drop it everywhere else. OK?

Say "go with defaults" and I'll implement sections 1–3.
