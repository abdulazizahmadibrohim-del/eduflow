import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type Screen = "login" | "setup";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { login, setupAdmin, isSetupDone, authUser } = useAuth();

  const [screen, setScreen] = useState<Screen>("login");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [centerName, setCenterName] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (authUser) router.replace("/(tabs)");
  }, [authUser]);

  useEffect(() => {
    if (!isSetupDone) setScreen("setup");
    else setScreen("login");
  }, [isSetupDone]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleLogin = async () => {
    setError("");
    if (!phone.trim() || !pin.trim()) {
      setError("Telefon raqam va PIN kiriting");
      shake();
      return;
    }
    setLoading(true);
    const result = await login(phone.trim(), pin.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPin("");
      shake();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    }
  };

  const handleSetup = async () => {
    setError("");
    if (!centerName.trim()) { setError("Markaz nomini kiriting"); shake(); return; }
    if (!phone.trim()) { setError("Telefon raqam kiriting"); shake(); return; }
    if (pin.length < 4) { setError("PIN kamida 4 ta raqam bo'lishi kerak"); shake(); return; }
    if (pin !== confirmPin) { setError("PIN kodlar mos kelmadi"); shake(); setPin(""); setConfirmPin(""); return; }

    setLoading(true);
    const result = await setupAdmin(centerName.trim(), phone.trim(), pin.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
      shake();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    }
  };

  const isSetup = screen === "setup";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }, isDesktop && styles.innerDesktop]}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="school" size={44} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>EduFlow</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {isSetup ? "Tizimni sozlash" : "Kurs boshqaruvi"}
          </Text>
        </View>

        {/* Card */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateX: shakeAnim }] }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {isSetup ? "Birinchi marta sozlash" : "Kirish"}
          </Text>

          {isSetup && (
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="business-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="O'quv markaz nomi"
                placeholderTextColor={colors.mutedForeground}
                value={centerName}
                onChangeText={setCenterName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="+998 90 123 45 67"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder={isSetup ? "PIN kod (4-6 raqam)" : "PIN kod"}
              placeholderTextColor={colors.mutedForeground}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={6}
            />
            <TouchableOpacity onPress={() => setShowPin(p => !p)}>
              <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {isSetup && (
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="PIN kodni tasdiqlang"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                maxLength={6}
              />
            </View>
          )}

          {error.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={isSetup ? handleSetup : handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {isSetup ? "Saqlash va boshlash" : "Kirish"}
                </Text>
            }
          </TouchableOpacity>

          {isSetup && (
            <View style={[styles.infoBox, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
                Bu ma'lumotlar faqat bir marta kiritiladi. O'qituvchilar uchun akkaunt "Sozlamalar" bo'limida yaratiladi.
              </Text>
            </View>
          )}
        </Animated.View>

        <Text style={[styles.footer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          EduFlow v1.0 · O'quv markazi boshqaruvi
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  innerDesktop: { alignItems: "center", paddingHorizontal: 0 },
  logoWrap: { alignItems: "center", marginBottom: 32, width: "100%", maxWidth: 480 },
  logoCircle: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  appName: { fontSize: 32, marginBottom: 4 },
  tagline: { fontSize: 15 },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, gap: 12, marginBottom: 24, width: "100%", maxWidth: 480 },
  cardTitle: { fontSize: 20, marginBottom: 4 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "#FFFFFF", fontSize: 16 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { textAlign: "center", fontSize: 12 },
});
