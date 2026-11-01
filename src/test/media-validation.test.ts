import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, validateMedia, validateDuration } from "@/lib/media-validation";
describe("Media limits", () => {
  it("accepts supported photos", () => { for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(validateMedia({ type, size: 100 })).toBeNull(); });
  it("accepts supported videos", () => { for (const type of ["video/mp4", "video/webm"]) expect(validateMedia({ type, size: 100 })).toBeNull(); });
  it("rejects unconfigured formats", () => { expect(validateMedia({ type: "video/quicktime", size: 100 })).not.toBeNull(); });
  it("rejects empty files", () => { expect(validateMedia({ type: "image/png", size: 0 })).not.toBeNull(); });
  it("limits images to 10 MB", () => { expect(validateMedia({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull(); expect(validateMedia({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).not.toBeNull(); });
  it("limits video to 15 MB", () => { expect(validateMedia({ type: "video/webm", size: MAX_VIDEO_BYTES })).toBeNull(); expect(validateMedia({ type: "video/webm", size: MAX_VIDEO_BYTES + 1 })).not.toBeNull(); });
  it("limits videos to 60 seconds", () => { expect(validateDuration(60)).toBeNull(); expect(validateDuration(61)).not.toBeNull(); });
  it("rejects unknown duration", () => { expect(validateDuration(Infinity)).not.toBeNull(); expect(validateDuration(NaN)).not.toBeNull(); });
});