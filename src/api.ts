/**
 * ---------------------------------------------------------------------------
 * SINGLE API LAYER — connected to group-save-ledger-backend
 * ---------------------------------------------------------------------------
 * Every network call in the app goes through this file. Point it at your
 * backend with VITE_API_BASE_URL (defaults to http://localhost:8000/api/v1).
 *
 * Auth: the backend issues httpOnly cookies (accessToken/refreshToken), so
 * every request is sent with credentials: "include" and the browser handles
 * attaching them automatically — there's no bearer token for this file to
 * manage. If a request comes back 401 (expired access token), request()
 * silently tries POST /auth/refresh-token once and retries the original
 * call before giving up, so a 15-minute access-token expiry never
 * interrupts a logged-in admin's day.
 */

const API_BASE = import.meta.env["VITE_API_BASE_URL"] ?? "http://localhost:8000/api/v1";

/* ===========================================================================
 * TYPES
 * ========================================================================= */

export type TransactionType = "deposit" | "withdraw" | "interest";
export type LoanStatus = "active" | "closed";
export type FixedDepositStatus = "active" | "matured" | "closed";

export interface Member {
  id: string;
  membershipNo: string;
  name: string;
  address: string;
  phone: string;
  /** Liquid, withdrawable balance — a cached sum of every active saving deposit lot. */
  savingBalance: number;
  /**
   * The rate NEW deposits will lock in. Changing this never touches money
   * already deposited — each existing saving deposit lot keeps the rate it
   * was created with, forever, like its own small fixed deposit.
   */
  savingInterestRate: number;
  /** How many active saving deposit lots this member has. */
  savingLotCount: number;
  /** ISO timestamp of the soonest any lot is next due to compound, or null if there are no active lots. */
  nextSavingCompoundDate: string | null;
  /** Today's interest accrued since each lot's own last compounding, summed — for "balance is growing" display. */
  projectedSavingInterest: number;
  /** Cumulative interest ever credited — quarterly compounding across all lots plus any fixed-deposit interest paid in. */
  totalSavingInterestEarned: number;
  /** Rolled-up totals across this member's active fixed deposits. */
  fixedDepositCount: number;
  fixedDepositPrincipalTotal: number;
  /** Accrued-but-unpaid interest across active fixed deposits. */
  fixedDepositAccruedInterest: number;
  /** Sum of outstanding principal on this member's active loans. */
  loanOutstandingTotal: number;
}

/** A single saving deposit — its own amount, locked rate, and compounding clock. */
export interface SavingDeposit {
  id: string;
  memberId: string;
  /** Remaining amount in this lot (shrinks as withdrawals draw from it, grows via compounding). */
  principal: number;
  /** What was originally deposited — never changes. */
  originalAmount: number;
  /** Locked forever at whatever the member's rate was on depositDate. */
  rate: number;
  /** ISO date "YYYY-MM-DD" */
  depositDate: string;
  /** ISO timestamp — interest is capitalized into principal up through this date. */
  lastCompoundDate: string;
  status: "active" | "depleted";
  /** Interest earned since lastCompoundDate, not yet capitalized. */
  accruedInterestSinceLastCompound: number;
}

export interface Transaction {
  id: string;
  memberId: string;
  /** Denormalized for table display. */
  memberName: string;
  type: TransactionType;
  amount: number;
  /** ISO date string: "2026-09-13" */
  date: string;
  /** ISO timestamp of when the entry was recorded. */
  createdAt: string;
  remarks?: string;
}

export interface FixedDeposit {
  id: string;
  memberId: string;
  memberName: string;
  principal: number;
  /** Annual interest rate, in percent — simple (non-compounding). */
  interestRate: number;
  termMonths: number;
  /** ISO date "YYYY-MM-DD" */
  startDate: string;
  /** ISO date "YYYY-MM-DD" — the principal is locked until this date. */
  maturityDate: string;
  status: FixedDepositStatus;
  fundedFromSaving: boolean;
  totalInterestPaid: number;
  /** Interest earned since opening or last payout, not yet paid out. */
  accruedInterestAvailable: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface DashboardStats {
  totalSavingBalance: number;
  memberCount: number;
  todaysDeposits: number;
  todaysDepositCount: number;
  todaysWithdrawals: number;
  todaysWithdrawalCount: number;
  todaysInterestCredited: number;
  todaysInterestCount: number;
  totalFixedDepositPrincipal: number;
  activeFixedDepositCount: number;
  totalLoanOutstanding: number;
  activeLoanCount: number;
  todaysEmiCollected: number;
  todaysEmiCount: number;
}

export interface Loan {
  id: string;
  loanNumber: string;
  borrowerName: string;
  phone: string;
  memberId?: string;
  principal: number;
  /** Annual interest rate, in percent. */
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  /** ISO date "YYYY-MM-DD" */
  startDate: string;
  outstandingPrincipal: number;
  status: LoanStatus;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  amount: number;
  interestComponent: number;
  principalComponent: number;
  outstandingAfter: number;
  notes?: string;
}

/* ===========================================================================
 * LOW-LEVEL REQUEST HELPER
 * ========================================================================= */

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors?: string[];
}

