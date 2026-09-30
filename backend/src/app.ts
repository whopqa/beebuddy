import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ENV } from "./config/environment";
import { authRoutes } from "./modules/auth/auth.routes";
import { accountRoutes } from "./modules/account/account.routes";
import { postsRoutes } from "./modules/posts/posts.routes";
import { searchRoutes } from "./modules/search/search.routes";
import { paymentsRoutes } from "./modules/payments/payments.routes";
import { legalRoutes } from "./modules/legal/legal.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { communitiesRoutes } from "./modules/communities/communities.routes";
import { conversationsRoutes } from "./modules/conversations/conversations.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { matchingRoutes } from "./modules/matching/matching.routes";
import { wellbeingRoutes } from "./modules/wellbeing/wellbeing.routes";
import { insightsRoutes } from "./modules/insights/insights.routes";
import { connectionsRoutes } from "./modules/connections/connections.routes";
import { mediaRoutes } from "./modules/media/media.routes";
import { leadsRoutes } from "./modules/leads/leads.routes";

export const createApp = () => {
  const app = express();

  // Middlewares
  app.use(
    cors({
      origin: [ENV.CLIENT_URL, "http://localhost:3000"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "BeeBuddy REST API",
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/account", accountRoutes);
  app.use("/api/v1/posts", postsRoutes);
  app.use("/api/v1/search", searchRoutes);
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/legal", legalRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/communities", communitiesRoutes);
  app.use("/api/v1/conversations", conversationsRoutes);
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/matching", matchingRoutes);
  app.use("/api/v1/wellbeing", wellbeingRoutes);
  app.use("/api/v1/insights", insightsRoutes);
  app.use("/api/v1/connections", connectionsRoutes);
  app.use("/api/v1/media", mediaRoutes);
  app.use("/api/v1/leads", leadsRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Đường dẫn không tồn tại: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandler error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Lỗi máy chủ nội bộ",
    });
  });

  return app;
};
