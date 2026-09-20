# Passbook — Group Save Ledger

A cooperative savings ledger admin app: manage members, record deposits/withdrawals,
open fixed deposits, issue and collect loans, and track interest — all from one
admin login.

This is a **plain Vite + React SPA** (no SSR framework), connected to the
[`group-save-ledger-backend`](../finance-backend) Express + MongoDB API.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (custom "warm paper ledger" design system in `src/styles.css`)
- React Router v7 (client-side routing)
- TanStack Query (data fetching / cache invalidation)

## Connecting to the backend

1. Run `group-save-ledger-backend` (see its own README) — by default it listens on
   `http://localhost:8000`.
2. `cp .env.example .env` here and set `VITE_API_BASE_URL` if your backend isn't at
   the default `http://localhost:8000/api/v1`.
3. `npm install && npm run dev`.

**Auth works via httpOnly cookies**, not a token you'll see in the browser — `src/api.ts`
sends every request with `credentials: "include"` so the cookies the backend sets on
login are attached automatically. If a request comes back with an expired access
token, `api.ts` silently calls `POST /auth/refresh-token` once and retries — you won't
get logged out just because 15 minutes passed.

**You need a verified admin account to log in.** The backend has no signup page in
this frontend on purpose (per the original spec: login only, no signup/forgot-password
UI) — create your first admin either by:

- Calling `POST /auth/register` directly (e.g. with curl or Postman) and clicking the
  verification link emailed to you, or
- Running the backend's `npm run seed:admin -- --name "Admin" --email you@example.com --password "..."`
  for an instantly-usable, pre-verified account (useful before email/Resend is configured).

## Structure

```
src/
  api.ts                    <- single data layer: real fetch() calls to the backend, typed request/response shapes
  main.tsx                   <- app entry: providers (QueryClient, Auth, Router)
  App.tsx                     <- route table
  styles.css                   <- design tokens + Tailwind
  lib/
    auth.tsx                   <- auth context: session-restore via GET /auth/me, sign in/out
  components/
    Layout.tsx                  <- sidebar + top bar + auth guard, wraps protected pages
    ConfirmDialog.tsx             <- reusable delete-confirmation modal
  pages/
    Login.tsx                     <- email/password sign-in (no signup, no forgot password UI)
    Dashboard.tsx                  <- saving/deposit/withdrawal/interest/loan/EMI totals, today's activity
    AddFinance.tsx                  <- record a deposit, withdrawal, or interest credit for a member
    Members.tsx                      <- list/add/edit/delete members, saving/FD/loan summary per row
    MemberDetail.tsx                  <- one member's full picture: saving, fixed deposits, loans, recent activity
    FixedDeposits.tsx                  <- open fixed deposits, pay out interest, release matured principal
    Loans.tsx                           <- issue loans with live EMI preview
    LoanDetail.tsx                       <- record EMI payments, view payment history
    Transactions.tsx                      <- full transaction history with filters, pagination, delete
```

## How the money model works

- Every member has one liquid **saving balance** — every deposit/withdrawal touches
  only this. It compounds interest quarterly, automatically, on the backend.
- **Fixed deposits** are separate, locked-term accounts opened explicitly (never
  created by a regular deposit). Principal can't be withdrawn before maturity — only
  its accrued interest can be paid out early, which credits it to the saving balance.
- **Loans** are independent of member saving/FD accounts (though optionally linkable
  to a member). EMI is auto-calculated; each payment splits into interest/principal.
- All balances are fungible once they land in saving — the app doesn't try to track
  "this rupee came from FD interest" separately from "this rupee was a deposit."

## Getting started

```bash
npm install
npm run dev
```
