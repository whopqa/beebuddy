import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { ConversationsController } from "./conversations.controller";

const router = Router();
router.use(authenticate);
router.get("/events", ConversationsController.events);
router.get("/", ConversationsController.list);
router.post("/direct", ConversationsController.direct);
router.post("/groups", ConversationsController.group);
router.put("/messages/:messageId/reaction", ConversationsController.react);
router.get("/:conversationId/messages", ConversationsController.messages);
router.post("/:conversationId/messages", ConversationsController.send);
router.post("/:conversationId/messages/media", ConversationsController.sendMedia);
router.post("/:conversationId/read", ConversationsController.read);
router.post("/:conversationId/members", ConversationsController.addMembers);
router.delete("/:conversationId/members/:userId", ConversationsController.removeMember);
router.post("/:conversationId/leave", ConversationsController.leave);
router.post("/:conversationId/transfer-owner", ConversationsController.transfer);
router.get("/:conversationId/calls", ConversationsController.calls);
router.post("/:conversationId/calls", ConversationsController.startCall);
router.post("/calls/:callId/respond", ConversationsController.respondCall);
router.post("/calls/:callId/end", ConversationsController.endCall);

export const conversationsRoutes = router;
