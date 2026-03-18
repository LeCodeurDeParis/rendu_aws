"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSession, signOut as cognitoSignOut } from "./cognito";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  sub: string | null;
  role: string | null;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  sub: null,
  role: null,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (session?.isValid()) {
        const jwt = session.getIdToken().getJwtToken();
        const payload = session.getIdToken().payload;
        setToken(jwt);
        setSub(payload["sub"] as string);
        setRole((payload["custom:role"] as string) ?? "user");
      } else {
        setToken(null);
        setSub(null);
        setRole(null);
      }
    } catch {
      setToken(null);
      setSub(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    cognitoSignOut();
    setToken(null);
    setSub(null);
    setRole(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, isLoading, token, sub, role, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
