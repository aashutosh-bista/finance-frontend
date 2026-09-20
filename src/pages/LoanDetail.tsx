import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addLoanPayment,
  deleteLoanPayment,
  formatDate,
  formatRs,
  getLoanById,
  todayISO,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["loan", id],
    queryFn: () => getLoanById(id!),
    enabled: !!id,
  });

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["loan", id] });
    queryClient.invalidateQueries({ queryKey: ["loans"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const payMutation = useMutation({
    mutationFn: (vars: { amount: number; date: string; notes?: string }) =>
      addLoanPayment(id!, vars),
    onSuccess: () => {
      invalidateAll();
      setAmount("");
      setNotes("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not record payment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => deleteLoanPayment(id!, paymentId),
    onSuccess: () => {
      invalidateAll();
      setPendingDeleteId(null);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return setError("Enter an amount greater than zero.");
    }
    payMutation.mutate({
      amount: numericAmount,
      date,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  if (query.isLoading) {
    return <p className="px-4 py-10 text-center font-mono text-[11px] text-muted-ink">Loading…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="font-mono text-[11px] text-withdraw">Loan not found.</p>
        <button
          onClick={() => navigate("/loans")}
          className="mt-3 font-mono text-[11px] text-brass"
        >
          ← Back to loans
        </button>
      </div>
    );
  }

  const { loan, payments } = query.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/loans" className="font-mono text-[11px] text-muted-ink">
        ← All loans
      </Link>

      <div className="rise mt-3 mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            {loan.loanNumber}
          </p>
          <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
            {loan.borrowerName}
          </h1>
          <p className="mt-1 text-[12px] text-muted-ink">{loan.phone || "No phone on file"}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ${
            loan.status === "active" ? "bg-deposit/15 text-deposit" : "bg-rail text-muted-ink"
          }`}
        >
          {loan.status}
        </span>
      </div>

      <div className="rise mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Principal", formatRs(loan.principal)],
          ["Rate", `${loan.interestRate}%/yr`],
          ["EMI", formatRs(loan.emiAmount)],
          ["Outstanding", formatRs(loan.outstandingPrincipal)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface p-3 ring-1 ring-line">
            <p className="label-ledger">{label}</p>
            <p className="mt-1 font-mono text-[14px] font-medium text-ink">{value}</p>
          </div>
        ))}
      </div>

      {loan.status === "active" ? (
        <form
          onSubmit={handleSubmit}
          className="rise mb-5 space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line"
        >
          <h2 className="font-display text-[15px] font-semibold text-ink">Record EMI payment</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-ledger">Amount (Rs.)</label>
              <input
                type="number"
                min="0"
                className="field mt-1.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(loan.emiAmount)}
              />
            </div>
            <div>
              <label className="label-ledger">Date</label>
              <input
                type="date"
                className="field mt-1.5"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label-ledger">Notes (optional)</label>
            <input
              className="field mt-1.5"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in cash"
            />
          </div>
          {error ? <p className="text-[12px] font-medium text-withdraw">{error}</p> : null}
          <button
            type="submit"
            disabled={payMutation.isPending}
            className="h-11 w-full rounded-xl bg-brass font-display text-[14px] font-semibold text-paper disabled:opacity-60"
          >
            {payMutation.isPending ? "Saving…" : "Record payment"}
          </button>
        </form>
      ) : (
        <div className="rise mb-5 rounded-2xl bg-surface p-4 text-center ring-1 ring-line">
          <p className="font-mono text-[11px] text-muted-ink">This loan is fully paid off.</p>
        </div>
      )}

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[.8fr_.8fr_.8fr_.8fr_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Date</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Interest</span>
          <span className="text-right">Outstanding</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {payments.length > 0 ? (
            payments
              .slice()
              .reverse()
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`grid grid-cols-[.8fr_.8fr_.8fr_.8fr_auto] items-center gap-3 px-4 py-3 ${
                    i % 2 === 1 ? "bg-paper/50" : ""
                  }`}
                >
                  <span className="font-mono text-[11px] text-muted-ink">{formatDate(p.date)}</span>
                  <span className="text-right font-mono tabular-nums text-ink">
                    {formatRs(p.amount)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-muted-ink">
                    {formatRs(p.interestComponent)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-ink">
                    {formatRs(p.outstandingAfter)}
                  </span>
                  <div className="text-right">
                    <button
                      onClick={() => setPendingDeleteId(p.id)}
                      className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-withdraw ring-1 ring-line"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No payments recorded yet.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete payment?"
        message="This removes the payment and recalculates the loan's outstanding balance. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => pendingDeleteId && deleteMutation.mutate(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
