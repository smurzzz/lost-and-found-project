/**
 * Tag service (Phase 3).
 *
 * Renders the printable tag document for a found item: QR data URL,
 * item summary, and verification line. Output feeds expo-print on
 * native and a print window on web (lib/tag-printer.ts).
 */
import QRCode from "qrcode";

import { renderTagHtml } from "../../lib/tag-html";
import { getFoundItem, type FoundItemDto } from "./found-item-service";

export type TagData = {
  item: FoundItemDto;
  qrDataUrl: string;
  renderedAt: string;
};

// The printable document renderer lives in lib/tag-html.ts so the client
// prints byte-identical markup without importing server code.
export { renderTagHtml };

/** Build tag data (QR PNG) for an item; throws if the item is unknown. */
export async function buildTagData(itemId: string): Promise<TagData> {
  const item = await getFoundItem(itemId);
  if (!item) throw new Error("Item not found");
  const qrDataUrl = await QRCode.toDataURL(item.qrCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#0F172AFF", light: "#FFFFFFFF" },
  });
  return { item, qrDataUrl, renderedAt: new Date().toISOString() };
}
