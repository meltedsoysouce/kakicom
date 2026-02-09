import type { Payload, TextPayload, ImagePayload, MixedPayload, BlobId } from "./types.ts";

export function isTextPayload(p: Payload): p is TextPayload {
  return p.type === "text";
}

export function hasImage(p: Payload): p is ImagePayload | MixedPayload {
  return p.type === "image" || p.type === "mixed";
}

export function extractText(p: Payload): string {
  switch (p.type) {
    case "text": return p.text;
    case "mixed": return p.memo;
    case "image": return "";
  }
}

export function extractBlobId(p: Payload): BlobId | null {
  return p.type === "text" ? null : p.blobId;
}
