import { prisma } from "../../lib/prisma";

export type LeadInput = {
  kind: "lead" | "newsletter";
  email: string;
  name?: string;
  phone?: string;
  message?: string;
};

export class LeadsService {
  public static async submit(input: LeadInput) {
    const email = input.email.trim().toLowerCase();
    const kind = input.kind;
    await prisma.leadSubmission.upsert({
      where: { kind_email: { kind, email } },
      update: {
        ...(kind === "lead" ? {
          name: input.name?.trim() || null,
          phone: input.phone?.trim() || null,
          message: input.message?.trim() || null,
        } : {}),
      },
      create: {
        kind,
        email,
        name: kind === "lead" ? input.name?.trim() || null : null,
        phone: kind === "lead" ? input.phone?.trim() || null : null,
        message: kind === "lead" ? input.message?.trim() || null : null,
      },
    });
    return { accepted: true };
  }
}
