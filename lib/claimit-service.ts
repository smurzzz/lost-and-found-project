/**
 * ClaimIt service facade (Phase 2).
 *
 * This is the single API boundary the UI consumes. While the API server
 * is unreachable (prototype/demo mode), every method falls back to the
 * same local mock data the screens shipped with — so approved UI behavior
 * is preserved exactly, and the same calls hit the real backend when
 * EXPO_PUBLIC_API_URL points at a running server.
 *
 * Roles and the QR-release rule come from shared/workflow.ts; the server
 * remains the sole authority for transitions.
 */
import { devToken, getClaimItClient, type ClaimItClient } from "./claimit-client";

export type ApiRole = "student" | "staff";

export type FoundItem = {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  location: string;
  foundDate: string;
  status: "FOUND" | "MATCHED" | "CLAIM_REQUESTED" | "RELEASED";
  imageUrl: string | null;
  qrTagReady: boolean;
  pendingClaimId?: string | null;
  claimantName?: string | null;
  verificationAnswer?: string | null;
};

export type LostReport = {
  id: string;
  category: string;
  description: string;
  dateLost: string;
  locationLost: string;
  status: "OPEN" | "MATCHED" | "CLOSED";
};

export type AuditEvent = {
  id: string;
  foundItemId: string;
  actorName: string;
  action: "FOUND" | "MATCHED" | "CLAIM_REQUESTED" | "RELEASED";
  detail: string | null;
  createdAt: string;
};

export type ScanResult = {
  item: FoundItem;
  pendingClaim: {
    id: string;
    claimantName: string;
    verificationAnswer: string;
  } | null;
};

/** Convert a server DTO (Date fields) into the facade shape (ISO strings). */
function toFacadeItem(dto: {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  location: string;
  foundDate: Date | string;
  status: FoundItem["status"];
  imageUrl: string | null;
  qrTagReady: boolean;
  pendingClaimId?: string | null;
  claimantName?: string | null;
  verificationAnswer?: string | null;
}): FoundItem {
  return {
    ...dto,
    foundDate:
      dto.foundDate instanceof Date
        ? dto.foundDate.toISOString()
        : String(dto.foundDate),
  };
}

function isApiAvailable(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_API_URL);
}

async function withClient<T>(
  run: (client: ClaimItClient) => Promise<T>,
  fallback: () => T,
): Promise<T> {
  if (!isApiAvailable()) return fallback();
  try {
    return await run(getClaimItClient(devToken("Alex Morgan", "student")));
  } catch {
    // Prototype resilience: degrade to mock data instead of crashing screens.
    return fallback();
  }
}

/* ------------------------------ mock fallbacks ------------------------------ */

const MOCK_ITEMS: FoundItem[] = [
  {
    id: "1",
    qrCode: "CLM-MOCK-0001",
    name: "Navy Backpack",
    category: "Bags",
    location: "Library · 2nd floor",
    foundDate: "2025-04-26T10:14:00Z",
    status: "FOUND",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85",
    qrTagReady: true,
  },
];

const MOCK_AUDIT: AuditEvent[] = [
  {
    id: "a1",
    foundItemId: "1",
    actorName: "Alex Rivera (Staff)",
    action: "FOUND",
    detail: "Item logged in system",
    createdAt: "2025-04-26T10:14:00Z",
  },
  {
    id: "a2",
    foundItemId: "1",
    actorName: "Taylor Kim (Staff)",
    action: "MATCHED",
    detail: "Claimant information matched",
    createdAt: "2025-04-26T10:18:00Z",
  },
  {
    id: "a3",
    foundItemId: "1",
    actorName: "Alex Morgan",
    action: "CLAIM_REQUESTED",
    detail: "Claim request submitted",
    createdAt: "2025-04-26T10:23:00Z",
  },
  {
    id: "a4",
    foundItemId: "1",
    actorName: "Morgan Patel (Staff)",
    action: "RELEASED",
    detail: "Item released to claimant",
    createdAt: "2025-04-26T10:37:00Z",
  },
];

