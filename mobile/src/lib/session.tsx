import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, authApi, AuthResult, Tokens, User } from "./api";

const SESSION_KEY = "beebuddy_session";

type SessionContextValue = {
  loading: boolean;
  user: User | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (fullName: string, email: string, password: string, acceptTerms: boolean, acceptPrivacy: boolean) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = await SecureStore.getItemAsync(SESSION_KEY);
        if (!saved) return;
        const storedTokens = JSON.parse(saved) as Tokens;
        try {
          const currentUser = await authApi.me(storedTokens.accessToken);
          if (active) {
            setUser(currentUser);
            setTokens(storedTokens);
          }
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
          const refreshed = await authApi.refresh(storedTokens.refreshToken);
          const currentUser = await authApi.me(refreshed.accessToken);
          await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(refreshed));
          if (active) {
            setUser(currentUser);
            setTokens(refreshed);
          }
        }
      } catch (error) {
        // Keep the saved session if the server is only temporarily unreachable.
        if (error instanceof ApiError && error.status === 401) {
          await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  const acceptSession = useCallback(async (result: AuthResult) => {
    const nextTokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextTokens));
    setTokens(nextTokens);
    setUser(result.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await acceptSession(await authApi.login(email.trim(), password));
  }, [acceptSession]);

  const signUp = useCallback(async (fullName: string, email: string, password: string, acceptTerms: boolean, acceptPrivacy: boolean) => {
    await acceptSession(await authApi.register(fullName.trim(), email.trim(), password, acceptTerms, acceptPrivacy));
  }, [acceptSession]);

  const signOut = useCallback(async () => {
    if (tokens?.refreshToken) {
      await authApi.logout(tokens.refreshToken).catch(() => undefined);
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setTokens(null);
    setUser(null);
  }, [tokens]);

  return (
    <SessionContext.Provider value={{ loading, user, accessToken: tokens?.accessToken ?? null, signIn, signUp, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession phải nằm trong SessionProvider");
  return value;
}
