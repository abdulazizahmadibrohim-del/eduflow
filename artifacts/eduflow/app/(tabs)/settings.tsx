import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormField } from "@/components/ui/FormField";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { useApp, type Teacher, type UserRole } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const SUBJECT_COLORS: Record<string, string> = {
  "Matematika": "#1E3A8A",
  "Ingliz tili": "#7C3AED",
  "Dasturlash": "#10B981",
  "Fizika": "#F59E0B",
  "Kimyo": "#EF4444",
  "Tarix": "#6B7280",
};

function subjectColor(subject: string) {
  return SUBJECT_COLORS[subject] ?? "#1E3A8A";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const EMPTY_TEACHER = { name: "", phone: "", subject: "", salary: "", status: "active" as "active" | "inactive" };

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const colorScheme = useColorScheme();
  const { user, setUser, students, courses, groups, payments, teachers, addTeacher, updateTeacher, deleteTeacher } = useApp();

  const isAdmin = (user?.role ?? "admin") === "admin";

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    centerName: user?.centerName ?? "",
  });

  // Teacher modal
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState(EMPTY_TEACHER);

  const openAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm(EMPTY_TEACHER);
    setShowTeacherModal(true);
  };

  const openEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherForm({ name: t.name, phone: t.phone, subject: t.subject, salary: t.salary?.toString() ?? "", status: t.status });
    setShowTeacherModal(true);
  };

  const saveTeacher = () => {
    if (!teacherForm.name.trim() || !teacherForm.subject.trim()) return;
    const data = {
      name: teacherForm.name.trim(),
      phone: teacherForm.phone.trim(),
      subject: teacherForm.subject.trim(),
      salary: teacherForm.salary ? parseInt(teacherForm.salary.replace(/\D/g, ""), 10) : undefined,
      status: teacherForm.status,
    };
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, data);
    } else {
      addTeacher(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTeacherModal(false);
  };

  const confirmDeleteTeacher = (t: Teacher) => {
    Alert.alert(
      "O'chirishni tasdiqlang",
      `${t.name} o'qituvchini o'chirmoqchimisiz?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: () => {
            deleteTeacher(t.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const openProfile = () => {
    setProfileForm({ name: user?.name ?? "", phone: user?.phone ?? "", centerName: user?.centerName ?? "" });
    setShowProfileModal(true);
  };

  const saveProfile = () => {
    setUser({ id: user?.id ?? "u1", role: user?.role ?? "admin", ...profileForm });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProfileModal(false);
  };

  const stats = {
    teachers: teachers.length,
    students: students.length,
    courses: courses.length,
    groups: groups.length,
    revenue: payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 8, paddingBottom: isWeb ? 34 + 80 : 80 }]}
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
              {user?.name || "Foydalanuvchi"}
            </Text>
            <Text style={[styles.profileRole, { fontFamily: "Inter_400Regular" }]}>
              {isAdmin ? "Administrator" : "O'qituvchi"}
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
              { label: "O'qituvchilar", value: stats.teachers, icon: "school-outline" as const, color: colors.secondary },
              { label: "O'quvchilar", value: stats.students, icon: "people-outline" as const, color: colors.primary },
              { label: "Kurslar", value: stats.courses, icon: "book-outline" as const, color: "#F59E0B" },
              { label: "Guruhlar", value: stats.groups, icon: "grid-outline" as const, color: "#10B981" },
            ].map(s => (
              <View key={s.label} style={[styles.statItem, { borderColor: colors.border }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.revenueRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.revenueLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Jami daromad</Text>
            <Text style={[styles.revenueValue, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
              {stats.revenue.toLocaleString()} so'm
            </Text>
          </View>
        </View>

        {/* Role Switch */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Rol</Text>
          <View style={styles.roleRow}>
            {(["admin", "teacher"] as UserRole[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, { backgroundColor: (user?.role ?? "admin") === r ? colors.primary : colors.muted }]}
                onPress={() => { setUser({ ...(user ?? { id: "u1", name: "", phone: "" }), role: r }); Haptics.selectionAsync(); }}
              >
                <Ionicons
                  name={r === "admin" ? "shield-checkmark" : "school"}
                  size={16}
                  color={(user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground}
                />
                <Text style={[styles.roleText, { color: (user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {r === "admin" ? "Administrator" : "O'qituvchi"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Teachers (Admin only) */}
        {isAdmin && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                O'qituvchilar
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAddTeacher}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Qo'shish</Text>
              </TouchableOpacity>
            </View>

            {teachers.length === 0 ? (
              <View style={styles.emptyTeachers}>
                <Ionicons name="school-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Hali o'qituvchi yo'q
                </Text>
              </View>
            ) : (
              teachers.map((t, i) => (
                <View
                  key={t.id}
                  style={[
                    styles.teacherRow,
                    { borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border },
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.teacherAvatar, { backgroundColor: subjectColor(t.subject) + "20" }]}>
                    <Text style={[styles.teacherInitials, { color: subjectColor(t.subject), fontFamily: "Inter_700Bold" }]}>
                      {initials(t.name)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.teacherNameRow}>
                      <Text style={[styles.teacherName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {t.name}
                      </Text>
                      <View style={[styles.statusDot, { backgroundColor: t.status === "active" ? "#10B981" : "#EF4444" }]} />
                    </View>
                    <Text style={[styles.teacherSubject, { color: subjectColor(t.subject), fontFamily: "Inter_500Medium" }]}>
                      {t.subject}
                    </Text>
                    {t.phone ? (
                      <Text style={[styles.teacherPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {t.phone}
                      </Text>
                    ) : null}
                    {t.salary ? (
                      <Text style={[styles.teacherSalary, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        Maosh: {t.salary.toLocaleString()} so'm
                      </Text>
                    ) : null}
                  </View>

                  {/* Actions */}
                  <View style={styles.teacherActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                      onPress={() => openEditTeacher(t)}
                    >
                      <Ionicons name="pencil" size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#EF444418" }]}
                      onPress={() => confirmDeleteTeacher(t)}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Dastur haqida</Text>
          {[
            { label: "Versiya", value: "1.0.0", icon: "information-circle-outline" as const, color: colors.primary },
            { label: "Platform", value: Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web", icon: "phone-portrait-outline" as const, color: colors.secondary },
            { label: "Mavzu", value: colorScheme === "dark" ? "Qorong'u" : "Yorug'", icon: "color-palette-outline" as const, color: "#10B981" },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[styles.infoRow, { borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }]}
            >
              <View style={[styles.infoIcon, { backgroundColor: item.color + "18" }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.infoLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <ModalSheet visible={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profilni tahrirlash">
        <FormField label="To'liq ism" value={profileForm.name} onChangeText={v => setProfileForm(p => ({ ...p, name: v }))} placeholder="Ism Familiya" autoCapitalize="words" />
        <FormField label="Telefon" value={profileForm.phone} onChangeText={v => setProfileForm(p => ({ ...p, phone: v }))} placeholder="+998 90 123 45 67" keyboardType="phone-pad" />
        <FormField label="O'quv markaz nomi" value={profileForm.centerName} onChangeText={v => setProfileForm(p => ({ ...p, centerName: v }))} placeholder="masalan: Najot Ta'lim" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveProfile} activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saqlash</Text>
        </TouchableOpacity>
      </ModalSheet>

      {/* Teacher Modal */}
      <ModalSheet
        visible={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        title={editingTeacher ? "O'qituvchini tahrirlash" : "O'qituvchi qo'shish"}
      >
        <FormField
          label="To'liq ism *"
          value={teacherForm.name}
          onChangeText={v => setTeacherForm(p => ({ ...p, name: v }))}
          placeholder="Ism Familiya"
          autoCapitalize="words"
        />
        <FormField
          label="Fan / Yo'nalish *"
          value={teacherForm.subject}
          onChangeText={v => setTeacherForm(p => ({ ...p, subject: v }))}
          placeholder="masalan: Matematika"
          autoCapitalize="words"
        />
        <FormField
          label="Telefon raqami"
          value={teacherForm.phone}
          onChangeText={v => setTeacherForm(p => ({ ...p, phone: v }))}
          placeholder="+998 90 000 00 00"
          keyboardType="phone-pad"
        />
        <FormField
          label="Oylik maosh (so'm)"
          value={teacherForm.salary}
          onChangeText={v => setTeacherForm(p => ({ ...p, salary: v }))}
          placeholder="masalan: 2000000"
          keyboardType="numeric"
          suffix="so'm"
        />

        {/* Status toggle */}
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Holat</Text>
        <View style={[styles.roleRow, { marginBottom: 20 }]}>
          {(["active", "inactive"] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.roleChip, { backgroundColor: teacherForm.status === s ? (s === "active" ? "#10B981" : "#EF4444") : colors.muted }]}
              onPress={() => setTeacherForm(p => ({ ...p, status: s }))}
            >
              <Ionicons name={s === "active" ? "checkmark-circle" : "close-circle"} size={16} color={teacherForm.status === s ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.roleText, { color: teacherForm.status === s ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {s === "active" ? "Faol" : "Faol emas"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: !teacherForm.name.trim() || !teacherForm.subject.trim() ? colors.muted : colors.primary }]}
          onPress={saveTeacher}
          activeOpacity={0.85}
          disabled={!teacherForm.name.trim() || !teacherForm.subject.trim()}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {editingTeacher ? "Saqlash" : "Qo'shish"}
          </Text>
        </TouchableOpacity>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16 },
  profileCard: { borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  profileAvatar: { width: 60, height: 60, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  profileName: { color: "#FFFFFF", fontSize: 20, marginBottom: 2 },
  profileRole: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 15, padding: 16, paddingBottom: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 12, paddingTop: 14, paddingBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#FFFFFF", fontSize: 13 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  statItem: { width: "50%", borderWidth: 0.5, alignItems: "center", padding: 16, gap: 4 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 12 },
  revenueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1 },
  revenueLabel: { fontSize: 14 },
  revenueValue: { fontSize: 18 },
  roleRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  roleChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  roleText: { fontSize: 14 },
  teacherRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  teacherAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  teacherInitials: { fontSize: 16 },
  teacherNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  teacherName: { fontSize: 15 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  teacherSubject: { fontSize: 13, marginBottom: 1 },
  teacherPhone: { fontSize: 12, marginTop: 1 },
  teacherSalary: { fontSize: 12 },
  teacherActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyTeachers: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { flex: 1, fontSize: 15 },
  infoValue: { fontSize: 14 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
});
