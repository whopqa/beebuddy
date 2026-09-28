const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = configuredUrl?.replace(/\/+$/, "") ?? "";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type User = {
  id: string;
  email: string;
  role: string;
  tier: string;
  profile?: { fullName: string; username?: string | null } | null;
};

export type Tokens = { accessToken: string; refreshToken: string };
export type AuthResult = Tokens & { user: User };
export type RegisterResult = {
  user: User;
  verificationRequired: true;
  verificationSent: boolean;
  developmentCode?: string;
};

export type FeedPost = {
  id: string;
  content: string;
  createdAt: string;
  visibility: string;
  likesCount: number;
  commentsCount: number;
  author: { fullName: string; username: string };
};

export type FeedResult = {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Chưa cấu hình EXPO_PUBLIC_API_URL trong mobile/.env.local");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Platform": "mobile",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Không kết nối được API. Kiểm tra địa chỉ server và kết nối mạng.");
  }

  let body: ApiEnvelope<T>;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`API trả về dữ liệu không hợp lệ (HTTP ${response.status}).`, response.status);
  }

  if (!response.ok || !body.success || body.data === undefined) {
    throw new ApiError(body.error || body.message || `Yêu cầu thất bại (HTTP ${response.status}).`, response.status);
  }

  return body.data;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (fullName: string, email: string, password: string, acceptTerms: boolean, acceptPrivacy: boolean) =>
    apiRequest<RegisterResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, acceptTerms, acceptPrivacy }),
    }),
  requestEmailVerification: (email: string) =>
    apiRequest<{ requested: boolean; message: string; developmentCode?: string }>("/auth/email-verification/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmEmailVerification: (email: string, code: string) =>
    apiRequest<AuthResult>("/auth/email-verification/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  requestPasswordReset: (email: string) =>
    apiRequest<{ requested: boolean; message: string }>("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  me: (accessToken: string) => apiRequest<User>("/auth/me", {}, accessToken),
  refresh: (refreshToken: string) =>
    apiRequest<Tokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  logout: (refreshToken: string) =>
    apiRequest<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

export const postsApi = {
  feed: (token?: string) => apiRequest<FeedResult>("/posts?page=1&limit=20", {}, token),
};
