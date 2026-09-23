import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role, SubscriptionTier } from "@prisma/client";
import { ENV } from "../../config/environment";
import { prisma } from "../../lib/prisma";
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

function decodeAccessToken(token: string) {
  const decoded = jwt.verify(token, ENV.JWT.SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || typeof decoded.id !== "string") {
    throw new Error("Invalid access token payload");
  }
  return decoded as AuthUserPayload;
}

async function loadCurrentUser(decoded: AuthUserPayload) {
  return prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, role: true, tier: true, isBanned: true },
  });
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return sendError(res, "Yêu cầu đăng nhập để thực hiện thao tác này", 401);
  }

  try {
    const decoded = decodeAccessToken(authHeader.slice(7));
    const user = await loadCurrentUser(decoded);

    if (!user) {
      return sendError(res, "Tài khoản không còn tồn tại", 401);
    }
    if (user.isBanned) {
      return sendError(res, "Tài khoản đã bị khóa", 403);
    }

    req.user = { id: user.id, email: user.email, role: user.role, tier: user.tier };
    return next();
  } catch {
    return sendError(res, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ", 401);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const decoded = decodeAccessToken(authHeader.slice(7));
    const user = await loadCurrentUser(decoded);

    if (!user) {
      req.user = undefined;
      return next();
    }
    if (user.isBanned) {
      return sendError(res, "Tài khoản đã bị khóa", 403);
    }

    req.user = { id: user.id, email: user.email, role: user.role, tier: user.tier };
    return next();
  } catch {
    // Optional endpoints still work as Guest when a token is expired or malformed.
    req.user = undefined;
    return next();
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Yêu cầu đăng nhập để truy cập tài nguyên này", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, "Bạn không có quyền thực hiện thao tác này", 403);
    }

    return next();
  };
};

export const adminGuard = requireRole([Role.ADMIN]);