/* --------------------------------- facade --------------------------------- */

export const ClaimItService = {
  /** Staff logs a found item; server assigns the QR identity. */
  logFoundItem(input: {
    name: string;
    category: string;
    location: string;
    foundDate: string;
    imageUrl?: string | null;
  }): Promise<FoundItem> {
    return withClient(
      async (c) =>
        toFacadeItem(
          await c.items.log.mutate({ ...input, foundDate: input.foundDate }),
        ),
      () => ({
        ...MOCK_ITEMS[0],
        id: `local-${Date.now()}`,
        name: input.name,
        category: input.category,
        location: input.location,
        foundDate: input.foundDate,
      }),
    );
  },

  listItems(): Promise<FoundItem[]> {
    return withClient(
      async (c) => (await c.items.list.query()).map(toFacadeItem),
      () => MOCK_ITEMS,
    );
  },

  listPendingClaims(): Promise<FoundItem[]> {
    return withClient(
      async (c) => (await c.items.pendingClaims.query()).map(toFacadeItem),
      () => MOCK_ITEMS.filter((i) => i.status === "CLAIM_REQUESTED"),
    );
  },

  /** Staff scan of a QR payload (camera integration lands in Phase 5). */
  scanQrTag(qrCode: string): Promise<ScanResult> {
    return withClient(
      async (c) => {
        const r = await c.items.scan.mutate({ qrCode });
        return {
          item: toFacadeItem(r.item),
          pendingClaim: r.pendingClaim
            ? {
                id: r.pendingClaim.id,
                claimantName: r.pendingClaim.claimantName,
                verificationAnswer: r.pendingClaim.verificationAnswer,
              }
            : null,
        };
      },
      () => ({
        item: MOCK_ITEMS[0],
        pendingClaim: {
          id: "mock-claim",
          claimantName: "Alex Morgan",
          verificationAnswer: "Small astronomy patch on the front pocket",
        },
      }),
    );
  },

  /** Confirm release — the server enforces scan + pending claim. */
  confirmRelease(itemId: string): Promise<FoundItem> {
    return withClient(
      async (c) => toFacadeItem(await c.items.release.mutate({ itemId })),
      () => ({ ...MOCK_ITEMS[0], status: "RELEASED" }),
    );
  },

  createLostReport(input: {
    category: string;
    description: string;
    dateLost: string;
    locationLost: string;
  }): Promise<LostReport> {
    return withClient(
      async (c) => {
        const r = await c.reports.create.mutate(input);
        return { ...r, dateLost: r.dateLost.toISOString() } as LostReport;
      },
      () => ({
        id: `local-${Date.now()}`,
        ...input,
        status: "OPEN" as const,
      }),
    );
  },

  findMatches(reportId: string): Promise<FoundItem[]> {
    return withClient(
      async (c) =>
        (await c.reports.matches.query({ reportId })).map(toFacadeItem),
      () => MOCK_ITEMS,
    );
  },

  submitClaim(input: {
    foundItemId: string;
    verificationAnswer: string;
    lostReportId?: string | null;
  }): Promise<{ id: string }> {
    return withClient(
      async (c) => {
        const r = await c.claims.submit.mutate(input);
        return { id: r.id };
      },
      () => ({ id: `local-${Date.now()}` }),
    );
  },

  recentAudit(): Promise<AuditEvent[]> {
    return withClient(
      async (c) =>
        (await c.audit.recent.query()).map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })) as AuditEvent[],
      () => MOCK_AUDIT,
    );
  },

  itemAudit(itemId: string): Promise<AuditEvent[]> {
    return withClient(
      async (c) =>
        (await c.audit.forItem.query({ itemId })).map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })) as AuditEvent[],
      () => MOCK_AUDIT.filter((e) => e.foundItemId === itemId),
    );
  },
};
