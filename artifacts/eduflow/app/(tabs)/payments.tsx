import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Alert, FlatList, Image, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
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
  const { user, students, courses, groups, payments, addPayment, addTransaction } = useApp();

  const isAdmin = (user?.role ?? "admin") === "admin";
  const isTeacher = user?.role === "teacher";

  const myGroupIds = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups.map(g => g.id);
    return groups.filter(g => g.teacherId === user.teacherId).map(g => g.id);
  }, [isTeacher, user, groups]);

  const myStudentIds = useMemo(() => {
    if (!isTeacher) return students.map(s => s.id);
    return students.filter(s => myGroupIds.includes(s.groupId)).map(s => s.id);
  }, [isTeacher, students, myGroupIds]);

  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue" | "partial">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [form, setForm] = useState({
    studentId: "", amount: "", month: new Date().toISOString().slice(0, 7),
    status: "pending" as Payment["status"], note: "", method: "cash" as "cash" | "card",
  });
  const [txForm, setTxForm] = useState({
    amount: "", method: "cash" as "cash" | "card", note: "", receiptUri: "",
  });

  const currentMonth = new Date().toISOString().slice(0, 7);

  const visibleGroups = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups;
    return groups.filter(g => g.teacherId === user.teacherId);
  }, [isTeacher, user, groups]);

  const monthStats = useMemo(() => {
    const mp = payments.filter(p => p.month === currentMonth && myStudentIds.includes(p.studentId));
    const paid = mp.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const pending = mp.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const overdue = mp.filter(p => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
    return { paid, pending, overdue };
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

  const visibleStudents = useMemo(() => {
    return students.filter(s => myStudentIds.includes(s.id));
  }, [students, myStudentIds]);

  const openAdd = () => {
    const firstStudent = visibleStudents[0];
    const course = courses.find(c => c.id === firstStudent?.courseId);
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

  const handleSave = () => {
    if (!form.studentId || !form.amount) return;
    const exists = payments.find(p => p.studentId === form.studentId && p.month === form.month);
    if (exists) {
      Alert.alert("Takroriy to'lov", `Bu o'quvchi uchun ${form.month} oyida to'lov allaqachon mavjud.`);
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

  const pickReceipt = async () => {
    if (Platform.OS === "web") return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setTxForm(p => ({ ...p, receiptUri: result.assets[0].uri }));
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setTxForm(p => ({ ...p, receiptUri: result.assets[0].uri }));
    }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>To'lovlar</Text>
        {isAdmin && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

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

      {/* Summary */}
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

      {/* Teacher read-only notice */}
      {isTeacher && (
        <View style={[styles.teacherNotice, { backgroundColor: colors.secondary + "12", borderColor: colors.secondary + "25" }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
          <Text style={[styles.teacherNoticeText, { color: colors.secondary, fontFamily: "Inter_400Regular" }]}>
            Siz faqat o'z o'quvchilaringiz to'lovlarini ko'ra olasiz. To'lov qo'shish — admin huquqi.
          </Text>
        </View>
      )}

      {/* Status filters */}
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

      {/* Group filter */}
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
            onMarkPaid={isAdmin ? () => openTxModal(item.id) : undefined}
            onAddTransaction={isAdmin ? () => openTxModal(item.id) : undefined}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="To'lovlar yo'q"
            description={isTeacher ? "Bu guruhda hali to'lov kiritilmagan" : "Hali hech qanday to'lov kiritilmagan"}
            actionLabel={isAdmin ? "To'lov qo'shish" : undefined}
            onAction={isAdmin ? openAdd : undefined}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* New Payment Modal (admin only) */}
      {isAdmin && (
        <ModalSheet visible={showModal} onClose={() => setShowModal(false)} title="Yangi to'lov">
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>O'quvchi</Text>
          <View style={styles.selectorColumn}>
            {visibleStudents.map(s => {
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
            {visibleStudents.length === 0 && (
              <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" }]}>
                O'quvchilar yo'q
              </Text>
            )}
          </View>

          <FormField label="Miqdor (so'm) *" value={form.amount} onChangeText={v => setForm(p => ({ ...p, amount: v }))} placeholder="350000" keyboardType="numeric" suffix="so'm" />
          <FormField label="Oy (YYYY-MM)" value={form.month} onChangeText={v => setForm(p => ({ ...p, month: v }))} placeholder="2026-07" />
          <FormField label="Izoh" value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} placeholder="Ixtiyoriy izoh" />

          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>To'lov usuli</Text>
          <View style={styles.methodPickerRow}>
            {(["cash", "card"] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.methodChip, {
                  backgroundColor: form.method === m ? (m === "cash" ? "#10B981" : colors.primary) : colors.muted,
                  flex: 1,
                }]}
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
                style={[styles.statusChip, {
                  backgroundColor: form.status === s
                    ? (s === "paid" ? "#10B981" : s === "pending" ? "#F59E0B" : "#EF4444")
                    : colors.muted
                }]}
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

        {txForm.method === "card" && !isWeb && (
          <View style={styles.receiptSection}>
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Chek rasmi</Text>
            {txForm.receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: txForm.receiptUri }} style={styles.receiptImage} />
                <TouchableOpacity
                  style={[styles.receiptChangeBtn, { backgroundColor: colors.muted }]}
                  onPress={pickReceipt}
                >
                  <Text style={[styles.receiptChangeTxt, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    Almashtirish
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.receiptBtnRow}>
                <TouchableOpacity
                  style={[styles.receiptBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={pickReceipt}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={[styles.receiptBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.receiptBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={pickFromGallery}
                >
                  <Ionicons name="images-outline" size={20} color={colors.secondary} />
                  <Text style={[styles.receiptBtnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Galereya</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: "center", borderWidth: 1 },
  summaryAmount: { fontSize: 18 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  teacherNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  teacherNoticeText: { fontSize: 12, flex: 1, lineHeight: 18 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  groupChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 12 },
  list: { paddingTop: 4 },
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
  receiptSection: { marginBottom: 4 },
  receiptBtnRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  receiptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  receiptBtnText: { fontSize: 14 },
  receiptPreview: { alignItems: "center", gap: 10, marginBottom: 16 },
  receiptImage: { width: "100%", height: 180, borderRadius: 12 },
  receiptChangeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  receiptChangeTxt: { fontSize: 13 },
});
