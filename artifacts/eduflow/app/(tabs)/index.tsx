import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { StatCard } from "@/components/ui/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, students, courses, groups, payments, discountRequests, addTransaction } = useApp();
  const isWeb = Platform.OS === "web";
  const isTeacher = user?.role === "teacher";
  const isAdmin = (user?.role ?? "admin") === "admin";

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [txForm, setTxForm] = useState({ amount: "", method: "cash" as "cash" | "card", note: "" });

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups.map(g => g.id);
    return groups.filter(g => g.teacherId === user.teacherId).map(g => g.id);
  }, [isTeacher, user, groups]);

  const myStudentIds = useMemo(() => {
    if (!isTeacher) return students.map(s => s.id);
    return students.filter(s => myGroupIds.includes(s.groupId)).map(s => s.id);
  }, [isTeacher, students, myGroupIds]);

  const stats = useMemo(() => {
    const visibleStudents = isTeacher
      ? students.filter(s => myStudentIds.includes(s.id))
      : students;
    const activeStudents = visibleStudents.filter(s => s.status === "active").length;
    const monthPayments = payments.filter(p => p.month === currentMonth && (!isTeacher || myStudentIds.includes(p.studentId)));
    const paidAmount = monthPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
    const overdueCount = payments.filter(p =>
      (!isTeacher || myStudentIds.includes(p.studentId)) &&
      (p.status === "overdue" || (p.status === "pending" && p.month < currentMonth))
    ).length;
    const pendingRequests = discountRequests.filter(r => r.status === "pending").length;
    return { activeStudents, paidAmount, overdueCount, courseCount: courses.length, pendingRequests };
  }, [students, payments, courses, currentMonth, myStudentIds, isTeacher, discountRequests]);

  const recentPayments = useMemo(() => {
    const statusOrder: Record<string, number> = { overdue: 0, partial: 1, pending: 2, paid: 3 };
    return payments
      .filter(p => p.status !== "paid" && (!isTeacher || myStudentIds.includes(p.studentId)))
      .sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2))
      .slice(0, 5);
  }, [payments, isTeacher, myStudentIds]);

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);

  const openTxModal = (paymentId: string) => {
    const p = payments.find(pay => pay.id === paymentId);
    if (!p) return;
    setSelectedPaymentId(paymentId);
    const remaining = p.amount - (p.paidTotal ?? 0);
    setTxForm({ amount: remaining.toString(), method: "cash", note: "" });
    setShowTxModal(true);
  };

  const saveTx = () => {
    if (!txForm.amount || !selectedPaymentId) return;
    addTransaction(selectedPaymentId, {
      amount: Number(txForm.amount),
      method: txForm.method,
      paidAt: new Date().toISOString().split("T")[0],
      note: txForm.note || undefined,
    });
    setShowTxModal(false);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: isWeb ? 34 + 80 : 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {isTeacher ? "O'qituvchi paneli" : "Xush kelibsiz,"}
            </Text>
            <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {user?.name ?? (isTeacher ? "O'qituvchi" : "Admin")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: isTeacher ? colors.secondary : colors.primary }]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Ionicons name={isTeacher ? "school" : "person"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Pending discount requests banner (admin only) */}
        {isAdmin && stats.pendingRequests > 0 && (
          <TouchableOpacity
            style={[styles.requestsBanner, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}
            onPress={() => router.push("/(tabs)/settings")}
            activeOpacity={0.85}
          >
            <View style={[styles.requestsBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.requestsBadgeText, { fontFamily: "Inter_700Bold" }]}>{stats.pendingRequests}</Text>
            </View>
            <Text style={[styles.requestsText, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
              ta chegirma so'rovnomasi kutilmoqda
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
          </TouchableOpacity>
        )}

        {/* Teacher group info banner */}
        {isTeacher && user?.teacherId && (
          <View style={[styles.teacherBanner, { backgroundColor: colors.secondary + "12", borderColor: colors.secondary + "25" }]}>
            <Ionicons name="school-outline" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.teacherBannerTitle, { color: colors.secondary, fontFamily: "Inter_600SemiBold" }]}>
                O'qituvchi rejimi
              </Text>
              <Text style={[styles.teacherBannerSub, { color: colors.secondary + "BB", fontFamily: "Inter_400Regular" }]}>
                {myGroupIds.length} ta guruh · {myStudentIds.length} ta o'quvchi
              </Text>
            </View>
          </View>
        )}

        {/* Monthly Revenue Banner (admin only) */}
        {isAdmin && (
          <View style={[styles.revenueBanner, { backgroundColor: colors.primary }]}>
            <View>
              <Text style={[styles.revenueLabel, { fontFamily: "Inter_400Regular" }]}>Bu oylik daromad</Text>
              <Text style={[styles.revenueAmount, { fontFamily: "Inter_700Bold" }]}>
                {stats.paidAmount.toLocaleString()} so'm
              </Text>
              <Text style={[styles.revenueMonth, { fontFamily: "Inter_400Regular" }]}>
                {currentMonth} · {payments.filter(p => p.month === currentMonth && p.status === "paid").length} ta to'lov
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <Ionicons name="cash-outline" size={44} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Faol o'quvchilar"
            value={stats.activeStudents}
            color={colors.primary}
            icon={<Ionicons name="people" size={22} color={colors.primary} />}
            onPress={() => router.push("/(tabs)/students")}
          />
          <StatCard
            label={isTeacher ? "Guruhlarim" : "Kurslar"}
            value={isTeacher ? myGroupIds.length : stats.courseCount}
            color={colors.secondary}
            icon={<Ionicons name={isTeacher ? "grid" : "book"} size={22} color={colors.secondary} />}
            onPress={() => router.push("/(tabs)/courses")}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            label={isTeacher ? "Kurslar" : "Guruhlar"}
            value={isTeacher ? stats.courseCount : groups.length}
            color="#10B981"
            icon={<Ionicons name={isTeacher ? "book" : "grid"} size={22} color="#10B981" />}
            onPress={() => router.push("/(tabs)/courses")}
          />
          <StatCard
            label="Qarzdorlar"
            value={stats.overdueCount}
            color={colors.destructive}
            icon={<Ionicons name="warning" size={22} color={colors.destructive} />}
            onPress={() => router.push("/(tabs)/payments")}
          />
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/students")}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.quickBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {isTeacher ? "O'quvchilar" : "O'quvchi qo'shish"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/(tabs)/payments")}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.quickBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {isTeacher ? "To'lovlar" : "To'lov kiritish"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Payments */}
        {recentPayments.length > 0 && (
          <View>
            <SectionHeader
              title={isTeacher ? "O'quvchilar to'lovlari" : "Kutilayotgan to'lovlar"}
              actionLabel="Barchasi"
              onAction={() => router.push("/(tabs)/payments")}
            />
            {recentPayments.map(p => (
              <PaymentCard
                key={p.id}
                payment={p}
                student={students.find(s => s.id === p.studentId)}
                onAddTransaction={isAdmin ? () => openTxModal(p.id) : undefined}
                onMarkPaid={isAdmin ? () => openTxModal(p.id) : undefined}
              />
            ))}
          </View>
        )}

        {recentPayments.length === 0 && (
          <View style={[styles.allClearBox, { backgroundColor: "#10B98112", borderColor: "#10B98130" }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text style={[styles.allClearText, { color: "#10B981", fontFamily: "Inter_600SemiBold" }]}>
              {isTeacher ? "Hamma to'lovlar tartibda!" : "Kutilayotgan to'lovlar yo'q!"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Transaction Modal (admin only) */}
      <ModalSheet visible={showTxModal} onClose={() => setShowTxModal(false)} title="Tez to'lov qo'shish">
        {selectedPayment && (
          <>
            <View style={[styles.txInfoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.txInfoStudent, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {students.find(s => s.id === selectedPayment.studentId)?.name ?? "—"}
              </Text>
              <Text style={[styles.txInfoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Jami: {selectedPayment.amount.toLocaleString()} so'm · To'langan: {(selectedPayment.paidTotal ?? 0).toLocaleString()} so'm
              </Text>
              <Text style={[styles.txInfoRemaining, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                Qoldi: {(selectedPayment.amount - (selectedPayment.paidTotal ?? 0)).toLocaleString()} so'm
              </Text>
            </View>

            <FormField
              label="To'lov miqdori (so'm) *"
              value={txForm.amount}
              onChangeText={v => setTxForm(p => ({ ...p, amount: v }))}
              placeholder="350000"
              keyboardType="numeric"
              suffix="so'm"
            />

            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>To'lov usuli</Text>
            <View style={styles.methodPickerRow}>
              {(["cash", "card"] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, {
                    backgroundColor: txForm.method === m ? (m === "cash" ? "#10B981" : colors.primary) : colors.muted,
                    flex: 1,
                  }]}
                  onPress={() => setTxForm(p => ({ ...p, method: m }))}
                >
                  <Ionicons name={m === "cash" ? "cash-outline" : "card-outline"} size={18} color={txForm.method === m ? "#FFFFFF" : colors.mutedForeground} />
                  <Text style={[styles.methodChipText, { color: txForm.method === m ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {m === "cash" ? "Naqd" : "Plastik"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormField
              label="Izoh (ixtiyoriy)"
              value={txForm.note}
              onChangeText={v => setTxForm(p => ({ ...p, note: v }))}
              placeholder="Izoh..."
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: !txForm.amount ? 0.5 : 1 }]}
              onPress={saveTx}
              disabled={!txForm.amount}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saqlash</Text>
            </TouchableOpacity>
          </>
        )}
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16 },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 24 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  requestsBanner: {
    marginHorizontal: 20, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1,
  },
  requestsBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  requestsBadgeText: { color: "#FFFFFF", fontSize: 12 },
  requestsText: { flex: 1, fontSize: 14 },
  teacherBanner: {
    marginHorizontal: 20, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1,
  },
  teacherBannerTitle: { fontSize: 14 },
  teacherBannerSub: { fontSize: 12, marginTop: 2 },
  revenueBanner: {
    marginHorizontal: 20, borderRadius: 20, padding: 24,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden",
  },
  revenueLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  revenueAmount: { color: "#FFFFFF", fontSize: 28, marginVertical: 4 },
  revenueMonth: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  revenueIcon: { opacity: 0.8 },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  quickActions: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  quickBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  quickBtnText: { color: "#FFFFFF", fontSize: 14 },
  allClearBox: {
    marginHorizontal: 20, borderRadius: 16, padding: 20, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  allClearText: { fontSize: 15 },
  txInfoBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6, marginBottom: 16 },
  txInfoStudent: { fontSize: 16 },
  txInfoLabel: { fontSize: 13 },
  txInfoRemaining: { fontSize: 15, marginTop: 2 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  methodPickerRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  methodChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  methodChipText: { fontSize: 14 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  border: { borderWidth: 1 },
});
