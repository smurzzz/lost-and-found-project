/**
 * QR tag service (Phase 3).
 *
 * Generates opaque, non-sequential tag payloads (CLM-XXXX-XXXX-XXXX...)
 * with collision-safe uniqueness against found_items.qr_code, and renders
 * them as PNG/SVG data URLs for preview and printing. The payload carries
 * only the opaque identifier — never item details (privacy rule from
 * docs/ClaimIt Library Documentation.md).
 */
import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import QRCode from "qrcode";

import { getDb } from "../db/client";
import { foundItems } from "../db/schema";
import { isValidQrPayload } from "../../shared/validation";

/** 4 hex chars helper. */
function hex(count: number): string {
  return randomBytes(count).toString("hex").slice(0, count).toUpperCase();
}

/** Format: CLM-XXXX-XXXX-XXXXXXXXXXXXXXXX (matches shared/validation). */
export function generateQrPayload(): string {
  return `CLM-${hex(4)}-${hex(4)}-${hex(16)}`;
}

/**
 * Generate a payload that is unique in the database. Retries on the
 * (astronomically unlikely) unique-index collision.
 */
export async function generateUniqueQrPayload(maxAttempts = 5): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const payload = generateQrPayload();
    const existing = await db
      .select({ id: foundItems.id })
      .from(foundItems)
      .where(eq(foundItems.qrCode, payload))
      .limit(1);
    if (!existing[0]) return payload;
  }
  throw new Error("Could not generate a unique QR payload");
}

/** PNG data URL for <Image> preview and expo-print HTML embedding. */
export async function renderQrPng(payload: string): Promise<string> {
  if (!isValidQrPayload(payload)) throw new Error("Invalid QR payload");
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#0F172AFF", light: "#FFFFFFFF" },
  });
}

/** SVG markup for print layouts that prefer vector output. */
export async function renderQrSvg(payload: string): Promise<string> {
  if (!isValidQrPayload(payload)) throw new Error("Invalid QR payload");
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });
}
