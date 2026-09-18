/**
 * Printable tag HTML renderer (Phase 3).
 *
 * Pure function shared by the server (tag-service) and the client
 * (tag-printer) so native prints and web prints look identical.
 */
import type { TagData } from "./claimit-service";

/** Full printable HTML document (A6-friendly tag layout). */
export function renderTagHtml(tag: TagData, qrSvg?: string): string {
  const qrMarkup =
    qrSvg ??
    `<img src="${tag.qrDataUrl}" alt="QR ${tag.item.qrCode}" style="width:180px;height:180px;" />`;
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 16px; color: #0F172A; }
  .card { border: 2px solid #10B981; border-radius: 16px; padding: 16px; max-width: 320px; margin: 0 auto; text-align: center; }
  .brand { font-weight: 800; font-size: 18px; margin-bottom: 4px; }
  .brand span { color: #10B981; }
  .id { font-size: 12px; letter-spacing: 2px; color: #334155; margin: 8px 0 12px; }
  .meta { font-size: 11px; color: #475569; line-height: 1.6; }
  .verified { display: inline-block; margin-top: 12px; font-size: 10px; font-weight: 700; color: #047857; border: 1px solid #A7F3D0; border-radius: 999px; padding: 4px 10px; }
  .footer { margin-top: 10px; font-size: 9px; color: #94A3B8; }
</style></head><body>
  <div class="card">
    <div class="brand">Claim<span>It</span></div>
    <div style="margin: 8px 0;">${qrMarkup}</div>
    <div class="id">${tag.item.qrCode}</div>
    <div class="meta">
      <strong>${escapeHtml(tag.item.name)}</strong><br/>
      ${escapeHtml(tag.item.category)} · ${escapeHtml(tag.item.location)}<br/>
      Logged ${new Date(tag.item.foundDate).toISOString().slice(0, 10)}
    </div>
    <div class="verified">✓ Verified by ClaimIt</div>
    <div class="footer">Scan to verify custody before release.</div>
  </div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
