/**
 * Shared field validation (Phase 3).
 *
 * The zod schemas here are the single validation contract used by the
 * tRPC layer (authoritative), the client forms (early feedback), and the
 * test suites. Category vocabulary matches the category chips shown in
 * the approved UI.
 */
import { z } from "zod";

/** Category vocabulary from the approved mockups (student chips + report select). */
export const ITEM_CATEGORIES = [
  "Electronics",
  "Bags",
  "Clothing",
  "IDs/Cards",
  "Keys",
  "Wallets",
  "Books",
  "Other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const isoDate = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "foundDate must be a valid date",
  );

/**
 * Log Found Item form contract.
 * Mirrors the on-screen fields; limits sized to the UI's max lengths.
 */
export const logFoundItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Item name must be at least 2 characters")
    .max(120, "Item name must be 120 characters or fewer"),
  category: z.enum(ITEM_CATEGORIES, {
    message: "Select a category",
  }),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(160, "Location must be 160 characters or fewer"),
  foundDate: isoDate,
  imageUrl: z.string().url("Photo must be a valid URL").nullish(),
  /** Optional free-form description; stored with the item record. */
  description: z.string().trim().max(2000).optional(),
});

export type LogFoundItemInput = z.infer<typeof logFoundItemSchema>;

/** QR payload contract: CLM-XXXX-XXXX-XXXXXXXX (opaque, not sequential). */
export const QR_CODE_PATTERN = /^CLM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{16}$/;

export function isValidQrPayload(value: string): boolean {
  return QR_CODE_PATTERN.test(value);
}

/**
 * Custom error map so `z.flattenError`/issues carry friendly field messages
 * usable directly by the form UI.
 */
export function formatIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
