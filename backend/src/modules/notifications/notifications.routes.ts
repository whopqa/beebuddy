import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { NotificationsController } from "./notifications.controller";

const router = Router();
router.use(authenticate);
router.get("/", NotificationsController.list);
router.post("/read-all", NotificationsController.readAll);
router.post("/:notificationId/read", NotificationsController.read);
router.get("/preferences", NotificationsController.preferences);
router.put("/preferences", NotificationsController.setPreference);
router.post("/devices", NotificationsController.registerToken);
router.delete("/devices", NotificationsController.revokeToken);
export const notificationsRoutes = router;
