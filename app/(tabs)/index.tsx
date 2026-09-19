import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  GoogleG,
  HeartPinLogo,
  LineIcon,
  PinLogo,
  QrArtwork,
  ReticleCorner,
  type LineIconName,
} from "@/components/icons";
import {
  ClaimItService,
  type FoundItem,
  type LostReport as LostReportFacade,
  type ReportMatchFacade,
  type TagData,
} from "@/lib/claimit-service";
import { renderTagHtml } from "@/lib/tag-html";
import { printTag } from "@/lib/tag-printer";
import {
  formatIssues,
  logFoundItemSchema,
  reportLostItemSchema,
  ITEM_CATEGORIES,
} from "@/shared/validation";

type ScreenKey =
  | "login"
  | "student-home"
  | "report-lost"
  | "matches"
  | "claim-verification"
  | "staff-home"
  | "log-found"
  | "qr-tag"
  | "scan-release"
  | "audit"
  | "profile";
type Role = "student" | "staff";

export const CLAIMIT_SCREEN_KEYS: ScreenKey[] = [
  "login",
  "student-home",
  "report-lost",
  "matches",
  "claim-verification",
  "staff-home",
  "log-found",
  "qr-tag",
  "scan-release",
  "audit",
  "profile",
];

const IMAGES = {
  backpack:
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85",
  phone:
    "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=85",
  wallet:
    "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=85",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
  staffAvatar:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=85",
};

const foundItems = [
  { id: "1", name: "Backpack", category: "Bags", location: "Library", date: "Apr 26, 2025", status: "Found", image: IMAGES.backpack },
  { id: "2", name: "Wireless Headphones", category: "Electronics", location: "Student Center", date: "Apr 25, 2025", status: "Found", image: IMAGES.headphones },
  { id: "3", name: "Silver Smartphone", category: "Electronics", location: "Riverside Park", date: "Apr 24, 2025", status: "Pending", image: IMAGES.phone },
];

const staffItems = [
  { id: "s1", name: "Backpack", category: "Bags & Luggage", date: "Apr 26, 2025", status: "Returned", image: IMAGES.backpack },
  { id: "s2", name: "iPhone 14", category: "Electronics", date: "Apr 25, 2025", status: "Returned", image: IMAGES.phone },
  { id: "s3", name: "Headphones", category: "Electronics", date: "Apr 24, 2025", status: "Pending", image: IMAGES.headphones },
  { id: "s4", name: "Wallet", category: "Personal Items", date: "Apr 23, 2025", status: "Returned", image: IMAGES.wallet },
];

const auditEvents = [
  { status: "FOUND", actor: "Alex Rivera (Staff)", time: "Apr 26, 2025 10:14 AM", action: "Item logged in system", tone: "emerald" },
  { status: "MATCHED", actor: "Taylor Kim (Staff)", time: "Apr 26, 2025 10:18 AM", action: "Claimant information matched", tone: "emerald" },
  { status: "CLAIM REQUESTED", actor: "Alex Morgan", time: "Apr 26, 2025 10:23 AM", action: "Claim request submitted", tone: "amber" },
  { status: "RELEASED", actor: "Morgan Patel (Staff)", time: "Apr 26, 2025 10:37 AM", action: "Item released to claimant", tone: "emerald" },
] as const;

/* ---------------------------------- shared ---------------------------------- */

/** The most recently created lost report (drives the Matches screen). */
let activeReportId: string | null = null;

/** The match the student tapped "This is mine" on (drives Claim Verification). */
let activeMatch: FoundItem | null = null;

/** Format an ISO date like "Apr 26, 2025" for card display. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type AlertPayload = { title: string; message: string } | null;
const alertListeners = new Set<(next: AlertPayload) => void>();
let currentAlert: AlertPayload = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function showAlert(title: string, message: string) {
  currentAlert = { title, message };
  for (const listener of alertListeners) listener(currentAlert);
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    currentAlert = null;
    for (const listener of alertListeners) listener(null);
  }, 2600);
}

function AlertBanner() {
  const [alert, setAlert] = useState<AlertPayload>(currentAlert);
  useEffect(() => {
    const listener = (next: AlertPayload) => setAlert(next);
    alertListeners.add(listener);
    return () => {
      alertListeners.delete(listener);
    };
  }, []);
  if (!alert) return null;
  return (
    <View className="absolute inset-x-6 bottom-28 z-10 rounded-2xl bg-navy-dark/95 px-4 py-3 shadow-lg">
      <Text className="text-sm font-bold text-white">{alert.title}</Text>
      <Text className="mt-0.5 text-xs leading-4 text-slate-300">
        {alert.message}
      </Text>
    </View>
  );
}

function Pill({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: "gray" | "amber" | "emerald" | "blue";
  icon?: LineIconName;
}) {
  const tones = {
    gray: { box: "bg-slate-100", text: "text-slate-600", dot: "#64748B" },
    amber: { box: "bg-amber-50 border border-amber-200/60", text: "text-amber-600", dot: "#F59E0B" },
    emerald: { box: "bg-emerald-50", text: "text-emerald-700", dot: "#059669" },
    blue: { box: "bg-soft-blue", text: "text-brand-blue", dot: "#1952BE" },
  } as const;
  const t = tones[tone];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${t.box}`}>
      {icon ? (
        <LineIcon name={icon} size={12} strokeWidth={2.5} />
      ) : (
        <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.dot }} />
      )}
      <Text className={`ml-1 text-[11px] font-bold ${t.text}`}>{label}</Text>
    </View>
  );
}

function HeaderBar({
  title,
  onBack,
  titleClass = "text-slate-900",
}: {
  title: string;
  onBack?: () => void;
  titleClass?: string;
}) {
  return (
    <View className="relative flex-row items-center justify-center py-3">
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityLabel="Go back"
          className="absolute left-0 p-1"
        >
          <LineIcon name="chevron-left" size={24} strokeWidth={2.5} color="#0F172A" />
        </Pressable>
      )}
      <Text className={`text-xl font-bold tracking-tight ${titleClass}`}>{title}</Text>
    </View>
  );
}

function BottomNav({
  role,
  active,
  go,
}: {
  role: Role;
  active: string;
  go: (screen: ScreenKey) => void;
}) {
  const items: { key: ScreenKey; label: string; icon: LineIconName }[] =
    role === "student"
      ? [
          { key: "student-home", label: "Home", icon: "home" },
          { key: "report-lost", label: "Report", icon: "file-text" },
          { key: "matches", label: "Notifications", icon: "bell" },
          { key: "profile", label: "Profile", icon: "user" },
        ]
      : [
          { key: "staff-home", label: "Home", icon: "home" },
          { key: "scan-release", label: "Scan", icon: "scan" },
          { key: "audit", label: "Audit Log", icon: "file-text" },
          { key: "profile", label: "Profile", icon: "user" },
        ];
  return (
    <View className="mt-2 flex-row items-center justify-around rounded-3xl border border-slate-200/80 bg-white/95 px-4 pb-4 pt-2 shadow-nav backdrop-blur">
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => go(item.key)}
            accessibilityLabel={item.label}
            className="flex-1 items-center py-1"
          >
            <View>
              <LineIcon
                name={item.icon}
                size={22}
                color={selected ? "#0C1E3D" : "#94A3B8"}
                strokeWidth={selected ? 2.4 : 2}
              />
              {item.key === "matches" && role === "student" && (
                <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </View>
            <Text
              className={`mt-1 text-[11px] ${selected ? "font-bold text-navy-dark" : "font-medium text-slate-400"}`}
            >
              {item.label}
            </Text>
            {selected && (
              <View className="absolute -bottom-0.5 h-[2.5px] w-9 rounded-full bg-navy-dark" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  icon,
  tone = "navy",
  rounded = true,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tone?: "navy" | "emerald";
  rounded?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[54px] flex-row items-center justify-center gap-2 px-6 ${rounded ? "rounded-full" : "rounded-2xl"} ${tone === "emerald" ? "bg-emerald-500 shadow-md shadow-emerald-500/25" : "bg-navy-dark shadow-button"}`}
    >
      {icon}
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

/* ---------------------------------- login ---------------------------------- */

