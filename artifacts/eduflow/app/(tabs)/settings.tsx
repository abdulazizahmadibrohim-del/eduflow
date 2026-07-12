import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormField } from "@/components/ui/FormField";
import { ModalSheet } from "@/components/ui/ModalSheet";
import {
  useApp, type Discount, type DiscountRequest, type DiscountType,
  type SalaryType, type Teacher, type UserRole,
} from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { confirmAction, showAlert } from "@/lib/confirm";
import { useColors } from "@/hooks/useColors";

const SUBJECT_COLORS: Record<string, string> = {
  "Matematika": "#1E3A8A", "Ingliz tili": "#7C3AED", "Dasturlash": "#10B981",
  "Fizika": "#F59E0B", "Kimyo": "#EF4444", "Tarix": "#6B7280",
};
function subjectColor(subject: string) { return SUBJECT_COLORS[subject] ?? "#1E3A8A"; }
function initials(name: string) { return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(); }

const EMPTY_FORM = {
  name: "", phone: "", subject: "",
  salaryType: "fixed" as SalaryType,
  salary: "", salaryPercent: "",
  status: "active" as "active" | "inactive",
};

function calcPercentEarnings(
  teacher: Teacher,
  payments: ReturnType<typeof useApp>["payments"],
  students: ReturnType<typeof useApp>["students"],
  groups: ReturnType<typeof useApp>["groups"],
  currentMonth: string
): number {
  if (teacher.salaryType !== "percentage" || !teacher.salaryPercent) return 0;
  const teacherGroupIds = groups.filter(g => g.teacherId === teacher.id).map(g => g.id);
  const teacherStudentIds = students.filter(s => teacherGroupIds.includes(s.groupId)).map(s => s.id);
  const paid = payments
    .filter(p => teacherStudentIds.includes(p.studentId) && p.status === "paid" && p.month === currentMonth)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.round((paid * teacher.salaryPercent) / 100);
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  earlybird: "Erta to'lov",
  registration: "Ro'yxatdan o'tish",
  group: "Guruh chegirmasi",
  individual: "Individual",
  monthly: "Oylik",
  custom: "Maxsus",
};

const DISCOUNT_TYPE_ICONS: Record<DiscountType, any> = {
  earlybird: "flash-outline",
  registration: "star-outline",
  group: "people-outline",
  individual: "person-outline",
  monthly: "calendar-outline",
  custom: "pricetag-outline",
};

interface DiscountFormState {
  name: string;
  type: DiscountType;
  percent: number;
  durationMonths: number;
  hasDuration: boolean;
  startDay: number;
  endDay: number;
  hasDateRange: boolean;
  active: boolean;
}

function makeEmptyDiscountForm(): DiscountFormState {
  return {
    name: "",
    type: "earlybird",
    percent: 10,
    durationMonths: 1,
    hasDuration: false,
    startDay: 1,
    endDay: 10,
    hasDateRange: true,
    active: true,
  };
}

function discountToForm(d: Discount): DiscountFormState {
  return {
    name: d.name,
    type: d.type,
    percent: d.percent,
    durationMonths: d.durationMonths ?? 1,
    hasDuration: !!d.durationMonths,
    startDay: d.startDay ?? 1,
    endDay: d.endDay ?? 10,
    hasDateRange: d.type === "earlybird" || !!(d.startDay || d.endDay),
    active: d.active,
  };
}

