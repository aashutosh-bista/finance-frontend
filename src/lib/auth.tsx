import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type AuthUser,
  fetchCurrentUser,
  getCachedUser,
  login as apiLogin,
  logout as apiLogout,
} from "../api";

interface AuthState {
  /** false until the initial session check (GET /auth/me) has completed. */
  ready: boolean;
  /** Whether there's a live, server-confirmed session — not just a cached guess. */
  authenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(getCachedUser());

  useEffect(() => {
    // The real session lives in an httpOnly cookie we can't read from JS, so
    // on load we ask the backend directly whether it's still valid. The
    // cached user (if any) is shown immediately for a snappier first paint
    // while this check is in flight.
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setAuthenticated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const loggedInUser = await apiLogin(email, password);
    setUser(loggedInUser);
    setAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ ready, authenticated, user, signIn, signOut }),
    [ready, authenticated, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
