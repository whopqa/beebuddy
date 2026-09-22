import { Router } from "express";
import { AccountController } from "./account.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/profile", AccountController.getProfile);
router.put("/profile", AccountController.updateProfile);
router.put("/password", AccountController.changePassword);
router.get("/settings", AccountController.getSettings);
router.put("/settings", AccountController.updateSettings);

export const accountRoutes = router;
