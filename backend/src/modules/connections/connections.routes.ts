import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { ConnectionsController } from "./connections.controller";

const router = Router();
router.use(authenticate);
router.get("/", ConnectionsController.list);
router.post("/", ConnectionsController.request);
router.post("/:connectionId/respond", ConnectionsController.respond);
router.post("/:connectionId/cancel", ConnectionsController.cancel);
router.delete("/:connectionId", ConnectionsController.remove);

export const connectionsRoutes = router;
