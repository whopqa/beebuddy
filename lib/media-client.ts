import type { ApiEnvelope } from "./auth-types";

export type UploadedImage = {
  id: string;
  sourceUrl: string;
  mimeType: string;
  byteSize: number;
  processingStatus: "READY";
  purpose: "avatar" | "profile" | "post" | "message";
};

export async function uploadImage(file: File, purpose: UploadedImage["purpose"]): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please select an image file");
  if (file.size > 4 * 1024 * 1024) throw new Error("Images must be smaller than 4 MB");

  const response = await fetch(`/api/media/images?purpose=${encodeURIComponent(purpose)}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<UploadedImage>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || body.message || "Image upload failed");
  }
  return body.data;
}