let refreshInFlight: Promise<boolean> | null = null;

function attemptRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  // Transparent silent-refresh-and-retry for an expired access token, so a
  // logged-in admin is never bounced to /login just because 15 minutes passed.
  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/refresh-token");
  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    const refreshed = await attemptRefresh();
    if (refreshed) return request<T>(path, init, true);
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    throw new Error(body?.message || res.statusText || "Request failed");
  }
  return (body as ApiEnvelope<T>).data;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

/** Builds a query string from an object, skipping undefined/empty values. */
function qs(params: object): string {
  const entries = Object.entries(params as Record<string, string | number | undefined>).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
  );
}

/* ===========================================================================
 * AUTH — session lives in httpOnly cookies; we only cache the user object
 * locally (for instant UI) and confirm the real session via GET /auth/me.
 * ========================================================================= */

const USER_CACHE_KEY = "passbook.user";

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_CACHE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

function cacheUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_CACHE_KEY);
}

/** POST /auth/login — sets httpOnly cookies; returns the logged-in admin. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await post<{ user: AuthUser; accessToken: string }>("/auth/login", {
    email,
    password,
  });
  cacheUser(data.user);
  return data.user;
}

/** POST /auth/logout — clears cookies server-side. */
export async function logout(): Promise<void> {
  try {
    await post("/auth/logout");
  } finally {
    cacheUser(null);
  }
}

/** GET /auth/me — confirms whether the current cookie session is still valid. */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const user = await get<AuthUser>("/auth/me");
  cacheUser(user);
  return user;
}

