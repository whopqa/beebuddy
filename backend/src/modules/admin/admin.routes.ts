import { Router } from "express";
import { AdminController } from "./admin.controller";
import { adminGuard, authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

// Toàn bộ route admin yêu cầu xác thực JWT và role ADMIN
router.use(authenticate, adminGuard);

// 1. Dashboard Metrics
router.get("/metrics", AdminController.getMetrics);

// 2. Quản lý Người dùng & App Sync
router.get("/users", AdminController.getUsers);
router.put("/users/:id/ban", AdminController.banUser);
router.put("/users/:id/unban", AdminController.unbanUser);
router.put("/users/:id/tier", AdminController.updateUserTier);

// 3. Quản lý Thanh toán & Gói cước
router.get("/payments", AdminController.getPayments);

// 4. Quản lý Kiểm duyệt Bình luận & Từ cấm
router.get("/moderation/comments", AdminController.getFlaggedComments);
router.put("/moderation/comments/:id", AdminController.moderateComment);

// 5. Quản lý Từ cấm
router.get("/badwords", AdminController.getBadwords);
router.post("/badwords", AdminController.addBadword);
router.delete("/badwords/:id", AdminController.deleteBadword);

export const adminRoutes = router;
