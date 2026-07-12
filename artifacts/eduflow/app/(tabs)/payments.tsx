import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  FlatList, Image, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Group, type Payment } from "@/context/AppContext";
import { confirmAction, showAlert } from "@/lib/confirm";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

type Tab = "payments" | "report";

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={pb.bg}>
      <View style={[pb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  bg: { height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, students, courses, groups, payments, addPayment, deletePayment, addTransaction } = useApp();

  const isAdmin = (user?.role ?? "admin") === "admin";
  const isTeacher = user?.role === "teacher";
  const canManagePayments = isAdmin || isTeacher;

  const [tab, setTab] = useState<Tab>("payments");
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups.map(g => g.id);
    return groups.filter(g => g.teacherId === user.teacherId).map(g => g.id);
  }, [isTeacher, user, groups]);

  const myStudentIds = useMemo(() => {
    if (!isTeacher) return students.map(s => s.id);
    return students.filter(s => myGroupIds.includes(s.groupId)).map(s => s.id);
  }, [isTeacher, students, myGroupIds]);

  const visibleGroups = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups;
    return groups.filter(g => g.teacherId === user.teacherId);
  }, [isTeacher, user, groups]);

  const visibleStudents = useMemo(() => {
    return students.filter(s => myStudentIds.includes(s.id));
  }, [students, myStudentIds]);

  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue" | "partial">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [modalGroupId, setModalGroupId] = useState<string>("all");
  const [form, setForm] = useState({
    studentId: "", amount: "", month: new Date().toISOString().slice(0, 7),
    status: "pending" as Payment["status"], note: "", method: "cash" as "cash" | "card",
  });
  const [txForm, setTxForm] = useState({
    amount: "", method: "cash" as "cash" | "card", note: "", receiptUri: "",
  });

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthStats = useMemo(() => {
    const mp = payments.filter(p => p.month === currentMonth && myStudentIds.includes(p.studentId));
    const paid = mp.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const pending = mp.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const overdue = mp.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
    const partial = mp.filter(p => p.status === "partial").reduce((s, p) => s + (p.paidTotal ?? 0), 0);
    return { paid: paid + partial, pending, overdue, total: paid + partial + pending + overdue };
  }, [payments, currentMonth, myStudentIds]);

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const student = students.find(s => s.id === p.studentId);
      const inMyStudents = myStudentIds.includes(p.studentId);
      const matchStatus = filter === "all" || p.status === filter;
      const matchGroup = groupFilter === "all" || student?.groupId === groupFilter;
      const matchSearch = !search || student?.name.toLowerCase().includes(search.toLowerCase()) || student?.phone.includes(search);
      return inMyStudents && matchStatus && matchGroup && matchSearch;
    }).sort((a, b) => {
      const order = { overdue: 0, partial: 1, pending: 2, paid: 3 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
  }, [payments, students, filter, groupFilter, search, myStudentIds]);

  // ---------- REPORT DATA ----------
  const reportData = useMemo(() => {
    return visibleGroups.map(g => {
      const grpStudents = students.filter(s => s.groupId === g.id && s.status === "active");
      const course = courses.find(c => c.id === g.courseId);
      const expectedPerStudent = course?.price ?? 0;
      const expected = expectedPerStudent * grpStudents.length;

      const grpPayments = payments.filter(p => {
        const s = students.find(st => st.id === p.studentId);
        return s?.groupId === g.id && p.month === reportMonth;
      });

      const collected = grpPayments.reduce((sum, p) => sum + (p.paidTotal ?? (p.status === "paid" ? p.amount : 0)), 0);
      const paidCount = grpPayments.filter(p => p.status === "paid").length;
      const partialCount = grpPayments.filter(p => p.status === "partial").length;
      const overdueCount = grpPayments.filter(p => p.status === "overdue").length;
      const notPaidCount = grpStudents.length - paidCount - partialCount - overdueCount;

      const studentRows = grpStudents.map(s => {
        const pay = grpPayments.find(p => p.studentId === s.id);
        return { student: s, payment: pay ?? null, expected: expectedPerStudent };
      });

      return { group: g, course, grpStudents, expected, collected, paidCount, partialCount, overdueCount, notPaidCount, studentRows };
    });
  }, [visibleGroups, students, courses, payments, reportMonth]);

  const totalReport = useMemo(() => {
    return reportData.reduce((acc, r) => ({
      expected: acc.expected + r.expected,
      collected: acc.collected + r.collected,
    }), { expected: 0, collected: 0 });
  }, [reportData]);

  // ---------- HANDLERS ----------
  const openAdd = () => {
    const initialGroup = groupFilter !== "all" ? groupFilter : "all";
    const pool = initialGroup === "all" ? visibleStudents : visibleStudents.filter(s => s.groupId === initialGroup);
    const firstStudent = pool[0];
    const course = courses.find(c => c.id === firstStudent?.courseId);
    setModalGroupId(initialGroup);
    setForm({
      studentId: firstStudent?.id ?? "",
      amount: course?.price.toString() ?? "",
      month: currentMonth,
      status: "pending",
      note: "",
      method: "cash",
    });
    setShowModal(true);
  };

  const modalStudents = useMemo(() => {
    if (modalGroupId === "all") return visibleStudents;
    return visibleStudents.filter(s => s.groupId === modalGroupId);
  }, [visibleStudents, modalGroupId]);

  const selectModalGroup = (gid: string) => {
    setModalGroupId(gid);
    const pool = gid === "all" ? visibleStudents : visibleStudents.filter(s => s.groupId === gid);
    const first = pool[0];
    const course = courses.find(c => c.id === first?.courseId);
    setForm(p => ({ ...p, studentId: first?.id ?? "", amount: course?.price.toString() ?? p.amount }));
  };

  const handleDeletePayment = (payment: Payment) => {
    const student = students.find(s => s.id === payment.studentId);
    confirmAction(
      "To'lovni bekor qilish",
      `${student?.name ?? "O'quvchi"} uchun ${payment.month} oyidagi ${payment.amount.toLocaleString()} so'mlik to'lov o'chiriladi. Davom etasizmi?`,
      async () => {
        try {
          await deletePayment(payment.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
          showAlert("Xato", e?.message ?? "To'lovni o'chirib bo'lmadi");
        }
      },
      "Bekor qilish (o'chirish)",
    );
  };

  const handleSave = () => {
    if (!form.studentId || !form.amount) return;
    const exists = payments.find(p => p.studentId === form.studentId && p.month === form.month);
    if (exists) {
      showAlert("Takroriy to'lov", `Bu o'quvchi uchun ${form.month} oyida to'lov allaqachon mavjud.`);
      return;
    }
    addPayment({
      studentId: form.studentId,
      amount: Number(form.amount),
      month: form.month,
      status: form.status,
      note: form.note || undefined,
      method: form.method,
      paidTotal: form.status === "paid" ? Number(form.amount) : 0,
      transactions: form.status === "paid" ? [{
        id: Date.now().toString(),
        amount: Number(form.amount),
        method: form.method,
        paidAt: new Date().toISOString().split("T")[0],
      }] : [],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  };

  const openTxModal = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    setSelectedPaymentId(paymentId);
    const remaining = payment.amount - (payment.paidTotal ?? 0);
    setTxForm({ amount: remaining.toString(), method: "cash", note: "", receiptUri: "" });
    setShowTxModal(true);
  };

  const saveTx = () => {
    if (!txForm.amount || !selectedPaymentId) return;
    addTransaction(selectedPaymentId, {
      amount: Number(txForm.amount),
      method: txForm.method,
      receiptUri: txForm.receiptUri || undefined,
      paidAt: new Date().toISOString().split("T")[0],
      note: txForm.note || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowTxModal(false);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!result.canceled && result.assets[0]) setTxForm(p => ({ ...p, receiptUri: result.assets[0].uri }));
  };
  const pickReceipt = async () => {
    if (Platform.OS === "web") return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setTxForm(p => ({ ...p, receiptUri: result.assets[0].uri }));
  };

  const topPadding = isWeb ? 67 : insets.top;

  const FILTERS: { key: typeof filter; label: string; color: string }[] = [
    { key: "all", label: "Barchasi", color: colors.primary },
    { key: "paid", label: "To'langan", color: "#10B981" },
    { key: "partial", label: "Qisman", color: "#0EA5E9" },
    { key: "pending", label: "Kutilmoqda", color: "#F59E0B" },
    { key: "overdue", label: "Kechikkan", color: "#EF4444" },
  ];

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);

  // Helpers for month navigation
  const changeMonth = (delta: number) => {
    const [y, m] = reportMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setReportMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    return `${months[m - 1]} ${y}`;
  };

  const statusCfg = {
    paid: { color: "#10B981", label: "To'langan", icon: "checkmark-circle" as const },
    partial: { color: "#0EA5E9", label: "Qisman", icon: "timer-outline" as const },
    pending: { color: "#F59E0B", label: "Kutilmoqda", icon: "time" as const },
    overdue: { color: "#EF4444", label: "Kechikkan", icon: "warning" as const },
    none: { color: colors.mutedForeground, label: "To'lov yo'q", icon: "ellipse-outline" as const },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>To'lovlar</Text>
        {canManagePayments && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher (teacher sees both tabs) */}
      {isTeacher && (
        <View style={[styles.tabRow, { backgroundColor: colors.muted, marginHorizontal: 16, marginTop: 8 }]}>
          {([
            { key: "payments" as Tab, label: "To'lovlar", icon: "card-outline" as const },
            { key: "report" as Tab, label: "Hisobot", icon: "bar-chart-outline" as const },
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, { backgroundColor: tab === t.key ? colors.card : "transparent" }]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon} size={15} color={tab === t.key ? colors.secondary : colors.mutedForeground} />
              <Text style={[styles.tabText, {
                color: tab === t.key ? colors.foreground : colors.mutedForeground,
                fontFamily: tab === t.key ? "Inter_600SemiBold" : "Inter_400Regular",
              }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ========== PAYMENTS TAB ========== */}
      {tab === "payments" && (
        <>
          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="O'quvchi ismi yoki telefon..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: "#10B98112", borderColor: "#10B98130" }]}>
              <Text style={[styles.summaryAmount, { color: "#10B981", fontFamily: "Inter_700Bold" }]}>
                {(monthStats.paid / 1000000).toFixed(1)}M
              </Text>
              <Text style={[styles.summaryLabel, { color: "#10B981", fontFamily: "Inter_400Regular" }]}>To'langan</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B30" }]}>
              <Text style={[styles.summaryAmount, { color: "#F59E0B", fontFamily: "Inter_700Bold" }]}>
                {(monthStats.pending / 1000000).toFixed(1)}M
              </Text>
              <Text style={[styles.summaryLabel, { color: "#F59E0B", fontFamily: "Inter_400Regular" }]}>Kutilmoqda</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#EF444412", borderColor: "#EF444430" }]}>
              <Text style={[styles.summaryAmount, { color: "#EF4444", fontFamily: "Inter_700Bold" }]}>
                {(monthStats.overdue / 1000000).toFixed(1)}M
              </Text>
              <Text style={[styles.summaryLabel, { color: "#EF4444", fontFamily: "Inter_400Regular" }]}>Kechikkan</Text>
            </View>
          </View>

          {/* Teacher info notice */}
          {isTeacher && (
            <View style={[styles.teacherNotice, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30" }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
              <Text style={[styles.teacherNoticeText, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
                Siz faqat o'z guruhlari o'quvchilarining to'lovlarini boshqara olasiz.
              </Text>
            </View>
          )}

          {/* Status filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, { backgroundColor: filter === f.key ? f.color : colors.muted }]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, { color: filter === f.key ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Group filter chips */}
          {visibleGroups.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.groupChip, { backgroundColor: groupFilter === "all" ? colors.secondary : colors.muted }]}
                onPress={() => setGroupFilter("all")}
              >
                <Text style={[styles.chipText, { color: groupFilter === "all" ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  Barcha guruhlar
                </Text>
              </TouchableOpacity>
              {visibleGroups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupChip, { backgroundColor: groupFilter === g.id ? colors.secondary : colors.muted }]}
                  onPress={() => setGroupFilter(g.id)}
                >
                  <Text style={[styles.chipText, { color: groupFilter === g.id ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PaymentCard
                payment={item}
                student={students.find(s => s.id === item.studentId)}
                onMarkPaid={canManagePayments ? () => openTxModal(item.id) : undefined}
                onAddTransaction={canManagePayments ? () => openTxModal(item.id) : undefined}
                onDelete={canManagePayments && (item.status === "pending" || item.status === "overdue") ? () => handleDeletePayment(item) : undefined}
              />
            )}
            contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
            ListEmptyComponent={
              <EmptyState
                icon="card-outline"
                title="To'lovlar yo'q"
                description={isTeacher ? "Bu guruhda hali to'lov kiritilmagan" : "Hali hech qanday to'lov kiritilmagan"}
                actionLabel={canManagePayments ? "To'lov qo'shish" : undefined}
                onAction={canManagePayments ? openAdd : undefined}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* ========== REPORT TAB ========== */}
      {tab === "report" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.reportScroll, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
        >
          {/* Month navigator */}
          <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: colors.muted }]} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.monthNavLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {monthLabel(reportMonth)}
            </Text>
            <TouchableOpacity style={[styles.monthNavBtn, { backgroundColor: colors.muted }]} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Overall summary card */}
          <View style={[styles.overallCard, { backgroundColor: colors.primary }]}>
            <View style={styles.overallRow}>
              <View>
                <Text style={[styles.overallLabel, { fontFamily: "Inter_400Regular" }]}>Yig'ilgan</Text>
                <Text style={[styles.overallValue, { fontFamily: "Inter_700Bold" }]}>
                  {totalReport.collected.toLocaleString()} so'm
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.overallLabel, { fontFamily: "Inter_400Regular" }]}>Kutilayotgan</Text>
                <Text style={[styles.overallValue, { fontFamily: "Inter_700Bold" }]}>
                  {totalReport.expected.toLocaleString()} so'm
                </Text>
              </View>
            </View>
            {totalReport.expected > 0 && (
              <>
                <View style={styles.overallPbBg}>
                  <View style={[styles.overallPbFill, {
                    width: `${Math.min(totalReport.collected / totalReport.expected * 100, 100)}%` as any,
                  }]} />
                </View>
                <Text style={[styles.overallPct, { fontFamily: "Inter_500Medium" }]}>
                  {Math.round(totalReport.collected / totalReport.expected * 100)}% yig'ildi
                </Text>
              </>
            )}
          </View>

          {/* Per-group report cards */}
          {reportData.length === 0 ? (
            <View style={[styles.emptyReport, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyReportText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Guruhlar yo'q
              </Text>
            </View>
          ) : (
            reportData.map(r => {
              const courseColor = r.course?.color ?? colors.primary;
              return (
                <View key={r.group.id} style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Group header */}
                  <View style={[styles.reportCardHeader, { backgroundColor: courseColor + "10", borderBottomColor: colors.border }]}>
                    <View style={[styles.reportGroupDot, { backgroundColor: courseColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reportGroupName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {r.group.name}
                      </Text>
                      <Text style={[styles.reportGroupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {r.course?.name ?? "—"} · {r.group.schedule}
                      </Text>
                    </View>
                    <View style={[styles.reportGroupBadge, { backgroundColor: courseColor + "20" }]}>
                      <Text style={[styles.reportGroupBadgeText, { color: courseColor, fontFamily: "Inter_700Bold" }]}>
                        {r.grpStudents.length} ta
                      </Text>
                    </View>
                  </View>

                  {/* Group stats */}
                  <View style={styles.reportStatsRow}>
                    {[
                      { count: r.paidCount, label: "To'langan", color: "#10B981" },
                      { count: r.partialCount, label: "Qisman", color: "#0EA5E9" },
                      { count: r.overdueCount, label: "Kechikkan", color: "#EF4444" },
                      { count: r.notPaidCount, label: "To'lov yo'q", color: colors.mutedForeground },
                    ].map(s => (
                      <View key={s.label} style={styles.reportStatItem}>
                        <Text style={[styles.reportStatNum, { color: s.color, fontFamily: "Inter_700Bold" }]}>{s.count}</Text>
                        <Text style={[styles.reportStatLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Collection progress */}
                  <View style={[styles.collectionRow, { borderTopColor: colors.border }]}>
                    <View style={styles.collectionText}>
                      <Text style={[styles.collectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        Yig'ildi:
                      </Text>
                      <Text style={[styles.collectionValue, { color: courseColor, fontFamily: "Inter_700Bold" }]}>
                        {r.collected.toLocaleString()} so'm
                      </Text>
                    </View>
                    <Text style={[styles.collectionOf, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      / {r.expected.toLocaleString()} so'm
                    </Text>
                  </View>
                  <View style={[styles.collectionPbWrap, { paddingHorizontal: 14, paddingBottom: 10 }]}>
                    <ProgressBar value={r.collected} total={r.expected} color={courseColor} />
                  </View>

                  {/* Student rows */}
                  {r.studentRows.map((row, i) => {
                    const s = row.student;
                    const pay = row.payment;
                    const statusKey = pay ? pay.status : "none";
                    const cfg = statusCfg[statusKey as keyof typeof statusCfg] ?? statusCfg.none;
                    const initials = s.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                    const paidAmt = pay ? (pay.paidTotal ?? (pay.status === "paid" ? pay.amount : 0)) : 0;

                    return (
                      <View
                        key={s.id}
                        style={[styles.studentReportRow, {
                          borderTopWidth: 0.5, borderTopColor: colors.border,
                          backgroundColor: i % 2 === 0 ? "transparent" : colors.muted + "60",
                        }]}
                      >
                        {/* Avatar */}
                        <View style={[styles.studentReportAvatar, { backgroundColor: courseColor + "20" }]}>
                          <Text style={[styles.studentReportInitials, { color: courseColor, fontFamily: "Inter_700Bold" }]}>
                            {initials}
                          </Text>
                        </View>

                        {/* Name + status */}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.studentReportName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                            {s.name}
                          </Text>
                          <View style={styles.studentReportBadgeRow}>
                            <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                            <Text style={[styles.studentReportBadgeText, { color: cfg.color, fontFamily: "Inter_400Regular" }]}>
                              {cfg.label}
                            </Text>
                          </View>
                        </View>

                        {/* Amount */}
                        <View style={{ alignItems: "flex-end" }}>
                          {pay ? (
                            <>
                              <Text style={[styles.studentReportAmt, { color: cfg.color, fontFamily: "Inter_700Bold" }]}>
                                {paidAmt.toLocaleString()}
                              </Text>
                              {pay.status === "partial" && (
                                <Text style={[styles.studentReportSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                                  / {pay.amount.toLocaleString()} so'm
                                </Text>
                              )}
                              {pay.status === "paid" && (
                                <Text style={[styles.studentReportSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                                  so'm
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={[styles.studentReportAmt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                              —
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* New Payment Modal */}
      {canManagePayments && (
        <ModalSheet visible={showModal} onClose={() => setShowModal(false)} title="Yangi to'lov">
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Guruh</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalGroupRow}>
            <TouchableOpacity
              style={[styles.groupChip, { backgroundColor: modalGroupId === "all" ? colors.secondary : colors.muted }]}
              onPress={() => selectModalGroup("all")}
            >
              <Text style={[styles.chipText, { color: modalGroupId === "all" ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Barchasi
              </Text>
            </TouchableOpacity>
            {visibleGroups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.groupChip, { backgroundColor: modalGroupId === g.id ? colors.secondary : colors.muted }]}
                onPress={() => selectModalGroup(g.id)}
              >
                <Text style={[styles.chipText, { color: modalGroupId === g.id ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>O'quvchi</Text>
          {modalStudents.length === 0 && (
            <Text style={[styles.emptyModalText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Bu guruhda o'quvchi yo'q
            </Text>
          )}
          <View style={styles.selectorColumn}>
            {modalStudents.map(s => {
              const course = courses.find(c => c.id === s.courseId);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.studentRow, {
                    backgroundColor: form.studentId === s.id ? colors.primary + "18" : colors.muted,
                    borderColor: form.studentId === s.id ? colors.primary : "transparent",
                    borderWidth: 1,
                  }]}
                  onPress={() => setForm(p => ({ ...p, studentId: s.id, amount: course?.price.toString() ?? p.amount }))}
                >
                  <View style={[styles.studentAvatar, { backgroundColor: course?.color ?? colors.primary }]}>
                    <Text style={[styles.studentInitials, { fontFamily: "Inter_600SemiBold" }]}>
                      {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{s.name}</Text>
                    <Text style={[styles.studentSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{course?.name}</Text>
                  </View>
                  {form.studentId === s.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <FormField label="Miqdor (so'm) *" value={form.amount} onChangeText={v => setForm(p => ({ ...p, amount: v }))} placeholder="350000" keyboardType="numeric" suffix="so'm" />
          <FormField label="Oy (YYYY-MM)" value={form.month} onChangeText={v => setForm(p => ({ ...p, month: v }))} placeholder="2026-07" />
          <FormField label="Izoh" value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} placeholder="Ixtiyoriy izoh" />
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>To'lov usuli</Text>
          <View style={styles.methodPickerRow}>
            {(["cash", "card"] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.methodChip, { backgroundColor: form.method === m ? (m === "cash" ? "#10B981" : colors.primary) : colors.muted, flex: 1 }]}
                onPress={() => setForm(p => ({ ...p, method: m }))}
              >
                <Ionicons name={m === "cash" ? "cash-outline" : "card-outline"} size={18} color={form.method === m ? "#FFFFFF" : colors.mutedForeground} />
                <Text style={[styles.methodChipText, { color: form.method === m ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {m === "cash" ? "Naqd" : "Plastik"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Holat</Text>
          <View style={styles.statusRow}>
            {(["paid", "pending", "overdue"] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusChip, { backgroundColor: form.status === s ? (s === "paid" ? "#10B981" : s === "pending" ? "#F59E0B" : "#EF4444") : colors.muted }]}
                onPress={() => setForm(p => ({ ...p, status: s }))}
              >
                <Text style={[styles.statusText, { color: form.status === s ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {s === "paid" ? "To'langan" : s === "pending" ? "Kutilmoqda" : "Kechikkan"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: (!form.studentId || !form.amount) ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={!form.studentId || !form.amount}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saqlash</Text>
          </TouchableOpacity>
        </ModalSheet>
      )}

      {/* Transaction Modal */}
      <ModalSheet visible={showTxModal} onClose={() => setShowTxModal(false)} title="To'lov qo'shish">
        {selectedPayment && (
          <View style={[styles.txInfoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.txInfoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Jami: {selectedPayment.amount.toLocaleString()} so'm
            </Text>
            <Text style={[styles.txInfoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              To'langan: {(selectedPayment.paidTotal ?? 0).toLocaleString()} so'm
            </Text>
            <Text style={[styles.txInfoValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              Qoldi: {(selectedPayment.amount - (selectedPayment.paidTotal ?? 0)).toLocaleString()} so'm
            </Text>
          </View>
        )}
        <FormField label="To'lov miqdori (so'm) *" value={txForm.amount} onChangeText={v => setTxForm(p => ({ ...p, amount: v }))} placeholder="350000" keyboardType="numeric" suffix="so'm" />
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>To'lov usuli</Text>
        <View style={styles.methodPickerRow}>
          {(["cash", "card"] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodChip, { backgroundColor: txForm.method === m ? (m === "cash" ? "#10B981" : colors.primary) : colors.muted, flex: 1 }]}
              onPress={() => setTxForm(p => ({ ...p, method: m }))}
            >
              <Ionicons name={m === "cash" ? "cash-outline" : "card-outline"} size={18} color={txForm.method === m ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.methodChipText, { color: txForm.method === m ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {m === "cash" ? "Naqd" : "Plastik"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {txForm.method === "card" && !isWeb && (
          <View style={styles.receiptBtnRow}>
            <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickReceipt}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={[styles.receiptBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={18} color={colors.secondary} />
              <Text style={[styles.receiptBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Galereya</Text>
            </TouchableOpacity>
          </View>
        )}
        {txForm.receiptUri ? (
          <View style={styles.receiptPreview}>
            <Image source={{ uri: txForm.receiptUri }} style={styles.receiptImage} />
          </View>
        ) : null}
        <FormField label="Izoh" value={txForm.note} onChangeText={v => setTxForm(p => ({ ...p, note: v }))} placeholder="Ixtiyoriy izoh" />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: !txForm.amount ? 0.5 : 1 }]}
          onPress={saveTx}
          disabled={!txForm.amount}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saqlash</Text>
        </TouchableOpacity>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 4 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabText: { fontSize: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 10, marginBottom: 4, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: "center", borderWidth: 1 },
  summaryAmount: { fontSize: 18 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  teacherNotice: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  teacherNoticeText: { fontSize: 12, flex: 1 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  groupChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 12 },
  modalGroupRow: { flexDirection: "row", gap: 8, paddingBottom: 12 },
  emptyModalText: { fontSize: 13, fontStyle: "italic", marginBottom: 12 },
  list: { paddingTop: 4 },
  // Report tab
  reportScroll: { paddingTop: 12, paddingHorizontal: 16, gap: 14 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 10, borderWidth: 1 },
  monthNavBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  monthNavLabel: { fontSize: 17 },
  overallCard: { borderRadius: 18, padding: 18 },
  overallRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  overallLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 4 },
  overallValue: { color: "#FFFFFF", fontSize: 20 },
  overallPbBg: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden", marginBottom: 8 },
  overallPbFill: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.85)" },
  overallPct: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "right" },
  emptyReport: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyReportText: { fontSize: 15 },
  reportCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  reportCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 0.5 },
  reportGroupDot: { width: 12, height: 12, borderRadius: 6 },
  reportGroupName: { fontSize: 15 },
  reportGroupSub: { fontSize: 12, marginTop: 1 },
  reportGroupBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  reportGroupBadgeText: { fontSize: 13 },
  reportStatsRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14 },
  reportStatItem: { flex: 1, alignItems: "center", gap: 3 },
  reportStatNum: { fontSize: 20 },
  reportStatLabel: { fontSize: 11 },
  collectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, borderTopWidth: 0.5 },
  collectionText: { flexDirection: "row", alignItems: "center", gap: 6 },
  collectionLabel: { fontSize: 13 },
  collectionValue: { fontSize: 15 },
  collectionOf: { fontSize: 12 },
  collectionPbWrap: {},
  studentReportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  studentReportAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  studentReportInitials: { fontSize: 12 },
  studentReportName: { fontSize: 13, marginBottom: 2 },
  studentReportBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentReportBadgeText: { fontSize: 11 },
  studentReportAmt: { fontSize: 14 },
  studentReportSub: { fontSize: 11 },
  // Modal styles
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  selectorColumn: { gap: 8, marginBottom: 16 },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12 },
  studentAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  studentInitials: { color: "#FFFFFF", fontSize: 13 },
  studentName: { fontSize: 14 },
  studentSub: { fontSize: 12 },
  methodPickerRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  methodChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  methodChipText: { fontSize: 14 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statusChip: { flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  statusText: { fontSize: 13 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  txInfoBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, marginBottom: 16 },
  txInfoLabel: { fontSize: 13 },
  txInfoValue: { fontSize: 16, marginTop: 4 },
  receiptBtnRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  receiptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
  receiptBtnText: { fontSize: 13 },
  receiptPreview: { marginBottom: 12 },
  receiptImage: { width: "100%", height: 160, borderRadius: 12 },
});
