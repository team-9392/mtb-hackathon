export interface SessionUser {
  id: string;
  phone: string;
  full_name?: string | null;
}

export interface SessionClaims {
  sub: string;
  familyId: string | null;
  role: "parent" | "child";
  childId: string | null;
}

export interface OtpChallenge {
  challengeId: string;
  ttlSeconds: number;
  channel: "telegram" | "none";
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  claims: SessionClaims;
  user: SessionUser;
  needsFamily?: boolean;
}

export interface FamilyResponse {
  family: { id: string; invite_code: string; tariff: string; currency: string };
  accessToken: string;
  refreshToken: string;
  claims: SessionClaims;
}
