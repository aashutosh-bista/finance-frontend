import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../api";
import { useAuth } from "../lib/auth";

export function SettingsPage() {
  const { user } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changePassword(oldPassword, newPassword),
    onSuccess: () => {
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not change password."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!oldPassword || !newPassword) return setError("Both fields are required.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("New passwords don't match.");
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="rise mb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Admin panel</p>
        <h1 className="font-display text-[24px] font-black leading-none tracking-tight text-ink">
          Settings
        </h1>
        {user ? (
          <p className="mt-2 text-[13px] text-muted-ink">
            Signed in as <span className="font-medium text-ink">{user.name}</span> ({user.email})
          </p>
        ) : null}
      </div>

      <div className="rise rounded-2xl bg-surface p-5 ring-1 ring-line">
        <h2 className="font-display text-[16px] font-semibold tracking-tight text-ink">
          Change password
        </h2>
        <p className="mt-1 mb-4 text-[12px] text-muted-ink">
          You'll stay signed in on this device after changing it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-ledger">Current password</label>
            <input
              type="password"
              className="field mt-1.5"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label-ledger">New password</label>
            <input
              type="password"
              className="field mt-1.5"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="label-ledger">Confirm new password</label>
            <input
              type="password"
              className="field mt-1.5"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error ? <p className="text-[12px] font-medium text-withdraw">{error}</p> : null}
          {success ? (
            <p className="text-[12px] font-medium text-deposit">Password changed successfully.</p>
          ) : null}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 w-full rounded-xl bg-ink font-display text-[14px] font-semibold text-paper disabled:opacity-60"
          >
            {mutation.isPending ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
