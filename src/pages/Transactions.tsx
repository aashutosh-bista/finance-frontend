import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  deleteTransaction,
  formatDate,
  formatRs,
  formatSigned,
  getMembers,
  getTransactions,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });
  const [searchParams] = useSearchParams();

  const [memberId, setMemberId] = useState(searchParams.get("memberId") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filters = {
    ...(memberId ? { memberId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page,
  };
  const transactions = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => getTransactions(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["todays-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setPendingDeleteId(null);
    },
  });

  const totalPages = transactions.data
    ? Math.max(1, Math.ceil(transactions.data.total / transactions.data.pageSize))
    : 1;

  function resetFilters() {
    setMemberId("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="rise mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Full record</p>
        <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
          Transaction history
        </h1>
      </div>

      <div className="rise mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="label-ledger">Member</label>
          <select
            className="field mt-1.5"
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All members</option>
            {members.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-ledger">From</label>
          <input
            type="date"
            className="field mt-1.5"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label className="label-ledger">To</label>
          <input
            type="date"
            className="field mt-1.5"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="h-11 w-full rounded-xl text-[12px] font-medium text-muted-ink ring-1 ring-line"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[.8fr_1.3fr_.8fr_.8fr_.9fr_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Date</span>
          <span>Member</span>
          <span className="text-right">Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {transactions.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : transactions.data && transactions.data.items.length > 0 ? (
            transactions.data.items.map((t, i) => {
              const typeColor =
                t.type === "withdraw"
                  ? "text-withdraw"
                  : t.type === "interest"
                    ? "text-brass"
                    : "text-deposit";
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-[.8fr_1.3fr_.8fr_.8fr_.9fr_auto] items-center gap-3 px-4 py-3 ${
                    i % 2 === 1 ? "bg-paper/50" : ""
                  }`}
                >
                  <span className="font-mono text-[11px] text-muted-ink">{formatDate(t.date)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{t.memberName}</p>
                    {t.remarks ? (
                      <p className="truncate text-[11px] text-muted-ink">{t.remarks}</p>
                    ) : null}
                  </div>
                  <span
                    className={`text-right font-mono text-[11px] uppercase tracking-wide ${typeColor}`}
                  >
                    {t.type}
                  </span>
                  <span className={`text-right font-mono font-medium tabular-nums ${typeColor}`}>
                    {formatSigned(t.type, t.amount)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-ink">
                    {formatRs(t.runningBalance)}
                  </span>
                  <div className="text-right">
                    <button
                      onClick={() => setPendingDeleteId(t.id)}
                      className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-withdraw ring-1 ring-line"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No transactions match these filters.
            </p>
          )}
        </div>

        {transactions.data && transactions.data.total > transactions.data.pageSize ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-lg px-3 text-[12px] font-medium text-muted-ink ring-1 ring-line disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-muted-ink">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 rounded-lg px-3 text-[12px] font-medium text-muted-ink ring-1 ring-line disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete transaction?"
        message="This will remove the entry and adjust the member's balance. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => pendingDeleteId && deleteMutation.mutate(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
