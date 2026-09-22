import { Router } from "express";
import { LegalController } from "./legal.controller";
import { optionalAuth } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/consent", optionalAuth, LegalController.recordConsent);
router.get("/check", optionalAuth, LegalController.checkConsent);

export const legalRoutes = router;
