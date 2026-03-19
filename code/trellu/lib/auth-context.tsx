"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSession, signOut as cognitoSignOut, getToken } from "./cognito";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  sub: string | null;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  sub: null,
  logout: () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (session?.isValid()) {
        const jwt = session.getIdToken().getJwtToken();
        setToken(jwt);
        setSub(session.getIdToken().payload["sub"] as string);
      } else {
        setToken(null);
        setSub(null);
      }
    } catch {
      setToken(null);
      setSub(null);
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
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, isLoading, token, sub, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
