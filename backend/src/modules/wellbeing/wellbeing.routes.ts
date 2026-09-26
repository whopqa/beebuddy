import { Router } from "express"; import { authenticate } from "../../common/middlewares/auth.middleware"; import { WellbeingController } from "./wellbeing.controller";
const router=Router();router.use(authenticate);
router.get("/moods",WellbeingController.moods);router.post("/moods",WellbeingController.createMood);
router.get("/routines",WellbeingController.routines);router.post("/routines",WellbeingController.createRoutine);router.put("/routines/:routineId/active",WellbeingController.active);router.put("/routines/:routineId/completion",WellbeingController.complete);
router.get("/suggestions",WellbeingController.suggestions);router.put("/suggestions/:suggestionId",WellbeingController.respondSuggestion);
router.get("/memories",WellbeingController.memories);router.post("/memories",WellbeingController.createMemory);router.delete("/memories/:memoryId",WellbeingController.revokeMemory);
router.post("/mascot/conversation",WellbeingController.mascotConversation);
export const wellbeingRoutes=router;