function LoginScreen({
  go,
  setRole,
}: {
  go: (screen: ScreenKey) => void;
  setRole: (role: Role) => void;
}) {
  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="px-6"
      containerClassName="bg-app-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between">
          <View className="mb-1 flex-row items-center justify-center gap-2.5">
            <PinLogo size={36} />
            <Text className="text-3xl font-extrabold tracking-tight text-slate-900">
              Claim<Text className="text-emerald-500">It</Text>
            </Text>
          </View>
          <View className="mb-2 items-center">
            <Text className="mb-2.5 text-center text-[36px] font-bold leading-tight tracking-tight text-slate-900">
              Lost something?
            </Text>
            <Text className="mb-3 text-center text-xl font-semibold leading-snug text-slate-900">
              Found something? Let&apos;s get it back.
            </Text>
            <Text className="px-1 text-center text-sm font-normal leading-relaxed text-slate-600">
              ClaimIt uses QR-tagged items and staff verification to reunite you
              with your belongings — safely and securely.
            </Text>
          </View>
          <View className="relative my-1 h-[300px] w-full items-center justify-center">
            <View className="absolute -left-6 top-6 h-52 w-52 rounded-full bg-emerald-100/60 blur-2" />
            <View className="absolute bottom-4 right-0 h-44 w-44 rounded-full bg-sky-100/70 blur-1" />
            <View className="absolute bottom-24 left-1 h-9 w-9 rounded-full bg-emerald-400/70" />
            <View className="absolute right-6 top-10 h-12 w-12 rounded-full bg-indigo-200/50" />
            <View className="flex-row items-end gap-3">
              <View className="relative h-32 w-28 items-center justify-center rounded-3xl bg-navy-deep">
                <LineIcon name="package" size={64} color="#F8FAFC" strokeWidth={1.6} />
                <View className="absolute -right-2 -top-2 h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                  <QrArtwork size={22} />
                </View>
              </View>
              <View className="relative h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15">
                <LineIcon name="headphones" size={48} color="#10B981" strokeWidth={1.8} />
              </View>
              <View className="relative h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20">
                <LineIcon name="tag" size={30} color="#F59E0B" strokeWidth={1.8} />
              </View>
            </View>
          </View>
          <View className="mb-3 mt-auto">
            <PrimaryButton
              label="Continue with Google"
              onPress={() => {
                setRole("student");
                go("student-home");
              }}
              icon={
                <View className="absolute left-3 h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <GoogleG size={20} />
                </View>
              }
            />
            <Pressable
              onPress={() => {
                setRole("staff");
                go("staff-home");
              }}
              className="items-center py-3"
            >
              <Text className="text-xs font-semibold text-slate-500">
                Preview Staff Workspace
              </Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-center pb-2">
            <Text className="text-xs text-slate-500">Terms of Service</Text>
            <Text className="mx-1 text-xs font-light text-slate-400">•</Text>
            <Text className="text-xs text-slate-500">Privacy Policy</Text>
          </View>
          <View className="mx-auto h-1 w-32 rounded-full bg-slate-400/70" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/* ------------------------------- student home ------------------------------ */

const categoryChips: { label: string; icon: LineIconName }[] = [
  { label: "All", icon: "category" },
  { label: "Electronics", icon: "smartphone" },
  { label: "Bags", icon: "shopping-bag" },
  { label: "Clothing", icon: "shirt" },
  { label: "IDs/Cards", icon: "credit-card" },
];

function StudentHome({ go }: { go: (screen: ScreenKey) => void }) {
  const [category, setCategory] = useState("All");
  // Phase 4: live lost reports drive the "My Lost Reports" card.
  const [latestReport, setLatestReport] = useState<
    (LostReportFacade & { matchCount: number }) | null
  >(null);
  useEffect(() => {
    let alive = true;
    void ClaimItService.listMyReports().then((reports) => {
      if (alive) setLatestReport(reports[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        <View className="flex-row items-center justify-between px-6 pb-2 pt-3">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: IMAGES.avatar }}
              className="h-12 w-12 rounded-full bg-slate-200 ring-2 ring-white"
            />
            <View>
              <Text className="text-sm font-medium leading-tight text-slate-500">
                Good morning,
              </Text>
              <Text className="text-xl font-extrabold leading-tight text-slate-900">Alex</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-teal-600 shadow-sm">
              <LineIcon name="shield" size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text className="text-xl font-extrabold tracking-tight text-slate-900">
              Claim<Text className="text-emerald-500">It</Text>
            </Text>
          </View>
        </View>
        <View className="px-6 pb-2 pt-4">
          <Text className="mb-4 text-[30px] font-black leading-snug tracking-tight text-[#0c1e3d]">
            Find your lost item
          </Text>
          <View className="flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 shadow-sm">
            <LineIcon name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Search found items..."
              placeholderTextColor="#94A3B8"
              className="ml-3 flex-1 py-3.5 text-[15px] font-medium text-slate-800"
            />
          </View>
        </View>
        <FlatList
          data={categoryChips}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          className="self-start px-6 py-3"
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => {
            const selected = category === item.label;
            return (
              <Pressable
                onPress={() => setCategory(item.label)}
                className={`flex-row items-center gap-2 rounded-full px-5 py-2.5 ${selected ? "bg-teal-600 shadow-sm" : "border border-slate-200/70 bg-white"}`}
              >
                {!selected && (
                  <LineIcon name={item.icon} size={16} color="#64748B" />
                )}
                <Text
                  className={`text-sm font-semibold ${selected ? "text-white" : "text-slate-700"}`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
        <View className="px-6 pb-2 pt-4">
          <View className="mb-3.5 flex-row items-center justify-between">
            <Text className="text-xl font-bold tracking-tight text-slate-900">Found Items</Text>
            <Pressable onPress={() => go("matches")} className="flex-row items-center">
              <Text className="text-sm font-semibold text-emerald-600">See all</Text>
              <LineIcon name="chevron-right" size={16} color="#059669" />
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-3.5">
            {foundItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => go("claim-verification")}
                className="w-[47.5%] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white"
                style={{ shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 16, elevation: 1 }}
              >
                <Image source={{ uri: item.image }} className="h-36 w-full bg-slate-100" />
                <View className="flex-1 p-3">
                  <Text className="truncate text-base font-bold leading-tight text-slate-900">
                    {item.name}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <LineIcon name="map-pin" size={14} color="#94A3B8" />
                    <Text className="flex-1 truncate text-xs font-medium text-slate-500" numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <LineIcon name="calendar" size={14} color="#94A3B8" />
                    <Text className="flex-1 truncate text-xs font-medium text-slate-500" numberOfLines={1}>
                      {item.date}
                    </Text>
                  </View>
                  <View className="mt-3">
                    <Pill
                      label={item.status === "Found" ? "Found" : "Pending"}
                      tone={item.status === "Found" ? "emerald" : "amber"}
                      icon={item.status === "Found" ? "check" : "clock"}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="px-6 pb-4 pt-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-bold tracking-tight text-slate-900">
              My Lost Reports
            </Text>
            <Pressable onPress={() => go("matches")} className="flex-row items-center">
              <Text className="text-sm font-semibold text-emerald-600">See all</Text>
              <LineIcon name="chevron-right" size={16} color="#059669" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => go("matches")}
            className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5"
            style={{ shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 16, elevation: 1 }}
          >
            <View className="min-w-0 flex-row items-center gap-3">
              <Image
                source={{ uri: IMAGES.backpack }}
                className="h-14 w-14 flex-shrink-0 rounded-2xl bg-slate-100"
              />
              <View className="min-w-0">
                <Text className="truncate text-sm font-bold text-slate-900">
                  {latestReport ? latestReport.category : "Black Backpack"}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <LineIcon name="map-pin" size={12} color="#94A3B8" />
                  <Text className="text-xs text-slate-400">
                    {latestReport ? latestReport.locationLost : "Campus"}
                  </Text>
                </View>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <LineIcon name="calendar" size={12} color="#94A3B8" />
                  <Text className="text-xs text-slate-400">
                    {latestReport ? formatDate(latestReport.dateLost) : "Apr 24, 2025"}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-shrink-0 flex-row items-center gap-2 pl-2">
              <Pill
                label={
                  latestReport && latestReport.matchCount > 0
                    ? `${latestReport.matchCount} possible match${latestReport.matchCount === 1 ? "" : "es"}`
                    : "Possible match found"
                }
                tone="amber"
                icon="search"
              />
              <LineIcon name="chevron-right" size={16} color="#94A3B8" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
      <View className="px-6">
        <Pressable
          onPress={() => go("report-lost")}
          className="absolute bottom-24 right-6 z-30 flex-row items-center gap-2 rounded-full bg-[#0C1E3D] px-5 py-3.5 shadow-floating"
        >
          <LineIcon name="plus" size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-sm font-bold tracking-wide text-white">Report Lost Item</Text>
        </Pressable>
      </View>
      <BottomNav role="student" active="student-home" go={go} />
    </ScreenContainer>
  );
}

/* -------------------------------- report lost ------------------------------- */

function FormCard({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="rounded-2xl border border-gray-100/80 bg-white p-4">
      <Text className="mb-2.5 text-[15px] font-semibold text-slate-700">{label}</Text>
      {children}
    </View>
  );
}

function ReportLost({ go }: { go: (screen: ScreenKey) => void }) {
  // Phase 4: stateful form validated by the shared reportLostItemSchema —
  // same approved layout, errors under each card, submit persists via API.
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [locationLost, setLocationLost] = useState("");
  const [showCategory, setShowCategory] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fieldError = (key: string) =>
    errors[key] ? (
      <Text className="mt-1.5 px-1 text-xs font-medium text-red-500">{errors[key]}</Text>
    ) : null;

  const submit = async () => {
    const parsed = reportLostItemSchema.safeParse({
      category: category || undefined,
      description,
      dateLost: dateLost ? new Date(dateLost).toISOString() : new Date().toISOString(),
      locationLost,
    });
    if (!parsed.success) {
      setErrors(formatIssues(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const report = await ClaimItService.createLostReport({
        category: parsed.data.category,
        description: parsed.data.description,
        dateLost: parsed.data.dateLost,
        locationLost: parsed.data.locationLost,
      });
      activeReportId = report.id;
      showAlert(
        "Report Filed",
        "We will notify you when possible matches are found.",
      );
      go("matches");
    } catch (error) {
      showAlert("Could not file report", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <HeaderBar title="" onBack={() => go("student-home")} />
        <Text className="px-5 pb-5 text-[32px] font-bold tracking-tight text-[#0D1F44]">
          Report a Lost Item
        </Text>
        <View className="gap-3.5 px-5">
          <FormCard label="Category">
            <Pressable
              onPress={() => setShowCategory(true)}
              className="flex-row items-center justify-between rounded-xl border border-[#E2E8F0] px-3.5 py-3"
            >
              <Text
                className={`text-[15px] ${category ? "text-slate-700" : "text-slate-400"}`}
              >
                {category || "Select a category"}
              </Text>
              <LineIcon name="chevron-right" size={16} color="#334155" strokeWidth={2.2} />
            </Pressable>
            {fieldError("category")}
          </FormCard>
          <FormCard label="Item description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Describe the item in detail..."
              placeholderTextColor="#94A3B8"
              className="resize-none rounded-xl border border-[#E2E8F0] px-3.5 py-3 text-[15px] text-slate-700"
              textAlignVertical="top"
            />
            {fieldError("description")}
          </FormCard>
          <FormCard label="Date lost">
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5">
                <LineIcon name="calendar" size={20} color="#64748B" strokeWidth={1.8} />
              </View>
              <TextInput
                value={dateLost}
                onChangeText={setDateLost}
                placeholder="e.g. Apr 26, 2025"
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-xl border border-[#E2E8F0] py-3 pl-11 pr-3.5 text-[15px] text-slate-700"
              />
            </View>
            {fieldError("dateLost")}
          </FormCard>
          <FormCard label="Location lost">
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5">
                <LineIcon name="map-pin" size={20} color="#64748B" strokeWidth={1.8} />
              </View>
              <TextInput
                value={locationLost}
                onChangeText={setLocationLost}
                placeholder="e.g. Library, Building A"
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-xl border border-[#E2E8F0] py-3 pl-11 pr-3.5 text-[15px] text-slate-700"
              />
            </View>
            {fieldError("locationLost")}
          </FormCard>
          <FormCard
            label={
              <Text className="text-[15px] font-semibold text-slate-700">
                Reference photo{" "}
                <Text className="font-normal text-slate-500">(optional)</Text>
              </Text>
            }
          >
            <Pressable className="flex-row items-center gap-3.5 rounded-xl border border-dashed border-[#CBD5E1] p-4">
              <LineIcon name="camera" size={32} color="#475569" strokeWidth={1.5} />
              <View>
                <Text className="text-sm font-medium text-[#334155]">Tap to add a photo</Text>
                <Text className="mt-0.5 text-xs text-slate-400">JPG, PNG (max 5MB)</Text>
              </View>
            </Pressable>
          </FormCard>
          <View className="mt-1 flex-row items-start gap-3 rounded-2xl bg-[#EBF2FE] p-4">
            <LineIcon name="info" size={20} color="#2563EB" />
            <Text className="flex-1 text-[13.5px] font-medium leading-snug text-[#1E40AF]">
              Providing accurate details helps staff identify possible matches.
            </Text>
          </View>
        </View>
        <View className="px-5 pt-4">
          <PrimaryButton
            label={submitting ? "Submitting..." : "Submit Report"}
            onPress={submit}
            rounded={false}
          />
        </View>
        {showCategory && (
          <Pressable
            onPress={() => setShowCategory(false)}
            className="absolute inset-0 z-40 justify-end bg-black/30"
          >
            <Pressable className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
              <Text className="mb-3 text-lg font-bold text-[#0B2545]">Select a category</Text>
              <View className="flex-row flex-wrap gap-2">
                {ITEM_CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCategory(c);
                      setShowCategory(false);
                    }}
                    className={`rounded-full px-4 py-2.5 ${
                      category === c ? "bg-teal-600" : "border border-slate-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        category === c ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        )}
      </ScrollView>
      <BottomNav role="student" active="report-lost" go={go} />
    </ScreenContainer>
  );
}

/* --------------------------------- matches --------------------------------- */

function Matches({ go }: { go: (screen: ScreenKey) => void }) {
  // Phase 4: real structured matches for the active report (category +
  // description scoring from the server). Mock fallback in prototype mode.
  const [matches, setMatches] = useState<ReportMatchFacade[] | null>(null);
  const [report, setReport] = useState<LostReportFacade | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const reports = await ClaimItService.listMyReports();
      if (!alive) return;
      const current =
        reports.find((r) => r.id === activeReportId) ?? reports[0] ?? null;
      setReport(current);
      if (!current) {
        setMatches([]);
        return;
      }
      const found = await ClaimItService.findMatches(current.id);
      if (alive) setMatches(found);
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const loading = matches === null;

  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <FlatList
        data={matches ?? []}
        keyExtractor={(m) => m.item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListHeaderComponent={
          <View className="px-6 pb-5 pt-3">
            <View className="flex-row items-center gap-2">
              <HeartPinLogo size={28} />
              <Text className="text-2xl font-bold tracking-tight text-[#0B2545]">ClaimIt</Text>
            </View>
            <Text className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B2545]">
              Possible Matches
            </Text>
            {report ? (
              <Text className="mt-1 text-[15px] font-normal leading-snug text-slate-500">
                Structured matches for your lost {report.category.toLowerCase()} —
                {matches?.length
                  ? ` ${matches.length} found`
                  : " none yet, we will keep watching"}.
              </Text>
            ) : (
              <Text className="mt-1 text-[15px] font-normal leading-snug text-slate-500">
                We found items that may match your lost report.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View className="mx-5 items-center rounded-3xl border border-slate-100 bg-white p-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <LineIcon name="search" size={26} color="#F59E0B" strokeWidth={2} />
              </View>
              <Text className="text-base font-bold text-[#0B2545]">
                No matches yet
              </Text>
              <Text className="mt-1 text-center text-[13px] leading-snug text-slate-500">
                {report
                  ? "When staff log an item matching your category and description, it will appear here."
                  : "File a lost report first — then matching items will appear here automatically."}
              </Text>
              <Pressable
                onPress={() => go("report-lost")}
                className="mt-4 rounded-full bg-[#0B2545] px-5 py-2.5"
              >
                <Text className="text-sm font-semibold text-white">Report Lost Item</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            className="mx-5 mb-5 rounded-3xl border border-slate-100/80 bg-white p-4"
            style={{ shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            <View className="flex-row gap-4">
              <Image
                source={
                  item.item.imageUrl
                    ? { uri: item.item.imageUrl }
                    : { uri: IMAGES.backpack }
                }
                className="h-48 w-36 flex-shrink-0 rounded-2xl bg-slate-100"
              />
              <View className="flex-1 justify-between">
                <View>
                  <Pill label={`Possible Match · ${item.score}%`} tone="amber" icon="clock" />
                  <Text className="mt-2 text-lg font-bold leading-tight text-[#0B2545]">
                    {item.item.name}
                  </Text>
                  <View className="mt-3 gap-2">
                    <View className="flex-row items-start gap-2">
                      <LineIcon name="category" size={14} color="#94A3B8" />
                      <View>
                        <Text className="text-[11px] font-medium leading-tight text-slate-400">
                          Category
                        </Text>
                        <Text className="text-xs font-medium leading-tight text-slate-700">
                          {item.item.category}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start gap-2">
                      <LineIcon name="map-pin" size={14} color="#94A3B8" />
                      <View>
                        <Text className="text-[11px] font-medium leading-tight text-slate-400">
                          Found location
                        </Text>
                        <Text className="text-xs font-medium leading-tight text-slate-700" numberOfLines={1}>
                          {item.item.location}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start gap-2">
                      <LineIcon name="calendar" size={14} color="#94A3B8" />
                      <View>
                        <Text className="text-[11px] font-medium leading-tight text-slate-400">
                          Found date
                        </Text>
                        <Text className="text-xs font-medium leading-tight text-slate-700">
                          {formatDate(item.item.foundDate)}
                        </Text>
                      </View>
                    </View>
                    {item.reasons.length > 0 && (
                      <View className="flex-row items-start gap-2">
                        <LineIcon name="check" size={14} color="#059669" />
                        <Text className="flex-1 text-[11px] leading-snug text-emerald-700">
                          {item.reasons.join(" · ")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
            <View className="mt-4 flex-row gap-3 pt-1">
              <Pressable
                onPress={() => {
                  activeMatch = item.item;
                  go("claim-verification");
                }}
                className="flex-1 items-center justify-center rounded-full bg-[#0B2545] py-3"
              >
                <Text className="text-sm font-semibold text-white">This is mine</Text>
              </Pressable>
              <Pressable className="flex-1 items-center justify-center rounded-full border border-slate-200 bg-white py-3">
                <Text className="text-sm font-semibold text-[#0B2545]">Not mine</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      <BottomNav role="student" active="matches" go={go} />
    </ScreenContainer>
  );
}

/* ----------------------------- claim verification ---------------------------- */

function ClaimVerification({
  go,
  match,
}: {
  go: (screen: ScreenKey) => void;
  match?: FoundItem | null;
}) {
  // Phase 4: pre-fill the verification prompt from the matched item's
  // description when the claim originates from a lost-report match.
  const [answer, setAnswer] = useState(
    match?.description
      ? `${match.name}: ${match.description}`
      : "Small astronomy patch on the front pocket",
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (match) {
        await ClaimItService.submitClaim({
          foundItemId: match.id,
          verificationAnswer: answer,
          lostReportId: activeReportId,
        });
      }
      setSubmitted(true);
      showAlert(
        "Claim Submitted",
        "Our staff will verify your claim and get back to you.",
      );
    } catch (error) {
      showAlert(
        "Could not submit claim",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <HeaderBar title="Verify Your Claim" onBack={() => go("matches")} />
        <View className="mt-3 flex-row items-center gap-4 rounded-[22px] bg-white p-4 shadow-card">
          <Image
            source={match?.imageUrl ? { uri: match.imageUrl } : { uri: IMAGES.backpack }}
            className="h-[148px] w-[140px] flex-shrink-0 rounded-xl bg-slate-100"
          />
          <View className="flex-1 justify-center pr-1">
            <Text className="text-xl font-bold leading-snug tracking-tight text-[#0c1a2e]">
              {match?.name ?? "Navy Backpack"}
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-500">
              {match?.category ?? "Bags"}
            </Text>
            <View className="mt-3 flex-row items-center">
              <LineIcon name="map-pin" size={16} color="#94A3B8" />
              <Text className="ml-1.5 text-xs text-slate-500" numberOfLines={1}>
                {match?.location ?? "Library · 2nd floor"}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-6 gap-2.5">
          <Text className="text-lg font-bold tracking-tight text-[#0c1a2e]">
            What&apos;s distinctive about this item?
          </Text>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Describe specific unique details..."
            placeholderTextColor="#94A3B8"
            className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-[15px] text-slate-800 shadow-sm"
          />
          <Text className="pt-0.5 text-[13px] leading-relaxed text-slate-500">
            Tell staff something about the item that isn&apos;t obvious from the listing.
          </Text>
        </View>
        <View className="pt-2">
          <PrimaryButton
            label={submitting ? "Submitting..." : submitted ? "Claim Submitted" : "Submit Claim"}
            onPress={submit}
          />
        </View>
        {submitted && (
          <View className="mt-2 flex-row items-start gap-3.5 rounded-2xl border border-[#d1f2e4] bg-[#ecfbf4] p-4 shadow-sm">
            <View className="h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#10b981] shadow-sm">
              <LineIcon name="check" size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold leading-snug text-[#0c1a2e]">
                Claim Submitted
              </Text>
              <Text className="mt-1 text-[13px] font-normal leading-normal text-slate-600">
                Our staff will verify your claim and get back to you as soon as
                possible.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      <BottomNav role="student" active="matches" go={go} />
    </ScreenContainer>
  );
}

/* -------------------------------- staff home -------------------------------- */

function StaffHome({ go }: { go: (screen: ScreenKey) => void }) {
  const [tab, setTab] = useState<"found" | "pending">("found");
  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <FlatList
        data={tab === "found" ? staffItems : staffItems.slice(2)}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96, paddingHorizontal: 20, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-4">
            <View className="flex-row items-center justify-between pb-1">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#0F2647] shadow-sm">
                  <LineIcon name="package" size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <View>
                  <Text className="text-2xl font-bold leading-tight tracking-tight text-[#0F2647]">
                    ClaimIt
                  </Text>
                  <Text className="text-xs tracking-wide text-slate-500">Staff Dashboard</Text>
                </View>
              </View>
              <View className="relative p-2">
                <LineIcon name="bell" size={24} color="#0F2647" strokeWidth={1.8} />
                <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#F4F7FB] bg-red-500" />
              </View>
            </View>
            <View className="flex-row gap-3.5">
              <Pressable className="flex-1 flex-row items-center justify-between rounded-2xl border border-[#D1F1E2] bg-[#EFF8F4] p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-[#D8F3E5]">
                    <LineIcon name="package" size={22} color="#10B981" strokeWidth={1.8} />
                  </View>
                  <View>
                    <Text className="text-[11px] font-medium text-slate-500">Found Items</Text>
                    <Text className="mt-1 text-2xl font-bold leading-none text-slate-900">24</Text>
                  </View>
                </View>
                <LineIcon name="chevron-right" size={16} color="#94A3B8" />
              </Pressable>
              <Pressable className="flex-1 flex-row items-center justify-between rounded-2xl border border-[#FDE8C7] bg-[#FEF8EC] p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FCEFDC]">
                    <LineIcon name="clock" size={22} color="#F59E0B" strokeWidth={2} />
                  </View>
                  <View>
                    <Text className="text-[11px] font-medium text-slate-500">Pending Claims</Text>
                    <Text className="mt-1 text-2xl font-bold leading-none text-slate-900">3</Text>
                  </View>
                </View>
                <LineIcon name="chevron-right" size={16} color="#94A3B8" />
              </Pressable>
            </View>
            <View className="flex-row items-center rounded-2xl bg-[#E7ECF3] p-1">
              <Pressable
                onPress={() => setTab("found")}
                className={`flex-1 items-center rounded-xl py-2.5 ${tab === "found" ? "bg-[#0F2647] shadow-sm" : ""}`}
              >
                <Text className={`text-xs font-semibold ${tab === "found" ? "text-white" : "text-slate-600"}`}>
                  Found Items
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab("pending")}
                className={`flex-1 items-center rounded-xl py-2.5 ${tab === "pending" ? "bg-[#0F2647] shadow-sm" : ""}`}
              >
                <Text className={`text-xs font-semibold ${tab === "pending" ? "text-white" : "text-slate-600"}`}>
                  Pending Claims
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => (tab === "pending" ? go("scan-release") : undefined)}
            className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"
          >
            <View className="flex-row items-center gap-3.5">
              <Image
                source={{ uri: item.image }}
                className="h-[68px] w-[68px] flex-shrink-0 rounded-xl bg-slate-100"
              />
              <View>
                <Text className="text-sm font-semibold leading-tight text-slate-900">
                  {tab === "pending" ? "Alex Morgan · " : ""}
                  {item.name}
                </Text>
                <Text className="mt-0.5 text-[11px] text-slate-400">{item.category}</Text>
                <View className="mt-2 flex-row items-center gap-1.5">
                  <LineIcon name="calendar" size={14} color="#94A3B8" />
                  <Text className="text-[11px] text-slate-500">
                    {tab === "pending" ? "Claimed Apr 26, 2025" : `Found ${item.date}`}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-shrink-0 flex-row items-center gap-2">
              <View className="items-end gap-2">
                <View className="flex-row items-center gap-1">
                  <LineIcon name="scan" size={14} color="#334155" />
                  <Text className="text-[11px] font-medium text-slate-600">QR Tag</Text>
                  <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600">
                    <LineIcon name="check" size={9} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>
                <Pill
                  label={tab === "pending" ? "Pending" : item.status}
                  tone={tab === "pending" || item.status === "Pending" ? "amber" : "emerald"}
                />
              </View>
              <LineIcon name="chevron-right" size={16} color="#CBD5E1" />
            </View>
          </Pressable>
        )}
      />
      <View className="pointer-events-none absolute bottom-28 right-5 z-30">
        <Pressable
          onPress={() => go("log-found")}
          className="pointer-events-auto flex-row items-center gap-2 rounded-full bg-[#0F2647] px-5 py-3 shadow-lg"
        >
          <LineIcon name="plus" size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-xs font-semibold tracking-wide text-white">Log Found Item</Text>
        </Pressable>
      </View>
      <BottomNav role="staff" active="staff-home" go={go} />
    </ScreenContainer>
  );
}

/* -------------------------------- log found --------------------------------- */

function LogFound({ go }: { go: (screen: ScreenKey) => void }) {
  // Phase 3: shared validation contract (shared/validation.ts) drives the
  // same approved layout — errors appear under each card.
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"">("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [foundDate, setFoundDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = logFoundItemSchema.safeParse({
      name,
      category: category || undefined,
      location,
      foundDate: foundDate ? new Date(foundDate).toISOString() : new Date().toISOString(),
      description: description || undefined,
    });
    if (!parsed.success) {
      setErrors(formatIssues(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const item = await ClaimItService.logFoundItem({
        name: parsed.data.name,
        category: parsed.data.category,
        location: parsed.data.location,
        foundDate: parsed.data.foundDate,
      });
      showAlert("Item Logged", `${item.name} received QR tag ${item.qrCode}.`);
      go("qr-tag");
    } catch (error) {
      showAlert("Could not log item", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <Text className="mt-1.5 px-1 text-xs font-medium text-red-500">{errors[key]}</Text>
    ) : null;

  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <HeaderBar title="" onBack={() => go("staff-home")} />
        <Text className="px-5 pb-5 text-[32px] font-bold tracking-tight text-[#0D1F44]">
          Log Found Item
        </Text>
        <View className="gap-3.5 px-5">
          <FormCard label="Item name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Navy Backpack"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-[#E2E8F0] px-3.5 py-3 text-[15px] text-slate-700"
            />
            {fieldError("name")}
          </FormCard>
          <FormCard label="Category">
            <View className="relative flex-row items-center">
              <TextInput
                value={category}
                onChangeText={(v) => setCategory(v as typeof category)}
                placeholder="Select category"
                placeholderTextColor="#64748B"
                className="flex-1 rounded-xl border border-[#E2E8F0] px-3.5 py-3 text-[15px] text-slate-500"
              />
              <View className="absolute right-3.5">
                <LineIcon name="chevron-right" size={16} color="#334155" strokeWidth={2.2} />
              </View>
            </View>
            {fieldError("category")}
          </FormCard>
          <FormCard label="Description">
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Describe the item (brand, color, details)"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-[#E2E8F0] px-3.5 py-3 text-[15px] text-slate-700"
              textAlignVertical="top"
            />
            {fieldError("description")}
          </FormCard>
          <FormCard label="Found location">
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5">
                <LineIcon name="map-pin" size={20} color="#64748B" strokeWidth={1.8} />
              </View>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Main entrance, Library, Room 204"
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-xl border border-[#E2E8F0] py-3 pl-11 pr-3.5 text-[15px] text-slate-700"
              />
            </View>
            {fieldError("location")}
          </FormCard>
          <FormCard label="Found date">
            <View className="relative flex-row items-center">
              <View className="absolute left-3.5">
                <LineIcon name="calendar" size={20} color="#64748B" strokeWidth={1.8} />
              </View>
              <TextInput
                value={foundDate}
                onChangeText={setFoundDate}
                placeholder="Today"
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-xl border border-[#E2E8F0] py-3 pl-11 pr-3.5 text-[15px] text-slate-700"
              />
            </View>
            {fieldError("foundDate")}
          </FormCard>
          <FormCard label="Optional photo">
            <Pressable className="flex-row items-center gap-3.5 rounded-xl border border-dashed border-[#CBD5E1] p-4">
              <LineIcon name="camera" size={32} color="#475569" strokeWidth={1.5} />
              <View>
                <Text className="text-sm font-medium text-[#334155]">Tap to add a photo</Text>
                <Text className="mt-0.5 text-xs text-slate-400">JPG, PNG (max 5MB)</Text>
              </View>
            </Pressable>
          </FormCard>
        </View>
        <View className="px-5 pt-4">
          <PrimaryButton
            label={submitting ? "Logging…" : "Log Found Item"}
            onPress={submit}
            rounded={false}
          />
        </View>
        <View className="mt-4 flex-row items-center justify-center gap-2">
          <LineIcon name="shield" size={18} color="#64748B" />
          <Text className="text-xs text-slate-500">
            Every found item receives a unique QR tag.
          </Text>
        </View>
      </ScrollView>
      <BottomNav role="staff" active="staff-home" go={go} />
    </ScreenContainer>
  );
}

/* ---------------------------------- qr tag ---------------------------------- */

function QrTag({ go }: { go: (screen: ScreenKey) => void }) {
  // Phase 3: real tag data from the API when available (QR PNG data URL);
  // prototype mode keeps the approved layout with mock values.
  const [tag, setTag] = useState<TagData | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ClaimItService.listItems()
      .then((items) => {
        if (cancelled || !items[0]) return;
        return ClaimItService.getItemTag(items[0].id).then((t) => {
          if (!cancelled) setTag(t);
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const print = async () => {
    if (!tag) {
      showAlert("Print Tag", "The QR tag is ready to print.");
      return;
    }
    setPrinting(true);
    try {
      await printTag({ html: renderTagHtml(tag), jobName: `ClaimIt tag ${tag.item.qrCode}` });
    } catch {
      showAlert("Print Tag", "The QR tag is ready to print.");
    } finally {
      setPrinting(false);
    }
  };

  const display = tag?.item;
  return (
    <ScreenContainer className="px-6" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="flex-row items-center gap-2 py-2.5">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 shadow-sm">
            <LineIcon name="shield" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-xl font-bold tracking-tight text-slate-900">ClaimIt</Text>
        </View>
        <View className="mb-5 mt-2 items-center text-center">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-emerald-600 shadow-md shadow-emerald-200">
            <LineIcon name="check" size={24} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text className="mb-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
            QR Tag Ready
          </Text>
          <Text className="max-w-[260px] text-center text-sm leading-snug text-slate-500">
            Your item has been logged and is ready for tagging.
          </Text>
        </View>
        <View className="items-center rounded-3xl border border-slate-100 bg-white p-5">
          <View className="mb-3 rounded-2xl border-2 border-emerald-400 bg-white p-3 shadow-sm">
            {tag?.qrDataUrl ? (
              <Image
                source={{ uri: tag.qrDataUrl }}
                className="h-[176px] w-[176px]"
                resizeMode="contain"
              />
            ) : (
              <QrArtwork size={176} />
            )}
          </View>
          <View className="mb-5 flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1">
            <LineIcon name="shield" size={14} color="#047857" />
            <Text className="text-xs font-semibold text-emerald-700">
              Verified by ClaimIt
            </Text>
          </View>
          <View className="mb-4 h-px w-full bg-slate-100" />
          <View className="mb-4 w-full flex-row items-center gap-3.5">
            <View className="h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
              <LineIcon name="shopping-bag" size={24} color="#059669" strokeWidth={2} />
            </View>
            <View>
              <Text className="text-base font-bold leading-tight text-slate-900">
                {display?.name ?? "Navy Backpack"}
              </Text>
              <Text className="text-xs font-normal text-slate-500">
                {display?.category ?? "Bags"}
              </Text>
            </View>
          </View>
          <View className="w-full gap-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <LineIcon name="map-pin" size={16} color="#94A3B8" strokeWidth={2} />
                <Text className="text-xs font-medium text-slate-500">Location</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {display?.location ?? "Library · 2nd floor"}
              </Text>
            </View>
            <View className="h-px w-full bg-slate-50" />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <LineIcon name="calendar" size={16} color="#94A3B8" strokeWidth={2} />
                <Text className="text-xs font-medium text-slate-500">Date Logged</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800">
                {display
                  ? new Date(display.foundDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Apr 26, 2025"}
              </Text>
            </View>
            <View className="h-px w-full bg-slate-50" />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <LineIcon name="tag" size={16} color="#94A3B8" strokeWidth={2} />
                <Text className="text-xs font-medium text-slate-500">Item ID</Text>
              </View>
              <Text className="text-xs font-semibold tracking-wider text-slate-800">
                {display?.qrCode ?? "CLM-2048-AX7"}
              </Text>
            </View>
          </View>
        </View>
        <View className="gap-3 pt-6">
          <PrimaryButton
            label={printing ? "Preparing…" : "Print Tag"}
            tone="emerald"
            onPress={print}
            icon={<LineIcon name="printer" size={20} color="#FFFFFF" strokeWidth={2} />}
          />
          <Pressable
            onPress={() => go("staff-home")}
            className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <View className="h-5 w-5 items-center justify-center rounded-full bg-emerald-600">
              <LineIcon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text className="text-base font-medium text-slate-800">Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/* -------------------------------- scan release ------------------------------- */

function ScanRelease({ go }: { go: (screen: ScreenKey) => void }) {
  const [released, setReleased] = useState(false);
  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="px-0"
      containerClassName="bg-black"
    >
      <View className="flex-1">
        <View className="absolute inset-0 z-0">
          <Image
            source={{ uri: IMAGES.backpack }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/65" />
        </View>
        <View className="z-20 flex-row items-center justify-between px-5 pt-1">
          <View className="flex-row items-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-md bg-emerald-500 shadow-md">
              <LineIcon name="shield" size={14} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text className="text-lg font-bold tracking-tight text-white">ClaimIt</Text>
          </View>
          <Text className="text-lg font-bold tracking-wide text-white">Scan QR Tag</Text>
          <View
            className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1 ${released ? "border-emerald-500/60 bg-emerald-900/80" : "border-white/20 bg-white/10"}`}
          >
            <LineIcon
              name={released ? "check-circle" : "clock"}
              size={14}
              color={released ? "#6EE7B7" : "#FBBF24"}
            />
            <Text
              className={`text-[12px] font-medium tracking-tight ${released ? "text-emerald-100" : "text-amber-100"}`}
            >
              {released ? "Item Released" : "Pending claim"}
            </Text>
          </View>
        </View>
        <View className="z-10 flex-1 items-center justify-center">
          <View className="h-64 w-64 items-center justify-center rounded-3xl border border-white/20 bg-black/10">
            <ReticleCorner position="tl" />
            <ReticleCorner position="tr" />
            <ReticleCorner position="bl" />
            <ReticleCorner position="br" />
          </View>
          <Text className="mt-6 text-center text-[15px] font-medium text-white">
            Scan the item&apos;s QR tag to release
          </Text>
        </View>
        <View className="z-30 flex-col rounded-t-[32px] bg-white px-5 pb-3 pt-3">
          <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-row items-start gap-3.5">
              <Image
                source={{ uri: IMAGES.backpack }}
                className="h-20 w-20 flex-shrink-0 rounded-2xl border border-slate-100 bg-slate-100"
              />
              <View className="pt-0.5">
                <Text className="text-xl font-bold tracking-tight text-slate-900">
                  Navy Backpack
                </Text>
                <View className="mt-2 flex-row items-start gap-2">
                  <LineIcon name="user" size={14} color="#94A3B8" />
                  <View className="leading-tight">
                    <Text className="block text-xs font-normal text-slate-400">Claimant</Text>
                    <Text className="text-sm font-bold text-slate-800">Alex Morgan</Text>
                  </View>
                </View>
                <View className="mt-2 flex-row items-start gap-2">
                  <LineIcon name="shield" size={14} color="#94A3B8" />
                  <View className="flex-1 leading-tight">
                    <Text className="block text-xs font-normal text-slate-400">
                      Verification Answer
                    </Text>
                    <Text className="text-[13px] font-bold text-slate-800" numberOfLines={2}>
                      Small astronomy patch on the front pocket
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <Pill
              label={released ? "Released" : "Pending claim"}
              tone={released ? "emerald" : "amber"}
              icon={released ? "check" : "clock"}
            />
          </View>
          <View className="mb-2 gap-2.5 pt-1">
            {released ? (
              <View className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-emerald-50">
                <LineIcon name="check-circle" size={20} color="#059669" />
                <Text className="text-[15px] font-semibold text-emerald-700">
                  Item Released
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => setReleased(true)}
                className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-[#10B981] px-4 py-3.5 shadow-sm"
              >
                <LineIcon name="check" size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-[15px] font-semibold text-white">Confirm Release</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => go("staff-home")}
              className="min-h-[48px] items-center justify-center rounded-full border border-slate-300 bg-white py-3"
            >
              <Text className="text-[15px] font-semibold text-slate-700">Cancel</Text>
            </Pressable>
          </View>
          <View className="border-t border-slate-100 pt-3">
            <BottomNav role="staff" active="scan-release" go={go} />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

/* ----------------------------------- audit ----------------------------------- */

function Audit({ go }: { go: (screen: ScreenKey) => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Unclaimed", "Pending Claim", "Claimed"];
  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <View className="flex-1 px-5">
        <Text className="pb-4 pt-4 text-[32px] font-bold tracking-tight text-[#0B2545]">
          Audit Log
        </Text>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 flex-none self-start"
          contentContainerStyle={{ gap: 8 }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const selected = filter === item;
            return (
              <Pressable
                onPress={() => setFilter(item)}
                className={`rounded-full px-4 py-2.5 ${selected ? "bg-navy-dark" : "border border-slate-200/70 bg-white"}`}
              >
                <Text
                  className={`text-xs font-bold ${selected ? "text-white" : "text-[#0B2545]"}`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <View className="mb-5 flex-row items-center gap-3">
            <LineIcon name="shopping-bag" size={22} color="#0B2545" strokeWidth={2} />
            <Text className="text-lg font-bold tracking-tight text-[#0B2545]">
              Navy Backpack
            </Text>
          </View>
          <View className="pl-6">
            <View className="absolute bottom-5 left-[3.5px] top-2 w-[1.5px] bg-slate-200" />
            {auditEvents.map((event) => (
              <View key={event.status} className="relative mb-6 flex-col last:mb-0">
                <View
                  className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white"
                  style={{
                    backgroundColor: event.tone === "amber" ? "#D97706" : "#059669",
                  }}
                />
                <View className="flex-row items-center justify-between">
                  <View
                    className={`self-start rounded-full px-2 py-0.5 ${event.tone === "amber" ? "bg-[#FEF3C7]" : "bg-[#DCFCE7]"}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-wide ${event.tone === "amber" ? "text-[#B45309]" : "text-[#059669]"}`}
                    >
                      {event.status}
                    </Text>
                  </View>
                  <Text className="text-[11px] font-medium tracking-tight text-slate-500">
                    {event.time}
                  </Text>
                </View>
                <Text className="mt-1.5 text-xs font-semibold text-slate-800">
                  By {event.actor}
                </Text>
                <Text className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {event.action}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <BottomNav role="staff" active="audit" go={go} />
    </ScreenContainer>
  );
}

/* ---------------------------------- profile ---------------------------------- */

function ProfileRow({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: LineIconName;
  label: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-full flex-row items-center justify-between rounded-2xl border border-slate-100/80 bg-white p-4 active:bg-slate-50"
      style={{ shadowColor: "#0F172A", shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
    >
      <View className="flex-row items-center gap-4">
        <LineIcon
          name={icon}
          size={24}
          color={destructive ? "#DC2626" : "#0B2545"}
          strokeWidth={2}
        />
        <Text
          className={`text-[15px] font-bold tracking-tight ${destructive ? "text-red-600" : "text-[#0B2545]"}`}
        >
          {label}
        </Text>
      </View>
      <LineIcon name="chevron-right" size={16} color="#94A3B8" strokeWidth={2.5} />
    </Pressable>
  );
}

function Profile({ role, go }: { role: Role; go: (screen: ScreenKey) => void }) {
  const staff = role === "staff";
  return (
    <ScreenContainer className="px-0" containerClassName="bg-app-bg">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <Text className="px-5 pb-1 pt-3 text-4xl font-extrabold tracking-tight text-[#0B2545]">
          Profile
        </Text>
        <View className="flex-row items-center gap-5 px-5 py-2">
          <Image
            source={{ uri: staff ? IMAGES.staffAvatar : IMAGES.avatar }}
            className="h-24 w-24 flex-shrink-0 rounded-full border border-white bg-[#c9e1e9] shadow-sm"
          />
          <View className="items-start">
            <Text className="mb-1.5 text-2xl font-bold tracking-tight text-[#0B2545]">
              {staff ? "Jordan Lee" : "Alex Morgan"}
            </Text>
            <View className="flex-row items-center gap-1.5 rounded-full bg-[#E0EDFB] px-3 py-1">
              <LineIcon name="user" size={14} color="#2563EB" strokeWidth={2.2} />
              <Text className="text-xs font-semibold leading-none text-[#2563EB]">
                {staff ? "Staff" : "Student"}
              </Text>
            </View>
          </View>
        </View>
        <View className="gap-3 px-5 pt-2">
          <ProfileRow icon="bell" label="Notification Settings" />
          <ProfileRow icon="help-circle" label="Help & Support" />
          <ProfileRow
            icon="log-out"
            label="Log Out"
            destructive
            onPress={() => showAlert("Log Out", "You have been logged out of this preview.")}
          />
        </View>
        {staff && (
          <View className="mx-5 mt-4 rounded-3xl border border-slate-100 bg-white p-5">
            <View className="mb-6 flex-row items-center gap-3">
              <LineIcon name="file-text" size={24} color="#0B2545" strokeWidth={2} />
              <Text className="text-xl font-bold tracking-tight text-[#0B2545]">
                Recent Audit Log
              </Text>
            </View>
            <View className="pl-6">
              <View className="absolute bottom-5 left-[3.5px] top-2 w-[1.5px] bg-slate-200" />
              {auditEvents.slice(0, 3).map((event) => (
                <View key={event.status} className="relative mb-6 flex-col last:mb-0">
                  <View
                    className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white"
                    style={{
                      backgroundColor: event.tone === "amber" ? "#D97706" : "#059669",
                    }}
                  />
                  <View className="flex-row items-center justify-between">
                    <View
                      className={`self-start rounded-full px-2 py-0.5 ${event.tone === "amber" ? "bg-[#FEF3C7]" : "bg-[#DCFCE7]"}`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-wide ${event.tone === "amber" ? "text-[#B45309]" : "text-[#059669]"}`}
                      >
                        {event.status}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-medium tracking-tight text-slate-500">
                      {event.time}
                    </Text>
                  </View>
                  <Text className="mt-1.5 text-xs font-semibold text-slate-800">
                    By {event.actor}
                  </Text>
                  <Text className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {event.action}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <BottomNav role={role} active="profile" go={go} />
    </ScreenContainer>
  );
}

/* ------------------------------------ app ------------------------------------ */

export default function ClaimItApp() {
  const [screen, setScreen] = useState<ScreenKey>("login");
  const [role, setRole] = useState<Role>("student");
  const go = (next: ScreenKey) => setScreen(next);

  return (
    <View className="flex-1">
      <AlertBanner />
      {(() => {
        switch (screen) {
          case "login":
            return <LoginScreen go={go} setRole={setRole} />;
          case "student-home":
            return <StudentHome go={go} />;
          case "report-lost":
            return <ReportLost go={go} />;
          case "matches":
            return <Matches go={go} />;
          case "claim-verification":
            return <ClaimVerification go={go} match={activeMatch} />;
          case "staff-home":
            return <StaffHome go={go} />;
          case "log-found":
            return <LogFound go={go} />;
          case "qr-tag":
            return <QrTag go={go} />;
          case "scan-release":
            return <ScanRelease go={go} />;
          case "audit":
            return <Audit go={go} />;
          case "profile":
            return <Profile role={role} go={go} />;
          default:
            return <LoginScreen go={go} setRole={setRole} />;
        }
      })()}
    </View>
  );
}
