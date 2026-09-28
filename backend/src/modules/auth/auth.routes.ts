import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google", AuthController.loginWithGoogle);
router.post("/email-verification/request", AuthController.requestEmailVerification);
router.post("/email-verification/confirm", AuthController.confirmEmailVerification);
router.post("/password-reset/request", AuthController.requestPasswordReset);
router.post("/password-reset/confirm", AuthController.confirmPasswordReset);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authenticate, AuthController.getMe);

export const authRoutes = router;
