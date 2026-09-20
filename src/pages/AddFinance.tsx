import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addTransaction, getMembers, todayISO, type TransactionType } from "../api";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string; className: string }> = [
  { value: "deposit", label: "Add money", className: "bg-deposit text-paper" },
  { value: "withdraw", label: "Take out money", className: "bg-withdraw text-paper" },
];

export function AddFinancePage() {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const [type, setType] = useState<TransactionType>("deposit");
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.data?.find((m) => m.id === memberId),
    [members.data, memberId],
  );

  const mutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: (tx) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["todays-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      const verb = tx.type === "deposit" ? "Deposit" : "Withdrawal";
      setSuccess(`${verb} of Rs. ${tx.amount} recorded for ${tx.memberName}.`);
      setAmount("");
      setRemarks("");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not save this entry.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!memberId) return setError("Select a member.");
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return setError("Enter an amount greater than zero.");
    }
    if (type === "withdraw" && selectedMember && numericAmount > selectedMember.savingBalance) {
      return setError(
        `Insufficient balance. ${selectedMember.name} has Rs. ${selectedMember.savingBalance}.`,
      );
    }

    mutation.mutate({
      memberId,
      type,
      amount: numericAmount,
      date,
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    });
  }

  const activeOption = TYPE_OPTIONS.find((o) => o.value === type)!;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="rise mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">New entry</p>
        <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
          Add finance
        </h1>
        <p className="mt-2 text-[13px] text-muted-ink">
          Record a deposit or withdrawal for a member's saving account.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rise space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line"
      >
        {/* type toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-rail p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`h-10 rounded-lg font-display text-[13px] font-semibold transition-colors ${
                type === opt.value ? opt.className : "text-muted-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="member" className="label-ledger">
            Member
          </label>
          <select
            id="member"
            className="field mt-1.5"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">{members.isLoading ? "Loading members…" : "Select a member"}</option>
            {members.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.membershipNo} · {m.name}
              </option>
            ))}
          </select>
          {selectedMember ? (
            <p className="mt-1.5 font-mono text-[10px] text-muted-ink">
              Saving: Rs. {new Intl.NumberFormat("en-IN").format(selectedMember.savingBalance)} ·
              Rate: {selectedMember.savingInterestRate}%/yr
              {type === "deposit" ? " (this is the rate a new deposit will lock in)" : ""}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="label-ledger">
              Amount (Rs.)
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="field mt-1.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="date" className="label-ledger">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="field mt-1.5"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="remarks" className="label-ledger">
            Remarks
          </label>
          <textarea
            id="remarks"
            className="field mt-1.5 h-24 resize-none pt-2.5"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any remarks about this entry…"
          />
        </div>

        {error ? <p className="text-[12px] font-medium text-withdraw">{error}</p> : null}
        {success ? <p className="text-[12px] font-medium text-deposit">{success}</p> : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className={`h-12 w-full rounded-xl font-display text-[15px] font-semibold tracking-tight text-paper disabled:opacity-60 ${activeOption.className}`}
        >
          {mutation.isPending ? "Saving…" : activeOption.label}
        </button>
      </form>
    </div>
  );
}
