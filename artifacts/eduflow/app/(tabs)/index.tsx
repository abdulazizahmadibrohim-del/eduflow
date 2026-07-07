import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { StatCard } from "@/components/ui/StatCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PaymentCard } from "@/components/ui/PaymentCard";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, students, courses, groups, payments, discountRequests, addTransaction } = useApp();
  const isWeb = Platform.OS === "web";
  const isTeacher = user?.role === "teacher";

  const currentMonth = new Date().toISOString().slice(0, 7);

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups.map(g => g.id);
    return groups.filter(g => g.teacherId === user.teacherId).map(g => g.id);
  }, [isTeacher, user, groups]);

  const stats = useMemo(() => {
    const visibleStudents = isTeacher
      ? students.filter(s => myGroupIds.includes(s.groupId))
      : students;
    const activeStudents = visibleStudents.filter(s => s.status === "active").length;
    const monthPayments = payments.filter(p => p.month === currentMonth);
    const paidAmount = monthPayments
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const overdueCount = payments.filter(p =>
      p.status === "overdue" || (p.status === "pending" && p.month < currentMonth)
    ).length;
    const pendingRequests = discountRequests.filter(r => r.status === "pending").length;
    return { activeStudents, paidAmount, overdueCount, courseCount: courses.length, pendingRequests };
  }, [students, payments, courses, currentMonth, myGroupIds, isTeacher, discountRequests]);

  const recentPayments = useMemo(() => {
    const statusOrder: Record<string, number> = { overdue: 0, partial: 1, pending: 2, paid: 3 };
    return payments
      .filter(p => p.status !== "paid")
      .sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2))
      .slice(0, 5);
  }, [payments]);

  const handleAddTransaction = (paymentId: string) => {
    const p = payments.find(pay => pay.id === paymentId);
    if (!p) return;
    const remaining = p.amount - (p.paidTotal ?? 0);
    addTransaction(paymentId, {
      amount: remaining,
      method: "cash",
      paidAt: new Date().toISOString().split("T")[0],
    });
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: isWeb ? 34 + 80 : 80 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Xush kelibsiz,
          </Text>
          <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {user?.name ?? "Admin"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Pending discount requests badge (admin only) */}
      {!isTeacher && stats.pendingRequests > 0 && (
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

      {/* Monthly Revenue Banner */}
      {!isTeacher && (
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
          label="Kurslar"
          value={stats.courseCount}
          color={colors.secondary}
          icon={<Ionicons name="book" size={22} color={colors.secondary} />}
          onPress={() => router.push("/(tabs)/courses")}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          label="Guruhlar"
          value={isTeacher ? myGroupIds.length : groups.length}
          color="#10B981"
          icon={<Ionicons name="grid" size={22} color="#10B981" />}
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
        {!isTeacher && (
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/(tabs)/payments")}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.quickBtnText, { fontFamily: "Inter_600SemiBold" }]}>To'lov kiritish</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Payments */}
      {recentPayments.length > 0 && !isTeacher && (
        <View>
          <SectionHeader
            title="Kutilayotgan to'lovlar"
            actionLabel="Barchasi"
            onAction={() => router.push("/(tabs)/payments")}
          />
          {recentPayments.map(p => (
            <PaymentCard
              key={p.id}
              payment={p}
              student={students.find(s => s.id === p.studentId)}
              onAddTransaction={() => handleAddTransaction(p.id)}
              onMarkPaid={() => handleAddTransaction(p.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
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
});
