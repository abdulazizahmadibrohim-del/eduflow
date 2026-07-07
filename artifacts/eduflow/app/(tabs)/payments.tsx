import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Payment } from "@/context/AppContext";
import { PaymentCard } from "@/components/ui/PaymentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { students, courses, payments, addPayment, updatePayment } = useApp();

  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    studentId: "", amount: "", month: new Date().toISOString().slice(0, 7), status: "pending" as Payment["status"], note: ""
  });

  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthStats = useMemo(() => {
    const mp = payments.filter(p => p.month === currentMonth);
    const paid = mp.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const pending = mp.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const overdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
    return { paid, pending, overdue };
  }, [payments, currentMonth]);

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter(p => p.status === filter);
  }, [payments, filter]);

  const openAdd = () => {
    setForm({ studentId: students[0]?.id ?? "", amount: "", month: currentMonth, status: "pending", note: "" });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.studentId || !form.amount) return;
    addPayment({ studentId: form.studentId, amount: Number(form.amount), month: form.month, status: form.status, note: form.note });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  };

  const handleMarkPaid = (paymentId: string) => {
    updatePayment(paymentId, { status: "paid", paidAt: new Date().toISOString().split("T")[0] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const topPadding = isWeb ? 67 : insets.top;

  const FILTERS: { key: typeof filter; label: string; color: string }[] = [
    { key: "all", label: "Barchasi", color: colors.primary },
    { key: "paid", label: "To'langan", color: "#10B981" },
    { key: "pending", label: "Kutilmoqda", color: "#F59E0B" },
    { key: "overdue", label: "Kechikkan", color: "#EF4444" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>To'lovlar</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
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

      {/* Filter chips */}
      <View style={styles.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, { backgroundColor: filter === f.key ? f.color : colors.muted }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, {
              color: filter === f.key ? "#FFFFFF" : colors.mutedForeground,
              fontFamily: "Inter_500Medium"
            }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            student={students.find(s => s.id === item.studentId)}
            onMarkPaid={() => handleMarkPaid(item.id)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
        ListEmptyComponent={
          <EmptyState icon="card-outline" title="To'lovlar yo'q" description="Hali hech qanday to'lov kiritilmagan" actionLabel="To'lov qo'shish" onAction={openAdd} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
      />

      <ModalSheet visible={showModal} onClose={() => setShowModal(false)} title="Yangi to'lov">
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>O'quvchi</Text>
        <View style={styles.selectorColumn}>
          {students.map(s => {
            const course = courses.find(c => c.id === s.courseId);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.studentRow, {
                  backgroundColor: form.studentId === s.id ? colors.primary + "18" : colors.muted,
                  borderColor: form.studentId === s.id ? colors.primary : "transparent",
                  borderWidth: 1,
                }]}
                onPress={() => setForm(p => ({ ...p, studentId: s.id, amount: course?.price.toString() ?? "" }))}
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

        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Holat</Text>
        <View style={styles.statusRow}>
          {(["paid", "pending", "overdue"] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, {
                backgroundColor: form.status === s
                  ? (s === "paid" ? "#10B981" : s === "pending" ? "#F59E0B" : "#EF4444")
                  : colors.muted
              }]}
              onPress={() => setForm(p => ({ ...p, status: s }))}
            >
              <Text style={[styles.statusText, {
                color: form.status === s ? "#FFFFFF" : colors.mutedForeground,
                fontFamily: "Inter_500Medium"
              }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1 },
  summaryAmount: { fontSize: 20 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  chips: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 12 },
  list: { paddingTop: 4 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  selectorColumn: { gap: 8, marginBottom: 16 },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12 },
  studentAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  studentInitials: { color: "#FFFFFF", fontSize: 13 },
  studentName: { fontSize: 14 },
  studentSub: { fontSize: 12 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  statusText: { fontSize: 13 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
});
