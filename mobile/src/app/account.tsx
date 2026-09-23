import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../lib/session";

export default function Account() {
  const { user, signOut } = useSession();
  if (!user) return null;

  async function leave() {
    await signOut();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.card}>
        <Text style={styles.title}>{user.profile?.fullName ?? "Thành viên BeeBuddy"}</Text>
        <Text style={styles.detail}>{user.email}</Text>
        <Text style={styles.detail}>Gói: {user.tier}</Text>
      </View>
      <Pressable style={styles.button} onPress={() => void leave()}><Text style={styles.buttonText}>Đăng xuất</Text></Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFF9E9" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "#F0E5C8" },
  title: { color: "#342409", fontSize: 22, fontWeight: "800" },
  detail: { color: "#806C4E", marginTop: 10, fontSize: 15 },
  button: { backgroundColor: "#342409", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "white", fontWeight: "700" },
});
