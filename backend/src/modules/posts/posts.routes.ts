import { Router } from "express";
import { PostsController } from "./posts.controller";
import { authenticate, optionalAuth } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", optionalAuth, PostsController.getFeed);
router.get("/:postId/comments", optionalAuth, PostsController.getComments);
router.post("/:postId/comments", authenticate, PostsController.createComment);
router.post("/comments/:commentId/report", authenticate, PostsController.reportComment);

export const postsRoutes = router;
