import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  compoundMemberSaving,
  formatDate,
  formatRs,
  formatSigned,
  formatTime,
  getFixedDeposits,
  getLoans,
  getMemberById,
  getSavingDeposits,
  getTransactions,
  payFixedDepositInterest,
  previewMemberCompound,
  todayISO,
  withdrawFixedDepositPrincipal,
  type FixedDeposit,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const member = useQuery({
    queryKey: ["member", id],
    queryFn: () => getMemberById(id!),
    enabled: !!id,
  });
  const savingDeposits = useQuery({
    queryKey: ["saving-deposits", id],
    queryFn: () => getSavingDeposits(id),
    enabled: !!id,
  });
  const deposits = useQuery({
    queryKey: ["fixed-deposits", id],
    queryFn: () => getFixedDeposits(id),
    enabled: !!id,
  });
  const memberLoans = useQuery({
    queryKey: ["loans", id],
    queryFn: () => getLoans(id),
    enabled: !!id,
  });
  const history = useQuery({
    queryKey: ["transactions", { memberId: id, page: 1 }],
    queryFn: () => getTransactions({ ...(id ? { memberId: id } : {}), page: 1, pageSize: 6 }),
    enabled: !!id,
  });

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [pendingWithdraw, setPendingWithdraw] = useState<FixedDeposit | null>(null);

  const [compoundModalOpen, setCompoundModalOpen] = useState(false);
  const [compoundPreview, setCompoundPreview] = useState<{
    amountDue: number;
    lotsDue: number;
    lotsTotal: number;
  } | null>(null);
  const [compoundPreviewLoading, setCompoundPreviewLoading] = useState(false);
  const [compoundError, setCompoundError] = useState<string | null>(null);
  const [compoundSuccess, setCompoundSuccess] = useState<string | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["member", id] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["saving-deposits", id] });
    queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  const payMutation = useMutation({
    mutationFn: (vars: { fdId: string; amount: number }) =>
      payFixedDepositInterest(vars.fdId, vars.amount),
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

  const compoundMutation = useMutation({
    mutationFn: () => compoundMemberSaving(id!),
    onSuccess: (result) => {
      invalidateAll();
      setCompoundSuccess(
        result.lotsUpdated > 0
          ? `Rs. ${result.totalInterestPosted} added across ${result.lotsUpdated} deposit(s) — new saving balance Rs. ${result.newSavingBalance}.`
          : "Nothing was due yet.",
      );
    },
    onError: (err) =>
      setCompoundError(err instanceof Error ? err.message : "Could not compound interest."),
  });

  // Live-load the preview whenever the modal opens — always a
  // server-computed figure, never a typed-in amount.
  useEffect(() => {
    if (!compoundModalOpen || !id) return;
    let cancelled = false;
    setCompoundPreviewLoading(true);
    previewMemberCompound(id)
      .then((preview) => {
        if (!cancelled) setCompoundPreview(preview);
      })
      .catch(() => {
        if (!cancelled) setCompoundPreview(null);
      })
      .finally(() => {
        if (!cancelled) setCompoundPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compoundModalOpen, id]);

  function openCompoundModal() {
    setCompoundPreview(null);
    setCompoundError(null);
    setCompoundSuccess(null);
    setCompoundModalOpen(true);
  }

  function openPay(fd: FixedDeposit) {
    setPayingId(fd.id);
    setPayAmount(String(fd.accruedInterestAvailable));
    setPayError(null);
  }

  function submitPay(fd: FixedDeposit) {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return setPayError("Enter an amount greater than zero.");
    payMutation.mutate({ fdId: fd.id, amount });
  }

  if (member.isLoading) {
    return <p className="px-4 py-10 text-center font-mono text-[11px] text-muted-ink">Loading…</p>;
  }
  if (member.isError || !member.data) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="font-mono text-[11px] text-withdraw">Member not found.</p>
        <button
          onClick={() => navigate("/members")}
          className="mt-3 font-mono text-[11px] text-brass"
        >
          ← Back to members
        </button>
      </div>
    );
  }

  const m = member.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/members" className="font-mono text-[11px] text-muted-ink">
        ← All members
      </Link>

      <div className="rise mt-3 mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            {m.membershipNo}
          </p>
          <h1 className="font-display text-[26px] font-black leading-none tracking-tight text-ink">
            {m.name}
          </h1>
          <p className="mt-1 text-[12px] text-muted-ink">
            {[m.address, m.phone].filter(Boolean).join(" · ") || "No contact details on file"}
          </p>
        </div>
        <button
          onClick={openCompoundModal}
          className="h-9 shrink-0 rounded-lg bg-brass px-3 font-display text-[12px] font-semibold text-paper"
        >
          Compound now
        </button>
      </div>

      {/* summary */}
      <div className="rise mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="label-ledger">Saving balance</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-ink">
            {formatRs(m.savingBalance)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-ink">
            {m.savingLotCount} deposit{m.savingLotCount === 1 ? "" : "s"} · new deposits at{" "}
            {m.savingInterestRate}
            %/yr
          </p>
        </div>
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="label-ledger">Accrued today</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-brass">
            +{formatRs(m.projectedSavingInterest)}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-ink">
            {m.nextSavingCompoundDate
              ? `next compound ${formatDate(m.nextSavingCompoundDate)}`
              : "no active deposits"}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="label-ledger">Fixed deposits</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-ink">
            {m.fixedDepositCount > 0 ? formatRs(m.fixedDepositPrincipalTotal) : "—"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-brass">
            {m.fixedDepositCount > 0
              ? `+${formatRs(m.fixedDepositAccruedInterest)} accrued`
              : "none"}
          </p>
        </div>
        <div className="rounded-xl bg-surface p-3 ring-1 ring-line sm:col-span-3">
          <p className="label-ledger">Loans outstanding</p>
          <p className="mt-1 font-mono text-[16px] font-medium text-ink">
            {m.loanOutstandingTotal > 0 ? formatRs(m.loanOutstandingTotal) : "No active loans"}
          </p>
        </div>
      </div>

      {/* saving deposits — each its own rate-locked lot */}
      <section className="rise mb-6">
        <h2 className="mb-2 px-1 font-display text-[15px] font-semibold tracking-tight text-ink">
          Saving deposits
        </h2>
        <p className="mb-2 px-1 text-[11px] text-muted-ink">
          Each deposit locks in the rate it was made at — changing the rate above only affects new
          deposits.
        </p>
        <div className="rounded-2xl bg-surface ring-1 ring-line">
          {savingDeposits.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : savingDeposits.data &&
            savingDeposits.data.filter((d) => d.status === "active").length > 0 ? (
            <div className="divide-y divide-line text-[13px]">
              {savingDeposits.data
                .filter((d) => d.status === "active")
                .map((lot) => (
                  <div key={lot.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {formatRs(lot.principal)}{" "}
                        <span className="font-mono text-[11px] font-normal text-muted-ink">
                          · {lot.rate}%/yr
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-ink">
                        Deposited {formatDate(lot.depositDate)}
                        {lot.accruedInterestSinceLastCompound > 0 ? (
                          <span className="text-brass">
                            {" "}
                            · +{formatRs(lot.accruedInterestSinceLastCompound)} accrued
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No saving deposits yet — add one from Add Finance.
            </p>
          )}
        </div>
      </section>

      {/* fixed deposits */}
      <section className="rise mb-6">
        <h2 className="mb-2 px-1 font-display text-[15px] font-semibold tracking-tight text-ink">
          Fixed deposits
        </h2>
        <div className="rounded-2xl bg-surface ring-1 ring-line">
          {deposits.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : deposits.data && deposits.data.length > 0 ? (
            <div className="divide-y divide-line text-[13px]">
              {deposits.data.map((fd) => {
                const matured = fd.status === "active" && todayISO() >= fd.maturityDate;
                return (
                  <div key={fd.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {formatRs(fd.principal)}{" "}
                        <span className="font-mono text-[11px] font-normal text-muted-ink">
                          · {fd.interestRate}%/yr · {fd.termMonths} mo
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-ink">
                        Matures {formatDate(fd.maturityDate)} ·{" "}
                        {fd.status === "active" ? (
                          <span className="text-brass">
                            +{formatRs(fd.accruedInterestAvailable)} accrued
                          </span>
                        ) : (
                          <span className="capitalize">{fd.status}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No fixed deposits for this member.
            </p>
          )}
        </div>
      </section>

      {/* loans */}
      <section className="rise mb-6">
        <h2 className="mb-2 px-1 font-display text-[15px] font-semibold tracking-tight text-ink">
          Loans
        </h2>
        <div className="rounded-2xl bg-surface ring-1 ring-line">
          {memberLoans.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : memberLoans.data && memberLoans.data.length > 0 ? (
            <div className="divide-y divide-line text-[13px]">
              {memberLoans.data.map((loan) => (
                <Link
                  key={loan.id}
                  to={`/loans/${loan.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper/50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {loan.loanNumber}{" "}
                      <span className="font-mono text-[11px] font-normal text-muted-ink">
                        · EMI {formatRs(loan.emiAmount)}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-ink">
                      Outstanding {formatRs(loan.outstandingPrincipal)}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[11px] uppercase tracking-wide ${
                      loan.status === "active" ? "text-deposit" : "text-muted-ink"
                    }`}
                  >
                    {loan.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No loans for this member.
            </p>
          )}
        </div>
      </section>

      {/* recent transactions */}
      <section className="rise pb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Recent activity
          </h2>
          <Link to={`/transactions?memberId=${m.id}`} className="font-mono text-[11px] text-brass">
            Full history →
          </Link>
        </div>
        <div className="rounded-2xl bg-surface ring-1 ring-line">
          {history.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : history.data && history.data.items.length > 0 ? (
            <div className="divide-y divide-line text-[13px]">
              {history.data.items.map((t) => {
                const color =
                  t.type === "withdraw"
                    ? "text-withdraw"
                    : t.type === "interest"
                      ? "text-brass"
                      : "text-deposit";
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-ink">{t.remarks || t.type}</p>
                      <p className="text-[11px] text-muted-ink">
                        {formatDate(t.date)} · {formatTime(t.createdAt)}
                      </p>
                    </div>
                    <span className={`font-mono font-medium tabular-nums ${color}`}>
                      {formatSigned(t.type, t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No transactions yet.
            </p>
          )}
        </div>
      </section>

      {payingId
        ? (() => {
            const fd = deposits.data?.find((f) => f.id === payingId);
            if (!fd) return null;
            return (
              <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
                <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
                  <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                    Pay interest to saving
                  </h2>
                  <p className="text-[12px] text-muted-ink">
                    Rs. {fd.accruedInterestAvailable} has accrued so far. This credits {m.name}'s
                    saving balance as a new deposit at their current rate; the locked FD principal
                    stays untouched.
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
        message={`This returns the full principal (Rs. ${pendingWithdraw?.principal ?? 0}) plus any final accrued interest to ${m.name}'s saving balance, and closes this deposit.`}
        confirmLabel="Release funds"
        onConfirm={() => pendingWithdraw && withdrawMutation.mutate(pendingWithdraw.id)}
        onCancel={() => setPendingWithdraw(null)}
      />

      {compoundModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
            <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
              Compound saving — {m.name}
            </h2>

            {compoundSuccess ? (
              <>
                <p className="text-[13px] text-deposit">{compoundSuccess}</p>
                <button
                  onClick={() => setCompoundModalOpen(false)}
                  className="h-11 w-full rounded-xl bg-ink font-display text-[14px] font-semibold text-paper"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] text-muted-ink">
                  Credits whatever is currently due across every saving deposit, each at its own
                  locked rate — same as the automatic quarterly job, just run now instead of
                  waiting.
                </p>

                <div className="rounded-xl bg-rail px-3 py-2.5">
                  <p className="label-ledger">Amount due</p>
                  <p className="mt-1 font-mono text-[18px] font-medium text-brass">
                    {compoundPreviewLoading
                      ? "Calculating…"
                      : compoundPreview
                        ? `+${formatRs(compoundPreview.amountDue)}`
                        : "—"}
                  </p>
                  {compoundPreview ? (
                    <p className="mt-1 font-mono text-[10px] text-muted-ink">
                      {compoundPreview.lotsDue} of {compoundPreview.lotsTotal} deposit(s) due
                    </p>
                  ) : null}
                </div>

                {compoundError ? (
                  <p className="text-[12px] font-medium text-withdraw">{compoundError}</p>
                ) : null}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCompoundModalOpen(false)}
                    className="h-11 flex-1 rounded-xl text-[13px] font-medium text-muted-ink ring-1 ring-line"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompoundError(null);
                      compoundMutation.mutate();
                    }}
                    disabled={
                      compoundMutation.isPending ||
                      compoundPreviewLoading ||
                      !compoundPreview ||
                      compoundPreview.lotsDue === 0
                    }
                    className="h-11 flex-1 rounded-xl bg-brass font-display text-[14px] font-semibold text-paper disabled:opacity-60"
                  >
                    {compoundMutation.isPending ? "Compounding…" : "Compound now"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
