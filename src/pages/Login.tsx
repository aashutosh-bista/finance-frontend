import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { ready, authenticated, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && authenticated) navigate("/dashboard", { replace: true });
  }, [ready, authenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-paper px-4 py-10">
      <div className="mx-auto w-full max-w-sm rise">
        <div className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Group Save Ledger
          </p>
          <h1 className="mt-1 font-display text-[30px] font-black leading-none tracking-tight text-ink">
            Passbook
          </h1>
          <p className="mt-2 text-[13px] text-muted-ink">
            Administrator sign-in to the savings ledger.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line"
        >
          <div>
            <label htmlFor="email" className="label-ledger">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field mt-1.5"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label-ledger">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field mt-1.5"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="text-[12px] font-medium text-withdraw">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-ink font-display text-[15px] font-semibold tracking-tight text-paper disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-ink">
          No account yet? Ask whoever ran the backend to register or seed one for you.
        </p>
      </div>
    </main>
  );
}
