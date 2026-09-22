import { Router } from "express";
import { PaymentsController } from "./payments.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public / User routes
router.get("/plans", PaymentsController.getPlans);
router.post("/webhook", PaymentsController.handleWebhook);
router.get("/status/:orderCode", PaymentsController.getPaymentStatus);

// Authenticated User routes
router.post("/create-checkout", authenticate, PaymentsController.createCheckout);
router.get("/my-history", authenticate, PaymentsController.getMyPayments);

export const paymentsRoutes = router;
