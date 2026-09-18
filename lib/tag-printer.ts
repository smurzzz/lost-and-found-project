/**
 * Tag printing (Phase 3).
 *
 * Native: expo-print prints the server-rendered tag HTML directly.
 * Web: a hidden iframe loads the same HTML and triggers window.print().
 * The UI only calls printTag() — platform differences live here.
 */
import { Platform } from "react-native";

export type PrintableTag = {
  html: string;
  /** Suggested job name shown in the print dialog. */
  jobName?: string;
};

export async function printTag(tag: PrintableTag): Promise<void> {
  if (Platform.OS === "web") {
    printViaIframe(tag.html, tag.jobName);
    return;
  }
  const Print = await import("expo-print");
  await Print.printAsync({ html: tag.html });
}

/** Fallback for platforms where expo-print is unavailable (web). */
export async function printToFile(tag: PrintableTag): Promise<string> {
  const Print = await import("expo-print");
  const { uri } = await Print.printToFileAsync({ html: tag.html });
  return uri;
}

function printViaIframe(html: string, jobName?: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.title = jobName ?? "ClaimIt tag";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow?.focus();
  // Give the iframe a tick to lay out images (QR data URL) before printing.
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 60_000);
  }, 300);
}
