import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

const sdkVersion =
  Constants.expoConfig?.sdkVersion ?? "57";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-navy">
          <Text className="text-3xl font-bold text-white">C</Text>
        </View>

        <Text className="mb-2 text-3xl font-bold text-navy">ClaimIt</Text>
        <Text className="mb-8 text-center text-base text-muted">
          Lost something? Found something? Let&apos;s get it back.
        </Text>

        <View className="w-full rounded-2xl bg-surface p-5 shadow-sm">
          <Text className="mb-2 text-lg font-semibold text-navy">
            Phase 0 — Foundation ready
          </Text>
          <Text className="text-sm leading-5 text-muted">
            Expo SDK {sdkVersion} foundation dependencies are installed and
            verified. The Phase 1 UI prototype (student and staff screens with
            mock data) is the next product-development milestone.
          </Text>
        </View>

        <View className="mt-4 w-full flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-emerald-light p-4">
            <Text className="text-sm font-semibold text-emerald">
              Verified
            </Text>
            <Text className="text-xs text-muted">pnpm check · pnpm test</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-amber-light p-4">
            <Text className="text-sm font-semibold text-amber">Next</Text>
            <Text className="text-xs text-muted">Phase 1 UI prototype</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
