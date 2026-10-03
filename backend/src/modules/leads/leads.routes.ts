import { Router } from "express";
import { z } from "zod";
import { sendError, sendSuccess } from "../../common/utils/response";
import { LeadsService } from "./leads.service";

const router = Router();

const leadSchema = z.object({
  kind: z.enum(["lead", "newsletter"]).default("lead"),
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
}).strict().refine((data) => data.kind === "newsletter" || Boolean(data.name), {
  message: "Please enter your full name.",
  path: ["name"],
});

router.post("/", async (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
  try {
    const result = await LeadsService.submit(parsed.data);
    return sendSuccess(res, result, parsed.data.kind === "newsletter"
      ? "Newsletter subscription successful."
      : "Registration successful! BeeBuddy will contact you.");
  } catch (error) {
    return sendError(res, error, 500);
  }
});

export const leadsRoutes = router;
