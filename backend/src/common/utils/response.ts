import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | any;
  meta?: any;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  meta?: any
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const sendError = (
  res: Response,
  error: string | any,
  statusCode = 400,
  message = "Thao tác không thành công"
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: typeof error === "string" ? error : error?.message || error,
  });
};
