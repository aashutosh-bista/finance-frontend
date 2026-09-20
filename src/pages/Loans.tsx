import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  addLoan,
  calculateEmi,
  deleteLoan,
  formatRs,
  getLoans,
  getMembers,
  todayISO,
  type Loan,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

const emptyForm = {
  loanNumber: "",
  memberId: "",
  principal: "",
  interestRate: "14",
  tenureMonths: "12",
  startDate: todayISO(),
};

export function LoansPage() {
  const queryClient = useQueryClient();
  const loans = useQuery({ queryKey: ["loans"], queryFn: () => getLoans() });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Loan | null>(null);

  const selectedMember = useMemo(
    () => members.data?.find((m) => m.id === form.memberId),
    [members.data, form.memberId],
  );

  const previewEmi = useMemo(() => {
    const p = Number(form.principal);
    const r = Number(form.interestRate);
    const n = Number(form.tenureMonths);
    if (!p || !n) return 0;
    return calculateEmi(p, r || 0, n);
  }, [form.principal, form.interestRate, form.tenureMonths]);

  const createMutation = useMutation({
    mutationFn: addLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      closeForm();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not create loan."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPendingDelete(null);
    },
  });

  function openAddForm() {
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setForm(emptyForm);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.loanNumber.trim()) return setError("Loan number is required.");
    if (!form.memberId)
      return setError("Select a member — loans can only be issued to existing members.");
    const principal = Number(form.principal);
    const interestRate = Number(form.interestRate);
    const tenureMonths = Number(form.tenureMonths);
    if (!principal || principal <= 0) return setError("Principal must be greater than zero.");
    if (interestRate < 0) return setError("Interest rate can't be negative.");
    if (!Number.isInteger(tenureMonths) || tenureMonths < 1) {
      return setError("Tenure must be a whole number of months.");
    }

    createMutation.mutate({
      loanNumber: form.loanNumber.trim(),
      memberId: form.memberId,
      principal,
      interestRate,
      tenureMonths,
      startDate: form.startDate,
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="rise mb-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Lending</p>
          <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
            Loans
          </h1>
          <p className="mt-1 text-[12px] text-muted-ink">Only existing members can take a loan.</p>
        </div>
        <button
          onClick={openAddForm}
          className="h-10 rounded-xl bg-ink px-4 font-display text-[13px] font-semibold text-paper"
        >
          + New loan
        </button>
      </div>

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[.8fr_1.2fr_.8fr_.8fr_.8fr_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Loan no.</span>
          <span>Borrower</span>
          <span className="text-right">EMI</span>
          <span className="text-right">Outstanding</span>
          <span className="text-right">Status</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {loans.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : loans.data && loans.data.length > 0 ? (
            loans.data.map((loan, i) => (
              <div
                key={loan.id}
                className={`grid grid-cols-[.8fr_1.2fr_.8fr_.8fr_.8fr_auto] items-center gap-3 px-4 py-3 ${
                  i % 2 === 1 ? "bg-paper/50" : ""
                }`}
              >
                <Link
                  to={`/loans/${loan.id}`}
                  className="font-mono text-[12px] text-brass hover:underline"
                >
                  {loan.loanNumber}
                </Link>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{loan.borrowerName}</p>
                  <p className="truncate text-[11px] text-muted-ink">
                    {loan.interestRate}%/yr · {loan.tenureMonths} mo
                  </p>
                </div>
                <span className="text-right font-mono tabular-nums text-ink">
                  {formatRs(loan.emiAmount)}
                </span>
                <span className="text-right font-mono tabular-nums text-ink">
                  {formatRs(loan.outstandingPrincipal)}
                </span>
                <span
                  className={`text-right font-mono text-[11px] uppercase tracking-wide ${
                    loan.status === "active" ? "text-deposit" : "text-muted-ink"
                  }`}
                >
                  {loan.status}
                </span>
                <div className="flex justify-end gap-2">
                  <Link
                    to={`/loans/${loan.id}`}
                    className="h-8 rounded-lg px-2.5 text-[12px] font-medium leading-8 text-muted-ink ring-1 ring-line"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => setPendingDelete(loan)}
                    className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-withdraw ring-1 ring-line"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No loans yet.
            </p>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 px-4 py-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line"
          >
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
              New loan
            </h2>

            <div>
              <label className="label-ledger">Loan no.</label>
              <input
                className="field mt-1.5"
                value={form.loanNumber}
                onChange={(e) => setForm({ ...form, loanNumber: e.target.value })}
                placeholder="LN-1003"
              />
            </div>

            <div>
              <label className="label-ledger">Member</label>
              <select
                className="field mt-1.5"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              >
                <option value="">
                  {members.isLoading ? "Loading members…" : "Select a member"}
                </option>
                {members.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.membershipNo} · {m.name}
                  </option>
                ))}
              </select>
              {selectedMember ? (
                <p className="mt-1.5 font-mono text-[10px] text-muted-ink">
                  {selectedMember.phone || "No phone on file"} · Saving: Rs.{" "}
                  {new Intl.NumberFormat("en-IN").format(selectedMember.savingBalance)}
                </p>
              ) : null}
            </div>

            <div>
              <label className="label-ledger">Principal (Rs.)</label>
              <input
                type="number"
                min="0"
                className="field mt-1.5"
                value={form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.value })}
                placeholder="100000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ledger">Interest (%/yr)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="field mt-1.5"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                />
              </div>
              <div>
                <label className="label-ledger">Tenure (months)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="field mt-1.5"
                  value={form.tenureMonths}
                  onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label-ledger">Start date</label>
              <input
                type="date"
                className="field mt-1.5"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>

            {previewEmi > 0 ? (
              <div className="rounded-xl bg-rail px-3 py-2.5">
                <p className="label-ledger">Estimated EMI</p>
                <p className="mt-1 font-mono text-[16px] font-medium text-ink">
                  {formatRs(previewEmi)} / month
                </p>
              </div>
            ) : null}

            {error ? <p className="text-[12px] font-medium text-withdraw">{error}</p> : null}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="h-11 flex-1 rounded-xl text-[13px] font-medium text-muted-ink ring-1 ring-line"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="h-11 flex-1 rounded-xl bg-ink font-display text-[14px] font-semibold text-paper disabled:opacity-60"
              >
                {createMutation.isPending ? "Saving…" : "Create loan"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete loan?"
        message={`This removes the loan for ${pendingDelete?.borrowerName ?? "this borrower"} and its full payment history. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
