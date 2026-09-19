import { describe, expect, it, vi } from "vitest";

import {
  classifyPermission,
  extractTapPayload,
  type NotificationTap,
} from "../lib/push-service";

// The expo-notifications native module cannot load under Node; the state
// machine under test only needs its shape, so mock it at the boundary.
// hoisted above the imports via vi.mock's registry.
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: () => undefined })),
  AndroidImportance: { DEFAULT: 3 },
}));
vi.mock("expo-constants", () => ({
  default: { appOwnership: "expo", executionEnvironment: null },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios", Version: "17.0" } }));

describe("push permission state machine (Phase 6)", () => {
  it("classifies granted permission", () => {
    expect(classifyPermission({ granted: true })).toBe("granted");
  });

  it("classifies denied permission", () => {
    expect(classifyPermission({ granted: false })).toBe("denied");
  });

  it("classifies a missing permission response as unavailable", () => {
    expect(classifyPermission(null)).toBe("unavailable");
    expect(classifyPermission(undefined)).toBe("unavailable");
  });
});

describe("push tap payload extraction (Phase 6)", () => {
  it("extracts the deep-link route and item id from a MATCH_FOUND push", () => {
    const response = {
      notification: {
        request: {
          content: {
            data: {
              kind: "MATCH_FOUND",
              deepLink: "matches",
              foundItemId: "item-123",
            },
          },
        },
      },
    };
    const tap: NotificationTap = extractTapPayload(response as never);
    expect(tap).toEqual({
      kind: "MATCH_FOUND",
      deepLink: "matches",
      foundItemId: "item-123",
    });
  });

  it("returns null fields for notifications without ClaimIt data", () => {
    const tap = extractTapPayload(null);
    expect(tap).toEqual({ kind: null, deepLink: null, foundItemId: null });
  });
});
