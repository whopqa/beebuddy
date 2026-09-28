import { Router, raw } from "express";
import { authenticate, optionalAuth } from "../../common/middlewares/auth.middleware";
import { ENV } from "../../config/environment";
import { MediaController } from "./media.controller";

const router = Router();

router.post(
  "/images",
  authenticate,
  raw({ type: "image/*", limit: ENV.MEDIA.IMAGE_MAX_BYTES }),
  MediaController.uploadImage
);
router.get("/:assetId/content", optionalAuth, MediaController.getContent);

export const mediaRoutes = router;
