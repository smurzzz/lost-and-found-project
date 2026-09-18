import { Text, View } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-2 text-xl font-semibold text-navy">
          Screen not found
        </Text>
        <Link href="/" className="mt-2 text-base text-emerald">
          Go back home
        </Link>
      </View>
    </>
  );
}
