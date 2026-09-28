import type { ApiEnvelope } from "./auth-types";

export type UploadedImage = {
  id: string;
  sourceUrl: string;
  mimeType: string;
  byteSize: number;
  processingStatus: "READY";
  purpose: "avatar" | "post" | "message";
};

export async function uploadImage(file: File, purpose: UploadedImage["purpose"]): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Vui lòng chọn một file ảnh");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 5 MB");

  const response = await fetch(`/api/media/images?purpose=${encodeURIComponent(purpose)}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<UploadedImage>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || body.message || "Upload ảnh không thành công");
  }
  return body.data;
}
