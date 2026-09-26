import { Router } from "express";
import { authenticate, optionalAuth } from "../../common/middlewares/auth.middleware";
import { CommunitiesController } from "./communities.controller";
import { PostsController } from "../posts/posts.controller";

const router = Router();

router.get("/", optionalAuth, CommunitiesController.list);
router.get("/slug/:slug", optionalAuth, CommunitiesController.get);
router.get("/:communityId/posts", optionalAuth, PostsController.getCommunityFeed);
router.post("/:communityId/posts", authenticate, PostsController.createCommunityPost);
router.post("/", authenticate, CommunitiesController.create);
router.post("/invites/accept", authenticate, CommunitiesController.acceptInvite);
router.post("/:communityId/join", authenticate, CommunitiesController.join);
router.post("/:communityId/leave", authenticate, CommunitiesController.leave);
router.post("/:communityId/transfer-owner", authenticate, CommunitiesController.transfer);
router.post("/:communityId/invites", authenticate, CommunitiesController.invite);
router.post("/:communityId/join-requests/:requestId/respond", authenticate, CommunitiesController.respondJoinRequest);

export const communitiesRoutes = router;
