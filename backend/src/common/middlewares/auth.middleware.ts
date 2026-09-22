import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/environment";
import { Role, SubscriptionTier } from "@prisma/client";
import { sendError } from "../utils/response";

export interface AuthUserPayload {
  id: string;
  email: string;
  role: Role;
  tier: SubscriptionTier;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Yêu cầu đăng nhập để thực hiện thao tác này", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT.SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return sendError(res, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ", 401);
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT.SECRET) as AuthUserPayload;
      req.user = decoded;
    } catch {
      // Ignore invalid token in optional auth, proceed as guest
      req.user = undefined;
    }
  }
  next();
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Yêu cầu đăng nhập để truy cập tài nguyên này", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, "Bạn không có quyền thực hiện thao tác này (Admin Only)", 403);
    }

    next();
  };
};

export const adminGuard = requireRole([Role.ADMIN]);
