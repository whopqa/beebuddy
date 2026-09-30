import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config/environment", () => ({
  ENV: {
    EMAIL: {
      DELIVERY_MODE: "resend",
      FROM: "BeeBuddy <onboarding@resend.dev>",
      RESEND_API_KEY: "re_test_key",
      VERIFICATION_TTL_MINUTES: 15,
      PASSWORD_RESET_TTL_MINUTES: 30,
    },
  },
}));

import { AuthEmailService } from "../src/modules/auth/auth-email.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthEmailService with Resend", () => {
  it("sends verification emails through the HTTPS API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await AuthEmailService.sendVerificationCode({
      email: "member@example.com",
      fullName: "Bee Buddy",
      code: "123456",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ Authorization: "Bearer re_test_key" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body as string)).toMatchObject({
      from: "BeeBuddy <onboarding@resend.dev>",
      to: ["member@example.com"],
      subject: "123456 là mã xác minh BeeBuddy của bạn",
    });
  });

  it("reports a rejected send instead of claiming delivery", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Domain not verified" }), { status: 403 })));

    await expect(AuthEmailService.sendVerificationCode({
      email: "member@example.com",
      fullName: "Bee Buddy",
      code: "123456",
    })).rejects.toThrow(/HTTP 403.*Domain not verified/);
  });
});
