import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../lib/session";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { signIn, signUp } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptLegal, setAcceptLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const register = mode === "register";

  async function submit() {
    if (busy) return;
    if (register && fullName.trim().length < 2) { setError("Họ tên phải có ít nhất 2 ký tự."); return; }
    if (!email.includes("@")) { setError("Email không hợp lệ."); return; }
    if (register && password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự."); return; }
    if (register && !acceptLegal) { setError("Bạn cần đồng ý Điều khoản và Chính sách quyền riêng tư."); return; }
    setBusy(true);
    setError(null);
    try {
      if (register) await signUp(fullName, email, password, acceptLegal, acceptLegal);
      else await signIn(email, password);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>🐝 BeeBuddy</Text>
          <Text style={styles.heading}>{register ? "Tạo tài khoản" : "Chào mừng trở lại"}</Text>
          <Text style={styles.subheading}>Một tài khoản dùng chung cho ứng dụng và website.</Text>
          {register && <View style={styles.field}><Text style={styles.label}>Họ và tên</Text><TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Nguyễn Văn A" autoComplete="name" /></View>}
          <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ban@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" /></View>
          <View style={styles.field}><Text style={styles.label}>Mật khẩu</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Nhập mật khẩu" secureTextEntry autoComplete={register ? "new-password" : "current-password"} /></View>
          {register && (
            <Pressable style={styles.consentRow} onPress={() => setAcceptLegal((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: acceptLegal }}>
              <View style={[styles.checkbox, acceptLegal && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{acceptLegal ? "✓" : ""}</Text></View>
              <Text style={styles.consentText}>Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của BeeBuddy.</Text>
            </Pressable>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => void submit()}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{register ? "Đăng ký" : "Đăng nhập"}</Text>}</Pressable>
          <Link href={register ? "/sign-in" : "/sign-up"} style={styles.link}>{register ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</Link>
          <Link href="/" style={styles.guest}>Khám phá với tư cách khách</Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF9E9" },
  content: { padding: 24, paddingTop: 38, flexGrow: 1 },
  brand: { color: "#B37400", fontSize: 20, fontWeight: "800" },
  heading: { color: "#342409", fontSize: 30, fontWeight: "800", marginTop: 28 },
  subheading: { color: "#806C4E", fontSize: 15, marginTop: 8, marginBottom: 28 },
  field: { marginBottom: 18 },
  label: { color: "#342409", fontWeight: "700", marginBottom: 7 },
  input: { backgroundColor: "white", borderColor: "#E4D6B9", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: "#342409" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderColor: "#BFA873", borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  checkboxChecked: { backgroundColor: "#FF7300", borderColor: "#FF7300" },
  checkboxMark: { color: "white", fontWeight: "900" },
  consentText: { flex: 1, color: "#6F5D40", fontSize: 13, lineHeight: 19 },
  error: { color: "#A53324", marginBottom: 12 },
  button: { backgroundColor: "#342409", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 6 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  link: { color: "#9D6500", textAlign: "center", fontWeight: "700", marginTop: 22 },
  guest: { color: "#806C4E", textAlign: "center", marginTop: 22 },
});
