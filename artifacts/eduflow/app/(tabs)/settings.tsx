import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type UserRole } from "@/context/AppContext";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const colorScheme = useColorScheme();
  const { user, setUser, students, courses, groups, payments } = useApp();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    centerName: user?.centerName ?? "",
    role: (user?.role ?? "admin") as UserRole,
  });

  const openProfile = () => {
    setForm({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      centerName: user?.centerName ?? "",
      role: user?.role ?? "admin",
    });
    setShowProfileModal(true);
  };

  const saveProfile = () => {
    setUser({ id: user?.id ?? "u1", ...form });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProfileModal(false);
  };

  const stats = {
    students: students.length,
    courses: courses.length,
    groups: groups.length,
    payments: payments.length,
    revenue: payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 8, paddingBottom: isWeb ? 34 + 80 : 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.primary }]}
          onPress={openProfile}
          activeOpacity={0.9}
        >
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>
              {user?.name ?? "Foydalanuvchi"}
            </Text>
            <Text style={[styles.profileRole, { fontFamily: "Inter_400Regular" }]}>
              {user?.role === "admin" ? "Administrator" : "O'qituvchi"}
              {user?.centerName ? ` · ${user.centerName}` : ""}
            </Text>
          </View>
          <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Statistics */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Statistika
          </Text>
          <View style={styles.statsGrid}>
            {[
              { label: "O'quvchilar", value: stats.students, icon: "people-outline" as const },
              { label: "Kurslar", value: stats.courses, icon: "book-outline" as const },
              { label: "Guruhlar", value: stats.groups, icon: "grid-outline" as const },
              { label: "To'lovlar", value: stats.payments, icon: "card-outline" as const },
            ].map(s => (
              <View key={s.label} style={[styles.statItem, { borderColor: colors.border }]}>
                <Ionicons name={s.icon} size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.revenueRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.revenueLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Jami daromad
            </Text>
            <Text style={[styles.revenueValue, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
              {stats.revenue.toLocaleString()} so'm
            </Text>
          </View>
        </View>

        {/* Role switch */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Rol
          </Text>
          <View style={styles.roleRow}>
            {(["admin", "teacher"] as UserRole[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  { backgroundColor: (user?.role ?? "admin") === r ? colors.primary : colors.muted },
                ]}
                onPress={() => {
                  setUser({ ...(user ?? { id: "u1", name: "", phone: "", role: r }), role: r });
                  Haptics.selectionAsync();
                }}
              >
                <Ionicons
                  name={r === "admin" ? "shield-checkmark" : "school"}
                  size={16}
                  color={(user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.roleText,
                    {
                      color: (user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {r === "admin" ? "Administrator" : "O'qituvchi"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Dastur haqida
          </Text>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Versiya
            </Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              1.0.0
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.secondary + "18" }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.secondary} />
            </View>
            <Text style={[styles.infoLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Platform
            </Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#10B98118" }]}>
              <Ionicons name="color-palette-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.infoLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Mavzu
            </Text>
            <Text style={[styles.infoValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {colorScheme === "dark" ? "Qorong'u" : "Yorug'"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ModalSheet visible={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profilni tahrirlash">
        <FormField
          label="To'liq ism"
          value={form.name}
          onChangeText={v => setForm(p => ({ ...p, name: v }))}
          placeholder="Ism Familiya"
          autoCapitalize="words"
        />
        <FormField
          label="Telefon"
          value={form.phone}
          onChangeText={v => setForm(p => ({ ...p, phone: v }))}
          placeholder="+998 90 123 45 67"
          keyboardType="phone-pad"
        />
        <FormField
          label="O'quv markaz nomi"
          value={form.centerName}
          onChangeText={v => setForm(p => ({ ...p, centerName: v }))}
          placeholder="masalan: Najot Ta'lim"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={saveProfile}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saqlash</Text>
        </TouchableOpacity>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { color: "#FFFFFF", fontSize: 20, marginBottom: 2 },
  profileRole: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 15, padding: 16, paddingBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statItem: { width: "50%", borderWidth: 0.5, alignItems: "center", padding: 16, gap: 4 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 12 },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
  },
  revenueLabel: { fontSize: 14 },
  revenueValue: { fontSize: 18 },
  roleRow: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 8 },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleText: { fontSize: 14 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { flex: 1, fontSize: 15 },
  infoValue: { fontSize: 14 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
});
