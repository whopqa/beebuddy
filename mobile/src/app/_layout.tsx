import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SessionProvider, useSession } from "../lib/session";

function Navigation() {
  const { loading, user } = useSession();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF9E9" }}>
        <ActivityIndicator size="large" color="#D28B00" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#FFF9E9" }, headerTintColor: "#442D0A", contentStyle: { backgroundColor: "#FFF9E9" } }}>
      <Stack.Screen name="index" options={{ title: "BeeBuddy" }} />
      <Stack.Screen name="sign-in" options={{ title: "Đăng nhập" }} />
      <Stack.Screen name="sign-up" options={{ title: "Đăng ký" }} />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="account" options={{ title: "Tài khoản" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return <SessionProvider><Navigation /></SessionProvider>;
}
