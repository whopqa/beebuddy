import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | any;
  meta?: any;
}

// Keep legacy service messages from leaking Vietnamese text into the English UI.
const hasVietnameseText = (value: string) => /[À-ỹĐđ]/u.test(value);
const englishMessage = (value: string | undefined, fallback: string) =>
  value && !hasVietnameseText(value) ? value : fallback;

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
  meta?: any
) => {
  return res.status(statusCode).json({
    success: true,
    message: message === undefined ? undefined : englishMessage(message, "Request completed successfully."),
    data,
    meta,
  });
};

export const sendError = (
  res: Response,
  error: string | any,
  statusCode = 400,
  message = "Request failed"
) => {
  const detail = typeof error === "string" ? error : error?.message || error;
  return res.status(statusCode).json({
    success: false,
    message: englishMessage(message, "Request failed"),
    error: typeof detail === "string" ? englishMessage(detail, "Unable to complete the request.") : detail,
  });
};
