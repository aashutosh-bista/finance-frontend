import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFixedDeposit,
  deleteFixedDeposit,
  formatDate,
  formatRs,
  getFixedDeposits,
  getMembers,
  payFixedDepositInterest,
  todayISO,
  withdrawFixedDepositPrincipal,
  type FixedDeposit,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

const emptyForm = {
  memberId: "",
  principal: "",
  interestRate: "11",
  termMonths: "6",
  startDate: todayISO(),
  fundFromSaving: false,
};

export function FixedDepositsPage() {
  const queryClient = useQueryClient();
  const deposits = useQuery({ queryKey: ["fixed-deposits"], queryFn: () => getFixedDeposits() });
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const [pendingWithdraw, setPendingWithdraw] = useState<FixedDeposit | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FixedDeposit | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  const createMutation = useMutation({
    mutationFn: addFixedDeposit,
    onSuccess: () => {
      invalidateAll();
      closeForm();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Could not create fixed deposit."),
  });

  const payMutation = useMutation({
    mutationFn: (vars: { id: string; amount?: number }) =>
      payFixedDepositInterest(vars.id, vars.amount),
    onSuccess: () => {
      invalidateAll();
      setPayingId(null);
      setPayAmount("");
    },
    onError: (err) => setPayError(err instanceof Error ? err.message : "Could not pay interest."),
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawFixedDepositPrincipal,
    onSuccess: () => {
      invalidateAll();
      setPendingWithdraw(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFixedDeposit,
    onSuccess: () => {
      invalidateAll();
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
    if (!form.memberId) return setError("Select a member.");
    const principal = Number(form.principal);
    const interestRate = Number(form.interestRate);
    const termMonths = Number(form.termMonths);
    if (!principal || principal <= 0) return setError("Principal must be greater than zero.");
    if (interestRate < 0) return setError("Interest rate can't be negative.");
    if (!Number.isInteger(termMonths) || termMonths < 1)
      return setError("Term must be a whole number of months.");

    createMutation.mutate({
      memberId: form.memberId,
      principal,
      interestRate,
      termMonths,
      startDate: form.startDate,
      fundFromSaving: form.fundFromSaving,
    });
  }

  function openPay(fd: FixedDeposit) {
    setPayingId(fd.id);
    setPayAmount(String(fd.accruedInterestAvailable));
    setPayError(null);
  }

  function submitPay(fd: FixedDeposit) {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return setPayError("Enter an amount greater than zero.");
    payMutation.mutate({ id: fd.id, amount });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="rise mb-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Locked term</p>
          <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
            Fixed deposits
          </h1>
          <p className="mt-1 text-[12px] text-muted-ink">
            Principal is locked until maturity — only interest can be paid out early.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="h-10 rounded-xl bg-ink px-4 font-display text-[13px] font-semibold text-paper"
        >
          + New fixed deposit
        </button>
      </div>

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[1.1fr_.8fr_.7fr_.8fr_.8fr_.7fr_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Member</span>
          <span className="text-right">Principal</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Matures</span>
          <span className="text-right">Accrued</span>
          <span className="text-right">Status</span>
          <span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {deposits.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : deposits.data && deposits.data.length > 0 ? (
            deposits.data.map((fd, i) => {
              const matured = fd.status === "active" && todayISO() >= fd.maturityDate;
              return (
                <div
                  key={fd.id}
                  className={`grid grid-cols-[1.1fr_.8fr_.7fr_.8fr_.8fr_.7fr_auto] items-center gap-3 px-4 py-3 ${
                    i % 2 === 1 ? "bg-paper/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{fd.memberName}</p>
                    <p className="truncate text-[11px] text-muted-ink">{fd.termMonths} mo term</p>
                  </div>
                  <span className="text-right font-mono tabular-nums text-ink">
                    {formatRs(fd.principal)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-muted-ink">
                    {fd.interestRate}%/yr
                  </span>
                  <span className="text-right font-mono text-[11px] text-muted-ink">
                    {formatDate(fd.maturityDate)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-brass">
                    {fd.status === "active" ? formatRs(fd.accruedInterestAvailable) : "—"}
                  </span>
                  <span
                    className={`text-right font-mono text-[11px] uppercase tracking-wide ${
                      fd.status === "active"
                        ? matured
                          ? "text-brass"
                          : "text-deposit"
                        : "text-muted-ink"
                    }`}
                  >
                    {fd.status === "active" && matured ? "matured" : fd.status}
                  </span>
                  <div className="flex justify-end gap-2">
                    {fd.status === "active" ? (
                      <button
                        onClick={() => openPay(fd)}
                        className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-brass ring-1 ring-line"
                      >
                        Pay interest
                      </button>
                    ) : null}
                    {matured ? (
                      <button
                        onClick={() => setPendingWithdraw(fd)}
                        className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-deposit ring-1 ring-line"
                      >
                        Release
                      </button>
                    ) : null}
                    {fd.status === "active" && fd.totalInterestPaid === 0 ? (
                      <button
                        onClick={() => setPendingDelete(fd)}
                        className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-withdraw ring-1 ring-line"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No fixed deposits yet.
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
              New fixed deposit
            </h2>

            <div>
              <label className="label-ledger">Member</label>
              <select
                className="field mt-1.5"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              >
                <option value="">Select a member</option>
                {members.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.membershipNo} · {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-ledger">Principal (Rs.)</label>
              <input
                type="number"
                min="0"
                className="field mt-1.5"
                value={form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.value })}
                placeholder="50000"
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
                <label className="label-ledger">Term (months)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="field mt-1.5"
                  value={form.termMonths}
                  onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
                  placeholder="6"
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

            <label className="flex items-center gap-2 text-[12px] text-muted-ink">
              <input
                type="checkbox"
                checked={form.fundFromSaving}
                onChange={(e) => setForm({ ...form, fundFromSaving: e.target.checked })}
              />
              Fund from this member's saving balance (instead of fresh cash)
            </label>

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
                {createMutation.isPending ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {payingId
        ? (() => {
            const fd = deposits.data?.find((f) => f.id === payingId);
            if (!fd) return null;
            return (
              <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
                <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
                  <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                    Pay interest — {fd.memberName}
                  </h2>
                  <p className="text-[12px] text-muted-ink">
                    Rs. {fd.accruedInterestAvailable} has accrued since this was last settled. This
                    credits their saving balance; the principal stays locked.
                  </p>
                  <div>
                    <label className="label-ledger">Amount (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      className="field mt-1.5"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>
                  {payError ? (
                    <p className="text-[12px] font-medium text-withdraw">{payError}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPayingId(null)}
                      className="h-11 flex-1 rounded-xl text-[13px] font-medium text-muted-ink ring-1 ring-line"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => submitPay(fd)}
                      disabled={payMutation.isPending}
                      className="h-11 flex-1 rounded-xl bg-brass font-display text-[14px] font-semibold text-paper disabled:opacity-60"
                    >
                      {payMutation.isPending ? "Paying…" : "Pay to saving"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}

      <ConfirmDialog
        open={pendingWithdraw !== null}
        title="Release fixed deposit?"
        message={`This returns the full principal (Rs. ${pendingWithdraw?.principal ?? 0}) plus any final accrued interest to ${pendingWithdraw?.memberName ?? "the member"}'s saving balance, and closes this deposit.`}
        confirmLabel="Release funds"
        onConfirm={() => pendingWithdraw && withdrawMutation.mutate(pendingWithdraw.id)}
        onCancel={() => setPendingWithdraw(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete fixed deposit?"
        message="This removes the deposit entirely. Only available before any interest has been paid out."
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
