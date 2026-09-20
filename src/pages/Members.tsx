import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  addMember,
  deleteMember,
  formatRs,
  getMembers,
  updateMember,
  type Member,
  type NewMember,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";

const emptyForm: NewMember = {
  membershipNo: "",
  name: "",
  address: "",
  phone: "",
  savingInterestRate: 8,
};

export function MembersPage() {
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: getMembers });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewMember>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["todays-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  const createMutation = useMutation({
    mutationFn: addMember,
    onSuccess: () => {
      invalidateAll();
      closeForm();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not add member."),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: NewMember }) => updateMember(vars.id, vars.data),
    onSuccess: () => {
      invalidateAll();
      closeForm();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not update member."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      invalidateAll();
      setPendingDelete(null);
    },
  });

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  }

  function openEditForm(member: Member) {
    setEditingId(member.id);
    setForm({
      membershipNo: member.membershipNo,
      name: member.name,
      address: member.address,
      phone: member.phone,
      savingInterestRate: member.savingInterestRate,
    });
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.membershipNo.trim() || !form.name.trim()) {
      return setError("Membership no. and name are required.");
    }
    if (!Number.isFinite(form.savingInterestRate) || form.savingInterestRate < 0) {
      return setError("Interest rate must be a non-negative number.");
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="rise mb-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Roster</p>
          <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
            Members
          </h1>
        </div>
        <button
          onClick={openAddForm}
          className="h-10 rounded-xl bg-ink px-4 font-display text-[13px] font-semibold text-paper"
        >
          + Add member
        </button>
      </div>

      <div className="rise rounded-2xl bg-surface ring-1 ring-line">
        <div className="grid grid-cols-[.9fr_1.1fr_.9fr_.8fr_.8fr_auto] gap-3 border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-ink">
          <span>Membership</span>
          <span>Name</span>
          <span className="text-right">Saving</span>
          <span className="text-right">Fixed dep.</span>
          <span className="text-right">Loan</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-line text-[13px]">
          {members.isLoading ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">Loading…</p>
          ) : members.data && members.data.length > 0 ? (
            members.data.map((m, i) => (
              <div
                key={m.id}
                className={`grid grid-cols-[.9fr_1.1fr_.9fr_.8fr_.8fr_auto] items-center gap-3 px-4 py-3 ${
                  i % 2 === 1 ? "bg-paper/50" : ""
                }`}
              >
                <span className="font-mono text-[12px] text-muted-ink">{m.membershipNo}</span>
                <div className="min-w-0">
                  <Link
                    to={`/members/${m.id}`}
                    className="block truncate font-semibold text-ink hover:text-brass"
                  >
                    {m.name}
                  </Link>
                  <p className="truncate text-[11px] text-muted-ink">{m.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-medium tabular-nums text-ink">
                    {formatRs(m.savingBalance)}
                  </p>
                  <p className="font-mono text-[10px] text-muted-ink">{m.savingInterestRate}%/yr</p>
                </div>
                <div className="text-right">
                  <p className="font-mono tabular-nums text-ink">
                    {m.fixedDepositCount > 0 ? formatRs(m.fixedDepositPrincipalTotal) : "—"}
                  </p>
                  {m.fixedDepositCount > 0 ? (
                    <p className="font-mono text-[10px] text-muted-ink">
                      {m.fixedDepositCount} deposit(s)
                    </p>
                  ) : null}
                </div>
                <span className="text-right font-mono tabular-nums text-ink">
                  {m.loanOutstandingTotal > 0 ? formatRs(m.loanOutstandingTotal) : "—"}
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEditForm(m)}
                    className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-muted-ink ring-1 ring-line"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPendingDelete(m)}
                    className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-withdraw ring-1 ring-line"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center font-mono text-[11px] text-muted-ink">
              No members yet.
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
              {editingId ? "Edit member" : "Add member"}
            </h2>

            <div>
              <label className="label-ledger">Membership no.</label>
              <input
                className="field mt-1.5"
                value={form.membershipNo}
                onChange={(e) => setForm({ ...form, membershipNo: e.target.value })}
                placeholder="MB-007"
              />
            </div>
            <div>
              <label className="label-ledger">Name</label>
              <input
                className="field mt-1.5"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="label-ledger">Address</label>
              <input
                className="field mt-1.5"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ward, district"
              />
            </div>
            <div>
              <label className="label-ledger">Phone</label>
              <input
                className="field mt-1.5"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="98XXXXXXXX"
              />
            </div>
            <div>
              <label className="label-ledger">
                Saving interest rate (% / yr, compounds quarterly)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="field mt-1.5"
                value={form.savingInterestRate}
                onChange={(e) => setForm({ ...form, savingInterestRate: Number(e.target.value) })}
              />
            </div>

            <p className="text-[11px] text-muted-ink">
              Fixed deposits and loans are opened separately from the Loans and Add Finance pages —
              every member starts with just a saving account.
            </p>

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
                disabled={saving}
                className="h-11 flex-1 rounded-xl bg-ink font-display text-[14px] font-semibold text-paper disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete member?"
        message={`This removes ${pendingDelete?.name ?? "this member"} and their transaction and fixed deposit history. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
