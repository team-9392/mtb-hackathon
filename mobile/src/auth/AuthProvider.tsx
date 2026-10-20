import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, clearTokens, hasSession, lastPhone, OfflineError, rememberPhone, saveTokens } from "@/api/client";
import { isApiConfigured } from "@/api/config";
import type { FamilyResponse, OtpChallenge, SessionClaims, SessionResponse, SessionUser } from "@/api/types";

export type AuthStatus = "loading" | "signedOut" | "signedIn" | "demo";

interface AuthValue {
  status: AuthStatus;
  demoMode: boolean;
  phone: string | null;
  user: SessionUser | null;
  claims: SessionClaims | null;
  requestCode(phone: string): Promise<OtpChallenge>;
  verifyCode(challengeId: string, code: string, os: string): Promise<SessionClaims>;
  createFamily(fullName: string): Promise<void>;
  joinFamily(accessCode: string): Promise<SessionClaims>;
  signOut(): Promise<void>;
  reload(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isApiConfigured ? "loading" : "demo");
  const [phone, setPhone] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [claims, setClaims] = useState<SessionClaims | null>(null);

  const reload = useCallback(async () => {
    if (!isApiConfigured) {
      setStatus("demo");
      return;
    }
    const stored = await lastPhone();
    setPhone(stored);
    if (!(await hasSession())) {
      setStatus("signedOut");
      return;
    }
    try {
      const me = await api<{ user: SessionUser; claims: SessionClaims }>("/me");
      setUser(me.user);
      setClaims(me.claims);
      setStatus("signedIn");
    } catch (error) {
      if (error instanceof OfflineError) {
        setStatus("signedOut");
        return;
      }
      await clearTokens();
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const requestCode = useCallback(async (rawPhone: string) => {
    const challenge = await api<OtpChallenge>("/auth/otp/request", {
      method: "POST",
      body: { phone: rawPhone },
      auth: false,
    });
    await rememberPhone(rawPhone);
    setPhone(rawPhone);
    return challenge;
  }, []);

  const verifyCode = useCallback(async (challengeId: string, code: string, os: string) => {
    const session = await api<SessionResponse>("/auth/otp/verify", {
      method: "POST",
      body: { challengeId, code, os, deviceId: "device-" + os },
      auth: false,
    });
    await saveTokens(session.accessToken, session.refreshToken);
    setUser(session.user);
    setClaims(session.claims);
    setStatus("signedIn");
    return session.claims;
  }, []);

  const createFamily = useCallback(async (fullName: string) => {
    const family = await api<FamilyResponse>("/auth/family", { method: "POST", body: { fullName } });
    await saveTokens(family.accessToken, family.refreshToken);
    setClaims(family.claims);
    return;
  }, []);

  const joinFamily = useCallback(async (accessCode: string) => {
    const joined = await api<FamilyResponse & { claims: SessionClaims }>("/auth/join", {
      method: "POST",
      body: { accessCode },
    });
    await saveTokens(joined.accessToken, joined.refreshToken);
    setClaims(joined.claims);
    return joined.claims;
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setClaims(null);
    setStatus(isApiConfigured ? "signedOut" : "demo");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      demoMode: !isApiConfigured,
      phone,
      user,
      claims,
      requestCode,
      verifyCode,
      createFamily,
      joinFamily,
      signOut,
      reload,
    }),
    [status, phone, user, claims, requestCode, verifyCode, createFamily, joinFamily, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth используется вне AuthProvider");
  }
  return ctx;
}

export function formatPhoneInput(digits: string): string {
  const clean = digits.replace(/[^0-9]/g, "").slice(0, 9);
  const parts = [clean.slice(0, 2), clean.slice(2, 5), clean.slice(5, 7), clean.slice(7, 9)].filter(
    (part) => part.length > 0,
  );
  return parts.join(" ");
}
