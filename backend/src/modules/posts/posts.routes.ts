import { Router } from "express";
import { PostsController } from "./posts.controller";
import { authenticate, optionalAuth } from "../../common/middlewares/auth.middleware";

const router = Router();

router.get("/", optionalAuth, PostsController.getFeed);
router.post("/", authenticate, PostsController.createPost);
router.post("/comments/:commentId/report", authenticate, PostsController.reportComment);
router.put("/:postId/like", authenticate, PostsController.likePost);
router.delete("/:postId/like", authenticate, PostsController.unlikePost);
router.post("/:postId/report", authenticate, PostsController.reportPost);
router.put("/:postId", authenticate, PostsController.updatePost);
router.delete("/:postId", authenticate, PostsController.deletePost);
router.get("/:postId/comments", optionalAuth, PostsController.getComments);
router.post("/:postId/comments", authenticate, PostsController.createComment);

export const postsRoutes = router;
