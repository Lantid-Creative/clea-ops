# Clea Ops — Team, Roles & User Flows

## 1. Role model

Three roles (already in DB):

- **Admin** — full access to everything, manages users, departments, and settings.
- **Manager** — read access to all modules; edit access only within their own department.
- **Staff** — read-only access, and only to the modules mapped to their department.

Plus a **department** assignment per user (set by admin):
`Support`, `Onboarding`, `Sales`, `Compliance`, `Finance`, `HR`, `Product/Dev`, `Leadership`.

## 2. Who is who (current users)

**Admins** (full access):
- damilola@tryclea.com
- domotola@tryclea.com
- sidneyegwuatu@tryclea.com
- iyiolaosuagwu@tryclea.com
- compliance@tryclea.com
- sheriff@tryclea.com

**Staff/Manager (to be assigned a department by an admin):**
- Support & Onboarding: titofunmi (fadeleoluwatofunmi), yinkaaremu, olubusayo, omotolani, omotoshookiki, goodnessayomide
- Sales: mabinuori (not yet created — flag), akinwaopeyemi, kemiadedoyin, sholaazeez, collinsonwurah
- Compliance: kazir.arowona, yusufisa, yusuf, ishakuibrahim
- Finance/Ops: tairatoyadiran, okmabs, emmanuel

Admins promote anyone to **Manager** for their department via Admin → Members.

## 3. Module visibility matrix

| Module | Admin | Manager | Staff (matching dept) | Staff (other dept) |
|---|---|---|---|---|
| Dashboard / KPIs | full | read all | read own dept KPIs | hidden |
| Clients (customers) | full | read all, edit own dept | read only | hidden unless Support/Onboarding/Sales |
| Tickets | full | read all, edit own dept | read + comment on own dept tickets | hidden unless Support |
| Projects | full | read all, edit own dept | read own dept | hidden unless Product/Dev |
| Sales pipeline | full | read all, edit own dept | read own dept | hidden unless Sales |
| HR | full | HR manager edits | HR staff read | hidden |
| Admin (users, roles, audit) | full | hidden | hidden | hidden |
| Submit Ticket (public portal) | — | — | — | public, anyone |

Enforced two ways:
- **UI**: sidebar hides modules the user can't access; edit buttons disabled for read-only.
- **DB (RLS)**: existing `has_role`, `is_user_active`, `can_edit_*` functions already gate writes. We'll extend with `can_view_module(user, module)` for stricter reads where needed.

## 4. Core user flows

### A. Admin onboarding a new teammate
1. Admin → **Admin → Members → New user**
2. Enters `name@tryclea.com`, picks role + department.
3. System creates account + random password, shows copy-to-clipboard credentials.
4. Admin shares creds securely; user logs in, prompted to change password.

### B. Staff daily flow (example: Support)
1. Logs in → lands on Dashboard scoped to Support KPIs.
2. Sees **Tickets** tab → list filtered to Support category.
3. Opens ticket → adds internal comment, changes status, attaches file.
4. Cannot see Sales, HR, Admin tabs.

### C. Manager flow (example: Sales Manager)
1. Sees all modules read-only **except** Sales + Clients where they can edit.
2. Can bulk-import customers, reassign agents within Sales.
3. Cannot create users or change roles.

### D. Customer / external flow
1. External user visits `/submit-ticket` (public).
2. Fills form → ticket created with `source=portal`, status `open`.
3. Routed by category to the right department's queue.

### E. Bulk customer import (already built)
- Admin or Sales/Support manager → Clients → **Bulk import** → CSV/Excel → upsert by email → summary dialog.

### F. Password reset
- Login page → "Forgot password" → email link → `/reset-password` → set new password.

## 5. What we'll build to deliver this plan

1. **Department + role enforcement in sidebar** (`AppShell.tsx`): hide modules per matrix above.
2. **Per-module read guards**: redirect / show "no access" card if a staff opens a module not mapped to their department.
3. **Admin → Members UI upgrades**:
   - Assign department dropdown
   - Promote to Manager / demote
   - Deactivate user (sets `is_active=false`)
   - Resend / reset password
4. **First-login password change** prompt.
5. **Audit log view** in Admin (table already exists) — show recent user/role/ticket changes.
6. **Department-scoped dashboards**: KPIs filter by user's department for staff.

## 6. Open questions before we build

1. Should **Managers** be able to create users in their own department, or admin-only? (default: admin-only)
2. For staff in **Compliance**, should they see Clients (KYC) read-only? (default: yes)
3. Do we want a "Leadership" view that sees everything read-only (like Manager but cross-dept)? (default: yes, add `leadership` role)
4. Confirm department list above — add/remove any?

Once you confirm 1–4 (or say "go with defaults"), I'll implement section 5 step by step, starting with the sidebar + access guards.
