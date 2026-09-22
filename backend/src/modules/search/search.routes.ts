import { Router } from "express";
import { SearchController } from "./search.controller";

const router = Router();

router.get("/preview", SearchController.searchInterestsPreview);
router.get("/popular", SearchController.getPopularInterests);

export const searchRoutes = router;
