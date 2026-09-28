export type WebUser = {
  id: string;
  email: string;
  role: "GUEST" | "USER" | "ADMIN";
  tier: "FREE" | "VIP" | "PRO";
  isVerified?: boolean;
  tierExpiresAt?: string | null;
  profile?: {
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type AuthPayload = {
  user: WebUser;
  accessToken: string;
  refreshToken: string;
};

export type RegisterPayload = {
  user: WebUser;
  verificationRequired: true;
  verificationSent: boolean;
  developmentCode?: string;
};

export type AuthRequestResult = {
  requested: boolean;
  message: string;
  developmentCode?: string;
  developmentActionUrl?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};
