export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/webm";
export function validateMedia(file: { type: string; size: number }): string | null {
  if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(file.type)) return "Unsupported format. Choose JPG, PNG, WEBP, MP4 or WEBM.";
  if (file.size === 0) return "This file is empty. Choose another file.";
  if (file.size > (file.type.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return file.type.startsWith("image/") ? "Photos must be 10 MB or smaller." : "Videos must be 15 MB or smaller.";
  return null;
}
export function validateDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return "This video's duration could not be verified. Choose another file.";
  return seconds > MAX_VIDEO_SECONDS ? "Videos must be 60 seconds or shorter." : null;
}