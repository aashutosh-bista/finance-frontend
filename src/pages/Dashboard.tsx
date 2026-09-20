import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  formatDate,
  formatRs,
  formatSigned,
  formatTime,
  getDashboardStats,
  getTodaysTransactions,
  todayISO,
} from "../api";

export function DashboardPage() {
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const todays = useQuery({ queryKey: ["todays-transactions"], queryFn: getTodaysTransactions });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rise px-4 pt-5 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              Passbook · Today
            </p>
            <h1 className="font-display text-[26px] font-black leading-none tracking-tight text-ink">
              Ledger overview
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="font-mono text-[11px] text-muted-ink">{formatDate(todayISO())}</span>
            <Link
              to="/settings"
              className="font-mono text-[10px] uppercase tracking-wide text-brass"
            >
              Settings →
            </Link>
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 divide-x divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line sm:grid-cols-4">
          <div className="px-3 py-4">
            <p className="label-ledger">Total balance</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-ink sm:text-[19px]">
              {stats.data ? formatRs(stats.data.totalSavingBalance) : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-muted-ink">
              {stats.data ? `${stats.data.memberCount} members` : ""}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="label-ledger">Deposits</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-deposit sm:text-[19px]">
              {stats.data ? `+${formatRs(stats.data.todaysDeposits)}` : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-deposit">
              {stats.data ? `${stats.data.todaysDepositCount} entries` : ""}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="label-ledger">Withdrawals</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-withdraw sm:text-[19px]">
              {stats.data ? `\u2212${formatRs(stats.data.todaysWithdrawals)}` : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-withdraw">
              {stats.data ? `${stats.data.todaysWithdrawalCount} entries` : ""}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="label-ledger">Interest credited</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-brass sm:text-[19px]">
              {stats.data ? `+${formatRs(stats.data.todaysInterestCredited)}` : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-brass">
              {stats.data ? `${stats.data.todaysInterestCount} entries` : ""}
            </p>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          <div className="px-3 py-4">
            <p className="label-ledger">Fixed deposits</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-ink sm:text-[19px]">
              {stats.data ? formatRs(stats.data.totalFixedDepositPrincipal) : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-muted-ink">
              {stats.data ? `${stats.data.activeFixedDepositCount} active` : ""}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="label-ledger">Loans outstanding</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-ink sm:text-[19px]">
              {stats.data ? formatRs(stats.data.totalLoanOutstanding) : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-muted-ink">
              {stats.data ? `${stats.data.activeLoanCount} active loans` : ""}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="label-ledger">EMI collected today</p>
            <p className="mt-2 font-mono text-[16px] font-medium leading-none tabular-nums text-deposit sm:text-[19px]">
              {stats.data ? formatRs(stats.data.todaysEmiCollected) : "—"}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-deposit">
              {stats.data ? `${stats.data.todaysEmiCount} payments` : ""}
            </p>
          </div>
        </section>
      </div>

      <section className="rise px-4 pb-8 [animation-delay:120ms]">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-[16px] font-semibold tracking-tight text-ink">
            Today's transactions
          </h2>
          <Link to="/transactions" className="font-mono text-[11px] text-brass">
            All →
          </Link>
        </div>

        <div className="rounded-2xl bg-surface ring-1 ring-line">
          <div className="grid grid-cols-[1.6fr_1fr_.9fr] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
            <span>Member</span>
            <span className="text-right">Type</span>
            <span className="text-right">Amount</span>
          </div>

          <div className="divide-y divide-line text-[13px]">
            {todays.isLoading ? (
              <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
            ) : todays.data && todays.data.length > 0 ? (
              todays.data.map((t, i) => {
                const isDebit = t.type === "withdraw";
                return (
                  <div
                    key={t.id}
                    className={`grid grid-cols-[1.6fr_1fr_.9fr] items-center gap-3 px-4 py-3 ${
                      i % 2 === 1 ? "bg-paper/50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{t.memberName}</p>
                      <p className="truncate text-[11px] text-muted-ink">
                        {[t.remarks, formatTime(t.createdAt)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`text-right font-mono text-[11px] uppercase tracking-wide ${
                        isDebit
                          ? "text-withdraw"
                          : t.type === "interest"
                            ? "text-brass"
                            : "text-deposit"
                      }`}
                    >
                      {t.type}
                    </span>
                    <span
                      className={`text-right font-mono font-medium tabular-nums ${
                        isDebit
                          ? "text-withdraw"
                          : t.type === "interest"
                            ? "text-brass"
                            : "text-deposit"
                      }`}
                    >
                      {formatSigned(t.type, t.amount)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
                No entries recorded today.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
