import jwt from "jsonwebtoken";
import { Role, SubscriptionTier } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../src/config/environment";
import { authenticate } from "../src/common/middlewares/auth.middleware";
import { prisma } from "../src/lib/prisma";

afterEach(() => {
  vi.restoreAllMocks();
});

function signedToken(role = Role.USER, sessionId?: string) {
  return jwt.sign({
    id: "user-1",
    email: "member@beebuddy.vn",
    role,
    tier: SubscriptionTier.FREE,
    sessionId,
  }, ENV.JWT.SECRET, { algorithm: "HS256" });
}

function responseDouble() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("authenticate middleware", () => {
  it("rejects an already-issued token after the account is banned", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-1",
      email: "member@beebuddy.vn",
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isBanned: true,
    } as never);

    const request = { headers: { authorization: `Bearer ${signedToken()}` } };
    const response = responseDouble();
    const next = vi.fn();

    await authenticate(request as never, response as never, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("uses the current database role instead of a stale role in the token", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-1",
      email: "member@beebuddy.vn",
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isBanned: false,
    } as never);

    const request = { headers: { authorization: `Bearer ${signedToken(Role.ADMIN)}` } };
    const response = responseDouble();
    const next = vi.fn();

    await authenticate(request as never, response as never, next);

    expect(request).toHaveProperty("user.role", Role.USER);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects an access token after its session is revoked", async () => {
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-1",
      email: "member@beebuddy.vn",
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isBanned: false,
    } as never);
    vi.spyOn(prisma.userSession, "findFirst").mockResolvedValue(null);

    const request = {
      headers: { authorization: `Bearer ${signedToken(Role.USER, "session-1")}` },
    };
    const response = responseDouble();
    const next = vi.fn();

    await authenticate(request as never, response as never, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
