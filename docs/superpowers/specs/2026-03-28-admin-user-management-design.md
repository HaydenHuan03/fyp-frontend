# Admin User Management Dashboard — Design Spec

**Date:** 2026-03-28
**Project:** FinGuardMY
**Scope:** Admin shell with persistent sidebar + User Management section

---

## 1. Overview

Replace the placeholder `AdminDashboard.tsx` with a fully functional admin shell. The shell provides persistent sidebar navigation for all admin sections (Users, Knowledge Base, Documents). This spec covers the **User Management** section only; the other sections are stubs.

The UI supports **dark and light themes**, switchable by the user via a toggle in the sidebar. Dark mode is the default.

---

## 2. Layout & Shell

**Structure:** Two-column layout — fixed sidebar (220px) + scrollable main content area.

**Sidebar contains:**
- FinGuardMY logo + wordmark
- Section group label: "Management"
- Nav items: Users (active), Knowledge Base (stub), Documents (stub)
- Bottom: logged-in user email, theme toggle (dark/light), Logout button

**Main area contains:**
- Page heading + subheading
- Stats row (3 cards: Total Users, Active, Suspended)
- Search/filter bar
- User table
- Floating "+ Add User" button (top-right of heading row)

**Theme:** CSS custom properties on `:root` and `[data-theme="light"]`. Dark is default. Toggle persists to `localStorage`.

**Routing:** Replaces `/admin/dashboard` — no new routes needed. Sub-sections (Knowledge Base, Documents) will get their own routes later; for now they show a "Coming soon" placeholder when clicked.

---

## 3. User Table

**Columns:** Full Name | Email | Role | Status | Department | Registered | Last Login | Actions

**Role badges (pill):** Admin (indigo), Investigator (purple)
**Status badges (pill):** Active (green), Suspended (red)

**Actions column:** Single "Actions ▾" button per row. Clicking opens a contextual dropdown menu with text-only items (no icons):
- Edit Details
- Reset Password
- Suspend Account *(shows "Activate Account" if user is suspended)*
- Delete User

**Search:** Filter by name or email (client-side, debounced).

**Empty state:** Shown when no users exist or search returns no results.

**Loading state:** Skeleton rows while fetching.

---

## 4. Modals

### 4a. Create / Edit User
Shared modal — Edit mode pre-fills all fields and hides the Password field.

**Fields:**
| Field | Type | Notes |
|---|---|---|
| Full Name | text | required |
| Email | email | required |
| Password | password | Create mode only |
| Role | select | Admin / Investigator |
| Department / Unit | text | required |

**Submit:** "Create User" / "Save Changes". Closes on success; shows error inline on failure.

### 4b. Reset Password
**Fields:** New Password, Confirm Password (both required, must match).
**Submit:** "Reset Password".

### 4c. Suspend / Activate Confirmation
Copy and button colour swap based on current status:
- **Suspend:** amber warning box, amber "Suspend" button
- **Activate:** green info box, green "Activate" button

### 4d. Delete Confirmation
Red warning box stating data is permanently removed. Red "Delete" button.

**All modals:** Close on Cancel or backdrop click. Show a toast notification (success or error) after the action resolves.

---

## 5. API Integration

All calls go through `src/lib/api.ts`. The FastAPI backend base URL is `VITE_API_URL` (default `http://localhost:8000`). Authenticated requests send the JWT `accessToken` as `Authorization: Bearer <token>`.

| Operation | Method | Endpoint |
|---|---|---|
| List users | GET | `/users` |
| Create user | POST | `/users` |
| Edit user | PATCH | `/users/{id}` |
| Delete user | DELETE | `/users/{id}` |
| Reset password | POST | `/users/{id}/reset-password` |
| Suspend user | PATCH | `/users/{id}` (status: suspended) |
| Activate user | PATCH | `/users/{id}` (status: active) |

*Endpoints are assumed based on FastAPI REST conventions — adjust if backend differs.*

---

## 6. File Structure

```
src/
  pages/
    admin/
      AdminDashboard.tsx        ← shell + routing between sections
      UserManagement.tsx        ← user table + search + stat cards
  components/
    admin/
      AdminSidebar.tsx          ← sidebar nav + theme toggle + logout
      UserTable.tsx             ← table with Actions dropdown
      UserModal.tsx             ← create/edit modal
      ResetPasswordModal.tsx    ← reset password modal
      ConfirmModal.tsx          ← reusable suspend/activate/delete confirmation
  lib/
    api.ts                      ← add user management API functions
  context/
    ThemeContext.tsx             ← dark/light theme state + localStorage persistence; mounted in App.tsx wrapping all routes so data-theme is set on <html>
  index.css                     ← add .adm-* CSS classes for admin shell styles
```

---

## 7. Styling

Follow the existing hybrid pattern: custom CSS classes prefixed `.adm-*` in `index.css` (or a co-located `admin.css`). Tailwind utility classes are fine for one-off spacing.

**Dark mode palette:**
- Sidebar bg: `#0f1629`
- Main bg: `#161b27`
- Card/table bg: `#1e2535`
- Border: `#2d3748`
- Text primary: `#f1f5f9`
- Text muted: `#64748b`
- Accent: `#4B55EA`

**Light mode palette:**
- Sidebar bg: `#1e2235` (stays dark — sidebar is always dark for contrast)
- Main bg: `#f8fafc`
- Card/table bg: `#ffffff`
- Border: `#e2e8f0`
- Text primary: `#0f172a`
- Text muted: `#64748b`
- Accent: `#4B55EA`

---

## 8. Out of Scope

- Knowledge Base and Documents sections (stubs only)
- Pagination (can be added later; initial build uses full list)
- Role-based field restrictions beyond Admin/Investigator
- Audit log / activity history
