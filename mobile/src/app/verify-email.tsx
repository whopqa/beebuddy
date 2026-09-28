import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "../lib/api";
import { useSession } from "../lib/session";

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string; devCode?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const [code, setCode] = useState(typeof params.devCode === "string" ? params.devCode : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { verifyEmail } = useSession();

  async function confirm() {
    if (!/^\d{6}$/.test(code)) { setError("Mã xác minh phải gồm đúng 6 chữ số."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await verifyEmail(email, code);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xác minh email.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await authApi.requestEmailVerification(email);
      if (result.developmentCode) setCode(result.developmentCode);
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi lại mã.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.brand}>🐝 BeeBuddy</Text>
        <Text style={styles.heading}>Xác minh email</Text>
        <Text style={styles.description}>Nhập mã 6 chữ số đã gửi đến {email || "email của bạn"}.</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}
        <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={() => void confirm()}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Xác minh</Text>}
        </Pressable>
        <Pressable disabled={busy || !email} onPress={() => void resend()}>
          <Text style={styles.link}>Gửi lại mã xác minh</Text>
        </Pressable>
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
  input: { backgroundColor: "white", borderColor: "#E4D6B9", borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 28, letterSpacing: 10, textAlign: "center", color: "#342409" },
  error: { color: "#A53324", marginTop: 12 },
  notice: { color: "#28734C", marginTop: 12 },
  button: { backgroundColor: "#342409", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  link: { color: "#9D6500", textAlign: "center", fontWeight: "700", marginTop: 22 },
});
