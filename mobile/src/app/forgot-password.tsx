import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit() {
    if (!email.includes("@")) { setError("Email không hợp lệ."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await authApi.requestPasswordReset(email.trim());
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi yêu cầu đặt lại mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.brand}>🐝 BeeBuddy</Text>
        <Text style={styles.heading}>Quên mật khẩu?</Text>
        <Text style={styles.description}>Nhập email đã đăng ký. BeeBuddy sẽ gửi liên kết đặt lại mật khẩu an toàn.</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ban@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => void submit()}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Gửi liên kết</Text>}
        </Pressable>
        <Link href="/sign-in" style={styles.link}>Quay lại đăng nhập</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF9E9" },
  content: { padding: 24, paddingTop: 48 },
  brand: { color: "#B37400", fontSize: 20, fontWeight: "800" },
  heading: { color: "#342409", fontSize: 30, fontWeight: "800", marginTop: 28 },
  description: { color: "#806C4E", fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 24 },
  input: { backgroundColor: "white", borderColor: "#E4D6B9", borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, color: "#342409" },
  error: { color: "#A53324", marginTop: 12 },
  notice: { color: "#28734C", marginTop: 12, lineHeight: 20 },
  button: { backgroundColor: "#342409", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  link: { color: "#9D6500", textAlign: "center", fontWeight: "700", marginTop: 22 },
});
