import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { sendError, sendSuccess } from "../../common/utils/response";

export class SearchController {
  public static async searchInterestsPreview(req: Request, res: Response) {
    try {
      const q = (req.query.q as string) || "";
      const parseFilter = (name: string) => String(req.query[name] || "")
        .split(",").map((value) => value.trim().slice(0, 80)).filter(Boolean).slice(0, 10);
      const result = await SearchService.searchInterestsPreview(q, {
        interests: parseFilter("interests"),
        skills: parseFilter("skills"),
        availability: parseFilter("availability"),
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  public static async getPopularInterests(req: Request, res: Response) {
    try {
      const interests = await SearchService.getPopularInterests();
      return sendSuccess(res, interests);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
