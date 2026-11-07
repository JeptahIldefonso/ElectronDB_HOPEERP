# Reset Password & Superadmin Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Forgot password?" link on the login page to "Reset password", migrate `/forgot-password` to an authentic `/reset-password` route, and build a functional Superadmin emergency password reset mechanism backed by server secret verification and database updates.

**Architecture:** A dedicated server action `resetSuperadminPasswordAction` validates the Superadmin email and compares the provided Master Recovery Key against `ADMIN_RECOVERY_KEY || AUTH_SECRET` in constant time (`crypto.timingSafeEqual`). Upon validation, it hashes the new password with bcrypt (10 rounds), updates the canonical `USERS` table, provisions a signed `hope_session` cookie, and logs the Superadmin directly into the ERP dashboard. The client page at `/reset-password` shares the design tokens, typography, and `TopographicCanvas` of `/login`, and `/forgot-password` issues a permanent redirect.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Node.js built-in `crypto`, `bcryptjs`, Tailwind CSS, Lucide icons.

**Spec:** Student Guide §3.1 & Figure 5 (Password Recovery & Administrator Security Controls).

---

## Global Constraints

- **Database Integrity:** Zero changes to `hope.db` schema or records (928 canonical records remain 100% untouched).
- **Password Length:** Minimum 8 characters enforced on server and client.
- **Fail-Closed Security:** Unmatched recovery keys, unconfigured server secrets, non-Superadmin emails, or passwords under 8 characters must fail closed with explicit errors.
- **Constant-Time Comparison:** Recovery keys must be compared using `crypto.timingSafeEqual` to prevent timing attacks.
- **Zero Plaintext Credentials:** Never print or log passwords, recovery keys, or password hashes.

## Review Focus

1. **Recovery Key Mismatch:** Submitting an invalid recovery key returns `"Invalid recovery key or server secret."` without revealing database state.
2. **Non-Superadmin Email Protection:** Entering a standard staff email returns `"Emergency reset is reserved for Superadmin accounts. Staff accounts are managed in User Management."`
3. **Password Validation:** New passwords with $<8$ characters or mismatching confirmation reject with clear validation messages.
4. **Session Establishment:** Successful reset updates `USERS.passwordHash` in `auth.db`, establishes `hope_session`, and redirects directly to `/`.
5. **Backwards Compatibility:** Navigating to old `/forgot-password` automatically redirects to `/reset-password`.

---

### Task 1: Create the Server-Side Reset Action

**Files:**
- Modify: `src/app/actions/auth.ts`
- Test: `scripts/test_reset_action.js`

- [ ] **Step 1: Write failing test script `scripts/test_reset_action.js`**
  Verify that:
  - Missing fields reject.
  - Passwords $<8$ characters reject.
  - Invalid recovery keys reject.
  - Valid recovery key updates password hash in `auth.db` for `ildefonsojeptahashleyr@gmail.com`.
- [ ] **Step 2: Implement `resetSuperadminPasswordAction` in `src/app/actions/auth.ts`**
  - Read `email`, `recoveryKey`, `newPassword`, `confirmPassword` from `FormData`.
  - Validate email and ensure target user has `role === 'Superadmin'`.
  - Validate recovery key against `process.env.ADMIN_RECOVERY_KEY || process.env.AUTH_SECRET` using `crypto.timingSafeEqual`.
  - Hash new password with `hashPassword(newPassword)` (bcrypt 10 rounds).
  - Update `USERS` row with new `passwordHash` and updated `stamp`.
  - Issue signed `hope_session` cookie via `signSession()`.
  - Redirect to `/`.
- [ ] **Step 3: Run the test script and verify pass**
  Ensure all validation branches and password update succeed.
- [ ] **Step 4: Clean up temporary test script**

---

### Task 2: Build `/reset-password` Page & Redirect `/forgot-password`

**Files:**
- Create: `src/app/reset-password/page.tsx`
- Create: `src/app/reset-password/layout.tsx`
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `src/app/login/page.tsx:249-257`

- [ ] **Step 1: Update Login page link**
  - In `src/app/login/page.tsx`:
    - Rename link text: `"Forgot password?"` $\rightarrow$ `"Reset password"`.
    - Change link target: `href="/forgot-password"` $\rightarrow$ `href="/reset-password"`.
- [ ] **Step 2: Create `src/app/reset-password/layout.tsx`**
  - Provide title `"Reset Password | ElectronDB ERP"`.
- [ ] **Step 3: Create `src/app/reset-password/page.tsx`**
  - Implement two modes/sections:
    - **Tab A: Superadmin Recovery (Active Form)**
      - Email input (`placeholder="ildefonsojeptahashleyr@gmail.com"`).
      - Master Recovery Key / Server Secret input (`type="password"` with show/hide toggle).
      - New Password input (`type="password"`, `minLength={8}`).
      - Confirm Password input (`type="password"`, `minLength={8}`).
      - Action button: `Reset Password & Sign In`.
      - Error and success alerts styled with design tokens.
    - **Tab B: Staff Account Notice**
      - Guidance for standard users: *"Staff accounts (User / Admin) are managed directly by administrators. Please contact your Superadmin or request a password reset via System $\rightarrow$ User Management."*
  - Topographic ambient background and Back to Sign In navigation matching `/login`.
- [ ] **Step 4: Update `src/app/forgot-password/page.tsx`**
  - Replace content with permanent client redirect to `/reset-password`.

---

### Task 3: Document Configuration in `.env.example`

**Files:**
- Modify: `.env.example`
- Modify: `docs/HOPE_ERP_SYSTEM_GUIDELINES.md`

- [ ] **Step 1: Add `ADMIN_RECOVERY_KEY` documentation to `.env.example`**
  - Note that `ADMIN_RECOVERY_KEY` defaults to `AUTH_SECRET` if omitted, allowing the Superadmin to reset their password using the server secret.
- [ ] **Step 2: Update `docs/HOPE_ERP_SYSTEM_GUIDELINES.md`**
  - Update Section 3.1 references from "Forgot Password Screen (`/forgot-password`)" to "Reset Password Screen (`/reset-password`)".

---

### Task 4: Verification & E2E Testing

**Files:**
- Verification: Browser at `http://localhost:3000/login` and `http://localhost:3000/reset-password`

- [ ] **Step 1: Type check and lint**
  - Run `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 2: Verify Login UI**
  - Confirm the link reads `"Reset password"` and routes to `/reset-password`.
- [ ] **Step 3: Test Superadmin password reset flow**
  - Submit the recovery form with invalid recovery key $\rightarrow$ verify error display.
  - Submit with passwords $<8$ chars or mismatch $\rightarrow$ verify error display.
  - Submit with valid recovery key $\rightarrow$ verify password updates, session establishes, and user lands on dashboard as Superadmin.
- [ ] **Step 4: Verify `hope.db` integrity**
  - Confirm canonical database remains exactly 928 records.
