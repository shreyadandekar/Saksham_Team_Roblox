/**
 * src/context/AuthContext.tsx
 * Centralized authentication state management.
 * Checks current session on startup via GET /api/auth/me (cookie-backed).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type { Role, User } from "../types/auth";
import {
  PREVIEW_ENABLED,
  PREVIEW_USERS,
  isPreviewUser,
  readPreviewRole,
  writePreviewRole,
} from "../lib/preview";
import { loginUser, logoutUser, fetchCurrentUser } from "../api/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enterPreview: (role: Role) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session by verifying cookie with the backend
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedPreview = readPreviewRole();
      if (storedPreview) {
        setUser(PREVIEW_USERS[storedPreview]);
        setLoading(false);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setUser((prev) => (isPreviewUser(prev) ? prev : currentUser));
        }
      } catch {
        if (isMounted) {
          setUser((prev) => (isPreviewUser(prev) ? prev : null));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await loginUser(email, password);
      setUser(response.user);
    } catch (err: any) {
      const message = err.message || "Failed to log in";
      setError(message);
      throw err;
    }
  }, []);

  const enterPreview = useCallback((role: Role) => {
    if (!PREVIEW_ENABLED) return;
    setError(null);
    writePreviewRole(role);
    setUser(PREVIEW_USERS[role]);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (!isPreviewUser(user)) await logoutUser();
    } finally {
      writePreviewRole(null);
      setUser(null);
      setError(null);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        enterPreview,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