/** PATCH /auth/change-password */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await request("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

/* ===========================================================================
 * MEMBERS
 * ========================================================================= */

export async function getMembers(): Promise<Member[]> {
  return get<Member[]>("/members");
}

export async function getMemberById(id: string): Promise<Member> {
  return get<Member>(`/members/${id}`);
}

export interface NewMember {
  membershipNo: string;
  name: string;
  address: string;
  phone: string;
  savingInterestRate: number;
}

export async function addMember(data: NewMember): Promise<Member> {
  return post<Member>("/members", data);
}

export async function updateMember(id: string, data: NewMember): Promise<Member> {
  return put<Member>(`/members/${id}`, data);
}

export async function deleteMember(id: string): Promise<{ success: true }> {
  return del<{ success: true }>(`/members/${id}`);
}

/**
 * Shows what "Compound now" would credit right now, across every active
 * saving deposit lot for this member, without changing anything.
 */
export async function previewMemberCompound(
  memberId: string,
): Promise<{ amountDue: number; lotsDue: number; lotsTotal: number }> {
  return get(`/members/${memberId}/compound-preview`);
}

/**
 * Manually runs quarterly compounding right now for this member's saving
 * lots — each lot is credited at its own locked rate, and a lot that
 * isn't due yet is correctly skipped, so this can never double-credit a
 * period. For ad-hoc use; routine compounding otherwise runs nightly.
 */
export async function compoundMemberSaving(
  memberId: string,
): Promise<{ lotsUpdated: number; totalInterestPosted: number; newSavingBalance: number }> {
  return post(`/members/${memberId}/compound-saving`);
}

/** GET /saving-deposits?memberId=&status= */
export async function getSavingDeposits(
  memberId?: string,
  status?: "active" | "depleted",
): Promise<SavingDeposit[]> {
  return get<SavingDeposit[]>(`/saving-deposits${qs({ memberId, status })}`);
}

/* ===========================================================================
 * DASHBOARD
 * ========================================================================= */

export async function getDashboardStats(): Promise<DashboardStats> {
  return get<DashboardStats>("/dashboard/stats");
}

/* ===========================================================================
 * TRANSACTIONS
 * ========================================================================= */

export async function getTodaysTransactions(): Promise<Transaction[]> {
  return get<Transaction[]>("/transactions/today");
}

export interface TransactionFilters {
  memberId?: string;
  /** ISO date "YYYY-MM-DD" */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionPage {
  items: Array<Transaction & { runningBalance: number }>;
  total: number;
  page: number;
  pageSize: number;
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionPage> {
  return get<TransactionPage>(`/transactions${qs(filters)}`);
}

export interface NewTransaction {
  memberId: string;
  type: TransactionType;
  amount: number;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  remarks?: string;
}

export async function addTransaction(data: NewTransaction): Promise<Transaction> {
  return post<Transaction>("/transactions", data);
}

export async function deleteTransaction(id: string): Promise<{ success: true }> {
  return del<{ success: true }>(`/transactions/${id}`);
}

/* ===========================================================================
 * FIXED DEPOSITS
 * ========================================================================= */

export async function getFixedDeposits(memberId?: string): Promise<FixedDeposit[]> {
  return get<FixedDeposit[]>(`/fixed-deposits${qs({ memberId })}`);
}

export async function getFixedDepositById(id: string): Promise<FixedDeposit> {
  return get<FixedDeposit>(`/fixed-deposits/${id}`);
}

export interface NewFixedDeposit {
  memberId: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate?: string;
  /** If true, principal is deducted from the member's saving balance instead of treated as fresh cash. */
  fundFromSaving?: boolean;
}

export async function addFixedDeposit(data: NewFixedDeposit): Promise<FixedDeposit> {
  return post<FixedDeposit>("/fixed-deposits", data);
}

export async function payFixedDepositInterest(
  id: string,
  amount?: number,
): Promise<{ fixedDeposit: FixedDeposit; amountPaid: number; newSavingBalance: number }> {
  return post(`/fixed-deposits/${id}/pay-interest`, amount === undefined ? {} : { amount });
}

export async function withdrawFixedDepositPrincipal(
  id: string,
): Promise<{ fixedDeposit: FixedDeposit; creditedToSaving: number; newSavingBalance: number }> {
  return post(`/fixed-deposits/${id}/withdraw-principal`);
}

export async function deleteFixedDeposit(id: string): Promise<{ success: true }> {
  return del<{ success: true }>(`/fixed-deposits/${id}`);
}

/* ===========================================================================
 * INTEREST — quarterly saving compounding runs automatically on the backend
 * (daily cron); this lets you trigger it manually too, e.g. for testing.
 * ========================================================================= */

export async function runSavingCompounding(): Promise<{
  membersUpdated: number;
  totalInterestPosted: number;
}> {
  return post("/interest/run-compounding");
}

/* ===========================================================================
 * LOANS
 * ========================================================================= */

export async function getLoans(memberId?: string): Promise<Loan[]> {
  return get<Loan[]>(`/loans${qs({ memberId })}`);
}

export async function getLoanById(id: string): Promise<{ loan: Loan; payments: LoanPayment[] }> {
  return get(`/loans/${id}`);
}

export interface NewLoan {
  loanNumber: string;
  /** Loans can only be issued to an existing member — borrower name/phone are taken from their record. */
  memberId: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  startDate?: string;
  /** Overrides the auto-calculated EMI, if provided. */
  emiAmount?: number;
}

export async function addLoan(data: NewLoan): Promise<Loan> {
  return post<Loan>("/loans", data);
}

export async function deleteLoan(id: string): Promise<{ success: true }> {
  return del<{ success: true }>(`/loans/${id}`);
}

export interface NewLoanPayment {
  amount: number;
  /** ISO date "YYYY-MM-DD" */
  date?: string;
  notes?: string;
}

export async function addLoanPayment(loanId: string, data: NewLoanPayment): Promise<LoanPayment> {
  return post<LoanPayment>(`/loans/${loanId}/payments`, data);
}

export async function deleteLoanPayment(
  loanId: string,
  paymentId: string,
): Promise<{ success: true }> {
  return del<{ success: true }>(`/loans/${loanId}/payments/${paymentId}`);
}

/* ===========================================================================
 * SHARED HELPERS
 * ========================================================================= */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Standard reducing-balance EMI formula (same one the backend uses):
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * where r is the monthly rate (annual % / 12 / 100). Falls back to an even
 * split across the tenure if the rate is 0. Used for live-previewing the
 * EMI as the admin fills out the "New loan" form, before submitting.
 */
export function calculateEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (!principal || !tenureMonths) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100) / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.round(((principal * monthlyRate * factor) / (factor - 1)) * 100) / 100;
}

/* ===========================================================================
 * FORMATTING HELPERS
 * ========================================================================= */

export function formatRs(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(amount))}`;
}

export function formatSigned(type: TransactionType, amount: number): string {
  return `${type === "withdraw" ? "\u2212" : "+"}${formatRs(amount)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
