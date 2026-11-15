import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { SessionProfile, SessionUser } from "@/types";

interface AuthValue {
  user: SessionUser | null;
  permissions: Set<string>;
  scopedToParty: boolean;
  isLoading: boolean;
  has: (...permissions: string[]) => boolean;
  hasAny: (...permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<SessionProfile>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const session = useQuery<SessionProfile | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.get<SessionProfile>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.post<SessionProfile>("/auth/login", { email, password }),
    onSuccess: (profile) => {
      queryClient.setQueryData(["session"], profile);
      queryClient.invalidateQueries();
    },
  });

  const login = useCallback(
    async (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    [loginMutation],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    queryClient.setQueryData(["session"], null);
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => {
    const permissions = new Set(session.data?.permissions ?? []);
    return {
      user: session.data?.user ?? null,
      permissions,
      scopedToParty: session.data?.scopedToParty ?? false,
      isLoading: session.isLoading,
      has: (...required: string[]) => required.every((permission) => permissions.has(permission)),
      hasAny: (...required: string[]) => required.some((permission) => permissions.has(permission)),
      login,
      logout,
      refresh,
    };
  }, [session.data, session.isLoading, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
