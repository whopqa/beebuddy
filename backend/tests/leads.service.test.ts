import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/prisma", () => ({ prisma: { leadSubmission: { upsert } } }));

import { LeadsService } from "../src/modules/leads/leads.service";

describe("LeadsService.submit", () => {
  beforeEach(() => upsert.mockReset());

  it("normalizes and upserts newsletter subscriptions without logging personal data", async () => {
    upsert.mockResolvedValue({});
    await expect(LeadsService.submit({ kind: "newsletter", email: "  MEMBER@Example.Com " }))
      .resolves.toEqual({ accepted: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { kind_email: { kind: "newsletter", email: "member@example.com" } },
      create: expect.objectContaining({ kind: "newsletter", email: "member@example.com" }),
    }));
  });

  it("keeps contact lead details on a repeated submission", async () => {
    upsert.mockResolvedValue({});
    await LeadsService.submit({ kind: "lead", email: "lead@example.com", name: "  Linh  ", message: "  Hi  " });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ name: "Linh", message: "Hi" }),
    }));
  });
});