function Stepper({
  value, min, max, step = 1, onChange, label, colors,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={stepperStyles.row}>
      <Text style={[stepperStyles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={stepperStyles.controls}>
        <TouchableOpacity
          style={[stepperStyles.btn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => { onChange(Math.max(min, value - step)); Haptics.selectionAsync(); }}
          disabled={value <= min}
        >
          <Text style={[stepperStyles.btnText, { color: value <= min ? colors.mutedForeground : colors.foreground }]}>−</Text>
        </TouchableOpacity>
        <Text style={[stepperStyles.value, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {value}
        </Text>
        <TouchableOpacity
          style={[stepperStyles.btn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => { onChange(Math.min(max, value + step)); Haptics.selectionAsync(); }}
          disabled={value >= max}
        >
          <Text style={[stepperStyles.btnText, { color: value >= max ? colors.mutedForeground : colors.foreground }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  label: { fontSize: 13, flex: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 20, lineHeight: 28 },
  value: { fontSize: 17, minWidth: 40, textAlign: "center" },
});

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const colorScheme = useColorScheme();
  const { logout } = useAuth();
  const {
    user, setUser,
    students, courses, groups, payments, teachers,
    addTeacher, updateTeacher, deleteTeacher,
    discounts, addDiscount, updateDiscount, deleteDiscount,
    discountRequests, resolveDiscountRequest,
  } = useApp();

  const isAdmin = (user?.role ?? "admin") === "admin";
  const currentMonth = new Date().toISOString().slice(0, 7);
  const pendingRequests = discountRequests.filter(r => r.status === "pending");

  const handleLogout = () => {
    confirmAction("Chiqish", "Tizimdan chiqmoqchimisiz?", async () => {
      await logout();
      router.replace("/login" as any);
    }, "Chiqish");
  };

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", centerName: user?.centerName ?? "" });

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherPin, setTeacherPin] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountForm, setDiscountForm] = useState<DiscountFormState>(makeEmptyDiscountForm());

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscountRequest | null>(null);
  const [resolveForm, setResolveForm] = useState({ approvedPercent: 10, approvedDurationMonths: 1, hasDuration: false });

  const openAdd = () => {
    setEditingTeacher(null);
    setForm(EMPTY_FORM);
    setTeacherPin("");
    setShowTeacherModal(true);
  };
  const openEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setForm({ name: t.name, phone: t.phone, subject: t.subject, salaryType: t.salaryType, salary: t.salary?.toString() ?? "", salaryPercent: t.salaryPercent?.toString() ?? "", status: t.status });
    setTeacherPin("");
    setShowTeacherModal(true);
  };
  const saveTeacher = async () => {
    if (!form.name.trim() || !form.subject.trim()) return;
    if (!editingTeacher && teacherPin.length < 4) {
      showAlert("Xato", "O'qituvchi PIN kodi kamida 4 ta raqam bo'lishi kerak");
      return;
    }
    const base = {
      name: form.name.trim(), phone: form.phone.trim(), subject: form.subject.trim(),
      salaryType: form.salaryType,
      salary: form.salaryType === "fixed" && form.salary ? parseInt(form.salary.replace(/\D/g, ""), 10) : undefined,
      salaryPercent: form.salaryType === "percentage" && form.salaryPercent ? parseFloat(form.salaryPercent) : undefined,
      status: form.status,
    };
    if (editingTeacher) await updateTeacher(editingTeacher.id, base, teacherPin.length >= 4 ? teacherPin : undefined);
    else await addTeacher(base, teacherPin);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTeacherModal(false);
  };
  const confirmDelete = (t: Teacher) => {
    confirmAction("O'chirishni tasdiqlang", `${t.name} o'qituvchini o'chirmoqchimisiz?`, () => {
      deleteTeacher(t.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });
  };

  const openAddDiscount = () => {
    setEditingDiscount(null);
    setDiscountForm(makeEmptyDiscountForm());
    setShowDiscountModal(true);
  };
  const openEditDiscount = (d: Discount) => {
    setEditingDiscount(d);
    setDiscountForm(discountToForm(d));
    setShowDiscountModal(true);
  };
  const saveDiscount = () => {
    if (!discountForm.name.trim() || discountForm.percent < 1) return;
    const data: Omit<Discount, "id" | "createdAt"> = {
      name: discountForm.name.trim(),
      type: discountForm.type,
      percent: discountForm.percent,
      durationMonths: discountForm.hasDuration ? discountForm.durationMonths : undefined,
      startDay: discountForm.hasDateRange ? discountForm.startDay : undefined,
      endDay: discountForm.hasDateRange ? discountForm.endDay : undefined,
      active: discountForm.active,
    };
    if (editingDiscount) updateDiscount(editingDiscount.id, data);
    else addDiscount(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDiscountModal(false);
  };

  const openRequestReview = (r: DiscountRequest) => {
    setSelectedRequest(r);
    setResolveForm({
      approvedPercent: r.percent,
      approvedDurationMonths: r.approvedDurationMonths ?? 1,
      hasDuration: !!r.approvedDurationMonths,
    });
    setShowRequestModal(true);
  };
  const approveRequest = () => {
    if (!selectedRequest) return;
    const approvedPercent = resolveForm.approvedPercent;
    const approvedDurationMonths = resolveForm.hasDuration ? resolveForm.approvedDurationMonths : undefined;
    resolveDiscountRequest(selectedRequest.id, { status: "approved", approvedPercent, approvedDurationMonths });
    addDiscount({
      name: `${selectedRequest.targetType === "student" ? "O'quvchi" : "Guruh"} chegirmasi`,
      type: selectedRequest.targetType === "student" ? "individual" : "group",
      targetId: selectedRequest.targetId,
      percent: approvedPercent,
      month: selectedRequest.month,
      durationMonths: approvedDurationMonths,
      active: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowRequestModal(false);
  };
  const rejectRequest = () => {
    if (!selectedRequest) return;
    resolveDiscountRequest(selectedRequest.id, { status: "rejected" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowRequestModal(false);
  };

  const openProfile = () => {
    setProfileForm({ name: user?.name ?? "", phone: user?.phone ?? "", centerName: user?.centerName ?? "" });
    setShowProfileModal(true);
  };
  const saveProfile = () => {
    setUser({ id: user?.id ?? "u1", role: user?.role ?? "admin", teacherId: user?.teacherId, ...profileForm });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowProfileModal(false);
  };

  function salaryLabel(t: Teacher): string {
    if (t.salaryType === "fixed") return t.salary ? `Oylik: ${t.salary.toLocaleString()} so'm` : "Oylik belgilanmagan";
    if (!t.salaryPercent) return "Foiz belgilanmagan";
    const earned = calcPercentEarnings(t, payments, students, groups, currentMonth);
    return `Bu oy: ${earned.toLocaleString()} so'm`;
  }

  const adjustPercent = (teacherId: string, currentPercent: number, delta: number) => {
    const next = Math.max(1, Math.min(100, currentPercent + delta));
    updateTeacher(teacherId, { salaryPercent: next });
    Haptics.selectionAsync();
  };

  const getRequestTargetName = (r: DiscountRequest): string => {
    if (r.targetType === "student") {
      const s = students.find(s => s.id === r.targetId);
      return s?.name ?? "Noma'lum o'quvchi";
    }
    const g = groups.find(g => g.id === r.targetId);
    return g?.name ?? "Noma'lum guruh";
  };
  const getTeacherName = (teacherId: string): string => teachers.find(t => t.id === teacherId)?.name ?? "Noma'lum";

  const stats = {
    teachers: teachers.length, students: students.length,
    courses: courses.length, groups: groups.length,
    revenue: payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
  };

  const topPadding = isWeb ? 67 : insets.top;

  const discountSummary = (d: Discount): string => {
    const parts: string[] = [`${d.percent}%`];
    if (d.startDay && d.endDay) parts.push(`${d.startDay}–${d.endDay}-kun`);
    if (d.durationMonths) parts.push(`${d.durationMonths} oy`);
    else if (!d.startDay) parts.push("Cheksiz");
    return parts.join(" · ");
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 8, paddingBottom: isWeb ? 34 + 80 : 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity style={[styles.profileCard, { backgroundColor: colors.primary }]} onPress={openProfile} activeOpacity={0.9}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>{user?.name || "Foydalanuvchi"}</Text>
            <Text style={[styles.profileRole, { fontFamily: "Inter_400Regular" }]}>
              {isAdmin ? "Administrator" : "O'qituvchi"}{user?.centerName ? ` · ${user.centerName}` : ""}
            </Text>
          </View>
          <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Statistics */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Statistika</Text>
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
                <Ionicons name={r === "admin" ? "shield-checkmark" : "school"} size={16} color={(user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground} />
                <Text style={[styles.roleText, { color: (user?.role ?? "admin") === r ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {r === "admin" ? "Administrator" : "O'qituvchi"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {(user?.role === "teacher") && teachers.length > 0 && (
            <View style={styles.teacherSelectorSection}>
              <Text style={[styles.teacherSelectorLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Siz qaysi o'qituvchisiz?
              </Text>
              <View style={styles.teacherSelectorList}>
                {teachers.map(t => {
                  const isSelected = user?.teacherId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.teacherSelectorChip, {
                        backgroundColor: isSelected ? colors.secondary : colors.muted,
                        borderColor: isSelected ? colors.secondary : colors.border,
                      }]}
                      onPress={() => setUser({ ...(user ?? { id: "u1", name: "", phone: "", role: "teacher" }), teacherId: t.id })}
                    >
                      <Text style={[styles.teacherSelectorText, {
                        color: isSelected ? "#FFFFFF" : colors.foreground,
                        fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                      }]}>
                        {t.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Discount Requests (admin only, pending first) */}
        {isAdmin && discountRequests.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold", padding: 0 }]}>
                So'rovnomalar
              </Text>
              {pendingRequests.length > 0 && (
                <View style={[styles.pendingBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.pendingBadgeText, { fontFamily: "Inter_700Bold" }]}>{pendingRequests.length}</Text>
                </View>
              )}
            </View>
            {discountRequests
              .sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1))
              .slice(0, 5)
              .map((r, i) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.requestRow, { borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: colors.border }]}
                  onPress={() => r.status === "pending" ? openRequestReview(r) : undefined}
                  activeOpacity={r.status === "pending" ? 0.85 : 1}
                >
                  <View style={[styles.requestStatusDot, {
                    backgroundColor: r.status === "pending" ? colors.secondary : r.status === "approved" ? "#10B981" : "#EF4444",
                  }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.requestTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {getTeacherName(r.teacherId)} → {getRequestTargetName(r)}
                    </Text>
                    <Text style={[styles.requestSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {r.percent}% · {r.period === "monthly" ? `${r.month} oyiga` : "Cheksiz"}
                      {r.description ? ` · "${r.description}"` : ""}
                    </Text>
                    {r.status !== "pending" && (
                      <Text style={[styles.requestResolved, {
                        color: r.status === "approved" ? "#10B981" : "#EF4444",
                        fontFamily: "Inter_500Medium",
                      }]}>
                        {r.status === "approved"
                          ? `Tasdiqlandi${r.approvedPercent && r.approvedPercent !== r.percent ? ` (${r.approvedPercent}%)` : ""}`
                          : "Rad etildi"}
                      </Text>
                    )}
                  </View>
                  {r.status === "pending" && <Ionicons name="chevron-forward" size={16} color={colors.secondary} />}
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Discounts (admin only) */}
        {isAdmin && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold", padding: 0 }]}>
                Chegirmalar
              </Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#10B981" }]} onPress={openAddDiscount}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Qo'shish</Text>
              </TouchableOpacity>
            </View>
            {discounts.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Chegirmalar yo'q
                </Text>
              </View>
            ) : (
              discounts.map((d, i) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.discountRow, { borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: colors.border }]}
                  onPress={() => openEditDiscount(d)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.discountIconBox, { backgroundColor: (d.active ? "#10B981" : colors.mutedForeground) + "15" }]}>
                    <Ionicons name={DISCOUNT_TYPE_ICONS[d.type]} size={18} color={d.active ? "#10B981" : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.discountName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{d.name}</Text>
                    <Text style={[styles.discountSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {discountSummary(d)}
                    </Text>
                  </View>
                  <View style={styles.discountRight}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, { backgroundColor: d.active ? "#10B98120" : colors.muted }]}
                      onPress={() => { updateDiscount(d.id, { active: !d.active }); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.toggleText, { color: d.active ? "#10B981" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                        {d.active ? "Faol" : "Nofaol"}
                      </Text>
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Teachers (admin only) */}
        {isAdmin && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold", padding: 0 }]}>
                O'qituvchilar
              </Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={[styles.addBtnText, { fontFamily: "Inter_600SemiBold" }]}>Qo'shish</Text>
              </TouchableOpacity>
            </View>

            {teachers.length === 0 ? (
              <View style={styles.emptyTeachers}>
                <Ionicons name="school-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Hali o'qituvchi yo'q</Text>
              </View>
            ) : (
              teachers.map((t, i) => (
                <View key={t.id} style={[styles.teacherRow, { borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }]}>
                  <View style={[styles.teacherAvatar, { backgroundColor: subjectColor(t.subject) + "20" }]}>
                    <Text style={[styles.teacherInitials, { color: subjectColor(t.subject), fontFamily: "Inter_700Bold" }]}>
                      {initials(t.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.teacherNameRow}>
                      <Text style={[styles.teacherName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{t.name}</Text>
                      <View style={[styles.statusDot, { backgroundColor: t.status === "active" ? "#10B981" : "#EF4444" }]} />
                    </View>
                    <Text style={[styles.teacherSubject, { color: subjectColor(t.subject), fontFamily: "Inter_500Medium" }]}>{t.subject}</Text>
                    {t.phone ? <Text style={[styles.teacherMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{t.phone}</Text> : null}

                    <View style={[styles.salaryBadge, {
                      backgroundColor: t.salaryType === "percentage" ? colors.secondary + "15" : colors.primary + "12",
                    }]}>
                      <Ionicons
                        name={t.salaryType === "percentage" ? "pie-chart-outline" : "cash-outline"}
                        size={13}
                        color={t.salaryType === "percentage" ? colors.secondary : colors.primary}
                      />
                      {t.salaryType === "percentage" ? (
                        <View style={styles.percentStepper}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: colors.secondary + "20" }]}
                            onPress={() => adjustPercent(t.id, t.salaryPercent ?? 0, -1)}
                          >
                            <Text style={[styles.stepperIcon, { color: colors.secondary }]}>−</Text>
                          </TouchableOpacity>
                          <Text style={[styles.percentValue, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>
                            {t.salaryPercent ?? 0}%
                          </Text>
                          <TouchableOpacity
                            style={[styles.stepperBtn, { backgroundColor: colors.secondary + "20" }]}
                            onPress={() => adjustPercent(t.id, t.salaryPercent ?? 0, 1)}
                          >
                            <Text style={[styles.stepperIcon, { color: colors.secondary }]}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={[styles.salaryBadgeText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                          {salaryLabel(t)}
                        </Text>
                      )}
                    </View>
                    {t.salaryType === "percentage" && (
                      <Text style={[styles.teacherMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 }]}>
                        {salaryLabel(t)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.teacherActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + "18" }]} onPress={() => openEdit(t)}>
                      <Ionicons name="pencil" size={15} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#EF444418" }]} onPress={() => confirmDelete(t)}>
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
            { label: "Versiya", value: "2.1.0", icon: "information-circle-outline" as const, color: colors.primary },
            { label: "Platform", value: Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web", icon: "phone-portrait-outline" as const, color: colors.secondary },
            { label: "Mavzu", value: colorScheme === "dark" ? "Qorong'u" : "Yorug'", icon: "color-palette-outline" as const, color: "#10B981" },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.infoRow, { borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }]}>
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
      <ModalSheet visible={showTeacherModal} onClose={() => setShowTeacherModal(false)} title={editingTeacher ? "O'qituvchini tahrirlash" : "O'qituvchi qo'shish"}>
        <FormField label="To'liq ism *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Ism Familiya" autoCapitalize="words" />
        <FormField label="Fan / Yo'nalish *" value={form.subject} onChangeText={v => setForm(p => ({ ...p, subject: v }))} placeholder="masalan: Matematika" autoCapitalize="words" />
        <FormField label="Telefon raqami" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="+998 90 000 00 00" keyboardType="phone-pad" />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Maosh turi</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, styles.segmentLeft, { backgroundColor: form.salaryType === "fixed" ? colors.primary : colors.muted, borderColor: colors.border }]}
            onPress={() => setForm(p => ({ ...p, salaryType: "fixed" }))}
          >
            <Ionicons name="cash-outline" size={16} color={form.salaryType === "fixed" ? "#FFFFFF" : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: form.salaryType === "fixed" ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>O'zgarmas</Text>
            <Text style={[styles.segmentSub, { color: form.salaryType === "fixed" ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Oylik summa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, styles.segmentRight, { backgroundColor: form.salaryType === "percentage" ? colors.secondary : colors.muted, borderColor: colors.border }]}
            onPress={() => setForm(p => ({ ...p, salaryType: "percentage" }))}
          >
            <Ionicons name="pie-chart-outline" size={16} color={form.salaryType === "percentage" ? "#FFFFFF" : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: form.salaryType === "percentage" ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Foizli</Text>
            <Text style={[styles.segmentSub, { color: form.salaryType === "percentage" ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>To'lovdan %</Text>
          </TouchableOpacity>
        </View>

        {form.salaryType === "fixed" && (
          <FormField label="Oylik maosh" value={form.salary} onChangeText={v => setForm(p => ({ ...p, salary: v }))} placeholder="masalan: 2000000" keyboardType="numeric" suffix="so'm" />
        )}
        {form.salaryType === "percentage" && (
          <>
            <FormField
              label="O'quvchi to'lovidan foiz"
              value={form.salaryPercent}
              onChangeText={v => { const n = parseFloat(v); if (v === "" || (n >= 0 && n <= 100)) setForm(p => ({ ...p, salaryPercent: v })); }}
              placeholder="masalan: 40"
              keyboardType="numeric"
              suffix="%"
            />
            {form.salaryPercent ? (
              <View style={[styles.exampleBox, { backgroundColor: colors.secondary + "12", borderColor: colors.secondary + "30" }]}>
                <Ionicons name="calculator-outline" size={16} color={colors.secondary} />
                <Text style={[styles.exampleText, { color: colors.secondary, fontFamily: "Inter_400Regular" }]}>
                  Misol: O'quvchi 400,000 so'm to'lasa → o'qituvchi{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                    {Math.round((400000 * parseFloat(form.salaryPercent || "0")) / 100).toLocaleString()} so'm
                  </Text>{" "}oladi
                </Text>
              </View>
            ) : null}
          </>
        )}

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 4 }]}>Holat</Text>
        <View style={[styles.roleRow, { marginBottom: 16 }]}>
          {(["active", "inactive"] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.roleChip, { backgroundColor: form.status === s ? (s === "active" ? "#10B981" : "#EF4444") : colors.muted }]}
              onPress={() => setForm(p => ({ ...p, status: s }))}
            >
              <Ionicons name={s === "active" ? "checkmark-circle" : "close-circle"} size={16} color={form.status === s ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.roleText, { color: form.status === s ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {s === "active" ? "Faol" : "Faol emas"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormField
          label={editingTeacher ? "Yangi PIN kod (ixtiyoriy)" : "PIN kod * (4-6 raqam)"}
          value={teacherPin}
          onChangeText={setTeacherPin}
          placeholder="masalan: 1234"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />
        <View style={[styles.pinInfoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
          <Text style={[styles.pinInfoText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
            {editingTeacher ? "Bo'sh qoldirsa, eski PIN saqlanadi." : "O'qituvchi bu PIN bilan tizimga kiradi."}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: !form.name.trim() || !form.subject.trim() ? colors.muted : colors.primary }]}
          onPress={saveTeacher}
          activeOpacity={0.85}
          disabled={!form.name.trim() || !form.subject.trim()}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>{editingTeacher ? "Saqlash" : "Qo'shish"}</Text>
        </TouchableOpacity>
      </ModalSheet>

      {/* Discount Modal */}
      <ModalSheet visible={showDiscountModal} onClose={() => setShowDiscountModal(false)} title={editingDiscount ? "Chegirmani tahrirlash" : "Yangi chegirma"}>
        <FormField
          label="Chegirma nomi *"
          value={discountForm.name}
          onChangeText={v => setDiscountForm(p => ({ ...p, name: v }))}
          placeholder="masalan: Erta to'lov chegirmasi"
        />

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Turi</Text>
        <View style={styles.discountTypeGrid}>
          {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, {
                backgroundColor: discountForm.type === type ? "#10B981" : colors.muted,
                borderColor: discountForm.type === type ? "#10B981" : colors.border,
              }]}
              onPress={() => {
                const isEarlybird = type === "earlybird";
                setDiscountForm(p => ({
                  ...p,
                  type,
                  name: p.name || DISCOUNT_TYPE_LABELS[type],
                  hasDateRange: isEarlybird,
                }));
              }}
            >
              <Ionicons name={DISCOUNT_TYPE_ICONS[type]} size={14} color={discountForm.type === type ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.typeChipText, { color: discountForm.type === type ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {DISCOUNT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Percent stepper */}
        <Stepper
          label="Chegirma foizi (%)"
          value={discountForm.percent}
          min={1}
          max={100}
          onChange={v => setDiscountForm(p => ({ ...p, percent: v }))}
          colors={colors}
        />

        {/* Date range toggle */}
        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleRowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              Kun oralig'i (oy kunlari)
            </Text>
            <Text style={[styles.toggleRowSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Masalan: 1–10 kun oralig'ida amal qiladi
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.switchBtn, { backgroundColor: discountForm.hasDateRange ? "#10B981" : colors.muted }]}
            onPress={() => setDiscountForm(p => ({ ...p, hasDateRange: !p.hasDateRange }))}
          >
            <Text style={[styles.switchBtnText, { color: discountForm.hasDateRange ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {discountForm.hasDateRange ? "Ha" : "Yo'q"}
            </Text>
          </TouchableOpacity>
        </View>

        {discountForm.hasDateRange && (
          <View style={[styles.dayRangeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Stepper
              label={`Boshlanish kuni — ${discountForm.startDay}-kun`}
              value={discountForm.startDay}
              min={1}
              max={discountForm.endDay - 1}
              onChange={v => setDiscountForm(p => ({ ...p, startDay: v }))}
              colors={colors}
            />
            <Stepper
              label={`Tugash kuni — ${discountForm.endDay}-kun`}
              value={discountForm.endDay}
              min={discountForm.startDay + 1}
              max={31}
              onChange={v => setDiscountForm(p => ({ ...p, endDay: v }))}
              colors={colors}
            />
            <View style={[styles.dayRangePreview, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
              <Ionicons name="information-circle-outline" size={14} color="#10B981" />
              <Text style={[styles.dayRangePreviewText, { color: "#10B981", fontFamily: "Inter_400Regular" }]}>
                Har oyning {discountForm.startDay}–{discountForm.endDay}-kunlarida to'lov qilinganda {discountForm.percent}% chegirma beriladi
              </Text>
            </View>
          </View>
        )}

        {/* Duration toggle */}
        <View style={[styles.toggleRow, { borderColor: colors.border, marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleRowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              Muddatli chegirma
            </Text>
            <Text style={[styles.toggleRowSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {discountForm.hasDuration ? `${discountForm.durationMonths} oy amal qiladi` : "Cheksiz amal qiladi"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.switchBtn, { backgroundColor: discountForm.hasDuration ? colors.secondary : colors.muted }]}
            onPress={() => setDiscountForm(p => ({ ...p, hasDuration: !p.hasDuration }))}
          >
            <Text style={[styles.switchBtnText, { color: discountForm.hasDuration ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {discountForm.hasDuration ? "Ha" : "Yo'q"}
            </Text>
          </TouchableOpacity>
        </View>

        {discountForm.hasDuration && (
          <View style={[styles.durationBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Stepper
              label="Necha oy amal qiladi"
              value={discountForm.durationMonths}
              min={1}
              max={24}
              onChange={v => setDiscountForm(p => ({ ...p, durationMonths: v }))}
              colors={colors}
            />
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 8 }]}>Holat</Text>
        <View style={[styles.roleRow, { marginBottom: 20 }]}>
          {([true, false] as const).map(active => (
            <TouchableOpacity
              key={String(active)}
              style={[styles.roleChip, { backgroundColor: discountForm.active === active ? (active ? "#10B981" : "#EF4444") : colors.muted }]}
              onPress={() => setDiscountForm(p => ({ ...p, active }))}
            >
              <Ionicons name={active ? "checkmark-circle" : "close-circle"} size={16} color={discountForm.active === active ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.roleText, { color: discountForm.active === active ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {active ? "Faol" : "Nofaol"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: !discountForm.name.trim() || discountForm.percent < 1 ? colors.muted : "#10B981" }]}
          onPress={saveDiscount}
          disabled={!discountForm.name.trim() || discountForm.percent < 1}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>{editingDiscount ? "Saqlash" : "Qo'shish"}</Text>
        </TouchableOpacity>
        {editingDiscount && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.destructive }]}
            onPress={() => { deleteDiscount(editingDiscount.id); setShowDiscountModal(false); }}
          >
            <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>O'chirish</Text>
          </TouchableOpacity>
        )}
      </ModalSheet>

      {/* Discount Request Review Modal */}
      <ModalSheet visible={showRequestModal} onClose={() => setShowRequestModal(false)} title="So'rovnomani ko'rib chiqish">
        {selectedRequest && (
          <>
            <View style={[styles.requestDetailBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.requestDetailRow}>
                <Text style={[styles.requestDetailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>O'qituvchi</Text>
                <Text style={[styles.requestDetailValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {getTeacherName(selectedRequest.teacherId)}
                </Text>
              </View>
              <View style={styles.requestDetailRow}>
                <Text style={[styles.requestDetailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {selectedRequest.targetType === "student" ? "O'quvchi" : "Guruh"}
                </Text>
                <Text style={[styles.requestDetailValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {getRequestTargetName(selectedRequest)}
                </Text>
              </View>
              <View style={styles.requestDetailRow}>
                <Text style={[styles.requestDetailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>So'ralgan foiz</Text>
                <Text style={[styles.requestDetailValue, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>
                  {selectedRequest.percent}%
                </Text>
              </View>
              <View style={styles.requestDetailRow}>
                <Text style={[styles.requestDetailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Davr</Text>
                <Text style={[styles.requestDetailValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {selectedRequest.period === "monthly" ? `${selectedRequest.month} oyiga` : "Cheksiz"}
                </Text>
              </View>
              {selectedRequest.description && (
                <View style={[styles.requestDesc, { borderTopColor: colors.border }]}>
                  <Text style={[styles.requestDetailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Tavsif</Text>
                  <Text style={[styles.requestDetailValue, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {selectedRequest.description}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 12 }]}>
              Tasdiqlash sozlamalari
            </Text>

            <Stepper
              label="Tasdiqlanadigan foiz (%)"
              value={resolveForm.approvedPercent}
              min={1}
              max={100}
              onChange={v => setResolveForm(p => ({ ...p, approvedPercent: v }))}
              colors={colors}
            />

            <View style={[styles.toggleRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleRowLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Muddatli</Text>
                <Text style={[styles.toggleRowSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {resolveForm.hasDuration ? `${resolveForm.approvedDurationMonths} oy` : "Cheksiz"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switchBtn, { backgroundColor: resolveForm.hasDuration ? colors.secondary : colors.muted }]}
                onPress={() => setResolveForm(p => ({ ...p, hasDuration: !p.hasDuration }))}
              >
                <Text style={[styles.switchBtnText, { color: resolveForm.hasDuration ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {resolveForm.hasDuration ? "Ha" : "Yo'q"}
                </Text>
              </TouchableOpacity>
            </View>

            {resolveForm.hasDuration && (
              <View style={[styles.durationBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Stepper
                  label="Necha oy amal qiladi"
                  value={resolveForm.approvedDurationMonths}
                  min={1}
                  max={24}
                  onChange={v => setResolveForm(p => ({ ...p, approvedDurationMonths: v }))}
                  colors={colors}
                />
              </View>
            )}

            <View style={styles.resolveActions}>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: "#EF4444" }]}
                onPress={rejectRequest}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={[styles.rejectBtnText, { fontFamily: "Inter_600SemiBold" }]}>Rad etish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: "#10B981", flex: 1 }]}
                onPress={approveRequest}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.approveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Tasdiqlash</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  roleChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  roleText: { fontSize: 14 },
  teacherSelectorSection: { paddingHorizontal: 16, paddingBottom: 16 },
  teacherSelectorLabel: { fontSize: 13, marginBottom: 10 },
  teacherSelectorList: { gap: 8 },
  teacherSelectorChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  teacherSelectorText: { fontSize: 14 },
  pendingBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pendingBadgeText: { color: "#FFFFFF", fontSize: 12 },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  requestStatusDot: { width: 10, height: 10, borderRadius: 5 },
  requestTitle: { fontSize: 14, marginBottom: 2 },
  requestSub: { fontSize: 12 },
  requestResolved: { fontSize: 12, marginTop: 2 },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  discountIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  discountName: { fontSize: 14, marginBottom: 2 },
  discountSub: { fontSize: 12 },
  discountRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toggleText: { fontSize: 12 },
  emptyRow: { alignItems: "center", paddingVertical: 24 },
  emptyTeachers: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14 },
  teacherRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  teacherAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  teacherInitials: { fontSize: 16 },
  teacherNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  teacherName: { fontSize: 15 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  teacherSubject: { fontSize: 13, marginBottom: 2 },
  teacherMeta: { fontSize: 12, marginBottom: 4 },
  salaryBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start", flexWrap: "wrap" },
  salaryBadgeText: { fontSize: 12 },
  percentStepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  stepperIcon: { fontSize: 16, lineHeight: 22, textAlign: "center" },
  percentValue: { fontSize: 14, minWidth: 36, textAlign: "center" },
  teacherActions: { gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  segmentRow: { flexDirection: "row", gap: 0, marginBottom: 16, borderRadius: 14, overflow: "hidden" },
  segment: { flex: 1, padding: 14, gap: 4, borderWidth: 1 },
  segmentLeft: { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  segmentRight: { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  segmentText: { fontSize: 14 },
  segmentSub: { fontSize: 11 },
  exampleBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  exampleText: { fontSize: 13, flex: 1, lineHeight: 18 },
  discountTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeChipText: { fontSize: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  toggleRowLabel: { fontSize: 14, marginBottom: 2 },
  toggleRowSub: { fontSize: 12 },
  switchBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  switchBtnText: { fontSize: 13 },
  dayRangeBox: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  dayRangePreview: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  dayRangePreviewText: { fontSize: 12, flex: 1, lineHeight: 18 },
  durationBox: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  requestDetailBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  requestDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestDetailLabel: { fontSize: 13 },
  requestDetailValue: { fontSize: 14, textAlign: "right", flex: 1, marginLeft: 16 },
  requestDesc: { borderTopWidth: 0.5, paddingTop: 10, gap: 4 },
  resolveActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5 },
  rejectBtnText: { color: "#EF4444", fontSize: 15 },
  approveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 14 },
  approveBtnText: { color: "#FFFFFF", fontSize: 15 },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoLabel: { flex: 1, fontSize: 14 },
  infoValue: { fontSize: 14 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
  pinInfoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  pinInfoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginTop: 8, marginBottom: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  logoutBtnText: { fontSize: 15 },
});
