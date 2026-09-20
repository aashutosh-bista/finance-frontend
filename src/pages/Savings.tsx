import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatRs, getMembers } from "../api";

export function SavingsPage() {
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const totalBalance = members.data?.reduce((s, m) => s + m.savingBalance, 0) ?? 0;
  const totalEarned = members.data?.reduce((s, m) => s + m.totalSavingInterestEarned, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="rise mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Liquid accounts
        </p>
        <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
          Savings
        </h1>
        <p className="mt-1 text-[12px] text-muted-ink">
          Every member's saving balance and how much interest they've earned so far. Each deposit
          locks in its own rate — the rate shown is only what a <em>new</em> deposit would get.
        </p>
      </div>

      <div className="rise mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="label-ledger">Total saving balance</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-ink">
            {formatRs(totalBalance)}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="label-ledger">Total interest earned</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-brass">
            +{formatRs(totalEarned)}
          </p>
        </div>
      </div>

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[1.3fr_.8fr_.6fr_.8fr] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Member</span>
          <span className="text-right">Amount</span>
          <span className="text-right">New-deposit rate</span>
          <span className="text-right">Interest earned</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {members.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : members.data && members.data.length > 0 ? (
            members.data.map((m, i) => (
              <Link
                key={m.id}
                to={`/members/${m.id}`}
                className={`grid grid-cols-[1.3fr_.8fr_.6fr_.8fr] items-center gap-3 px-4 py-3 hover:bg-paper/70 ${
                  i % 2 === 1 ? "bg-paper/50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{m.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-ink">
                    {m.membershipNo} · {m.savingLotCount} deposit{m.savingLotCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="text-right font-mono tabular-nums text-ink">
                  {formatRs(m.savingBalance)}
                </span>
                <span className="text-right font-mono tabular-nums text-muted-ink">
                  {m.savingInterestRate}%
                </span>
                <span className="text-right font-mono tabular-nums text-brass">
                  +{formatRs(m.totalSavingInterestEarned)}
                </span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No members yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
