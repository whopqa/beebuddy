import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", authenticate, AuthController.getMe);

export const authRoutes = router;
