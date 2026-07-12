import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Student } from "@/context/AppContext";
import { confirmAction, showAlert } from "@/lib/confirm";
import { StudentCard } from "@/components/ui/StudentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

export default function StudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const {
    user, students, courses, groups, payments,
    addStudent, addStudentsBulk, updateStudent, deleteStudent,
    addDiscountRequest,
  } = useApp();

  const isTeacher = user?.role === "teacher";
  const myGroupIds = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups.map(g => g.id);
    return groups.filter(g => g.teacherId === user.teacherId).map(g => g.id);
  }, [isTeacher, user, groups]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [discountTargetStudent, setDiscountTargetStudent] = useState<Student | null>(null);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", parentPhone: "",
    courseId: "", groupId: "", status: "active" as "active" | "inactive",
  });

  const [discountForm, setDiscountForm] = useState({
    percent: "10",
    period: "monthly" as "monthly" | "unlimited",
    month: new Date().toISOString().slice(0, 7),
    description: "",
  });

  const visibleGroups = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups;
    return groups.filter(g => g.teacherId === user.teacherId);
  }, [isTeacher, user, groups]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const inMyGroups = myGroupIds.includes(s.groupId);
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      const matchGroup = groupFilter === "all" || s.groupId === groupFilter;
      return inMyGroups && matchSearch && matchStatus && matchGroup;
    });
  }, [students, myGroupIds, search, filterStatus, groupFilter]);

  const getPaymentStatus = (studentId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const p = payments.find(p => p.studentId === studentId && p.month === currentMonth);
    return p?.status;
  };

  const openAdd = () => {
    setEditingStudent(null);
    const preselected = groupFilter !== "all" ? visibleGroups.find(g => g.id === groupFilter) : undefined;
    const firstGroup = preselected ?? visibleGroups[0];
    const firstCourse = courses.find(c => c.id === firstGroup?.courseId);
    setForm({
      name: "", phone: "", parentPhone: "",
      courseId: firstCourse?.id ?? courses[0]?.id ?? "",
      groupId: firstGroup?.id ?? "",
      status: "active",
    });
    setAddMode("single");
    setBulkText("");
    setShowModal(true);
  };

  const parsedBulk = useMemo(() => {
    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const entries: { name: string; phone: string }[] = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      entries.push({ name: lines[i], phone: lines[i + 1] });
    }
    return { entries, incomplete: lines.length % 2 === 1 };
  }, [bulkText]);

  const handleBulkSave = async () => {
    if (!form.groupId) {
      showAlert("Xato", "Guruhni tanlang");
      return;
    }
    if (parsedBulk.entries.length === 0) {
      showAlert("Xato", "Ro'yxat bo'sh. Format: ism, keyingi qatorda telefon raqam.");
      return;
    }
    setBulkSaving(true);
    try {
      const count = await addStudentsBulk(parsedBulk.entries.map(e => ({
        name: e.name, phone: e.phone,
        courseId: form.courseId, groupId: form.groupId,
        status: "active" as const,
      })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowModal(false);
      setBulkText("");
      showAlert("Muvaffaqiyatli", `${count} ta o'quvchi qo'shildi.`);
    } catch (e: any) {
      showAlert("Xato", e?.message ?? "O'quvchilar qo'shilmadi");
    } finally {
      setBulkSaving(false);
    }
  };

  const openEdit = (s: Student) => {
    if (isTeacher) return;
    setEditingStudent(s);
    setForm({ name: s.name, phone: s.phone, parentPhone: s.parentPhone ?? "", courseId: s.courseId, groupId: s.groupId, status: s.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (!form.groupId) {
      showAlert("Xato", "Guruhni tanlang");
      return;
    }
    if (editingStudent) {
      updateStudent(editingStudent.id, form);
    } else {
      addStudent(form);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    confirmAction("O'chirishni tasdiqlang", "Bu o'quvchini o'chirmoqchimisiz?", () => {
      deleteStudent(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowModal(false);
    });
  };

  const openDiscountRequest = (s: Student) => {
    setDiscountTargetStudent(s);
    setDiscountForm({
      percent: "10",
      period: "monthly",
      month: new Date().toISOString().slice(0, 7),
      description: "",
    });
    setShowDiscountModal(true);
  };

  const sendDiscountRequest = () => {
    if (!discountTargetStudent || !user?.teacherId) return;
    if (!discountForm.percent) return;
    addDiscountRequest({
      teacherId: user.teacherId,
      targetType: "student",
      targetId: discountTargetStudent.id,
      period: discountForm.period,
      month: discountForm.period === "monthly" ? discountForm.month : undefined,
      percent: Number(discountForm.percent),
      description: discountForm.description || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDiscountModal(false);
    showAlert("Yuborildi", "Chegirma so'rovnomasi adminga yuborildi. Tasdiqlangach kuchga kiradi.");
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          O'quvchilar
        </Text>
        {(isTeacher ? myGroupIds.length > 0 : true) && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          placeholder="Ism yoki telefon raqam..."
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

      {/* Status filters */}
      <View style={styles.chips}>
        {(["all", "active", "inactive"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, { backgroundColor: filterStatus === f ? colors.primary : colors.muted }]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[styles.chipText, { color: filterStatus === f ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {f === "all" ? "Barchasi" : f === "active" ? "Faol" : "Faol emas"}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {filtered.length} ta
        </Text>
      </View>

      {/* Group filter */}
      {visibleGroups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChipsRow}>
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
          <View>
            <StudentCard
              student={item}
              course={courses.find(c => c.id === item.courseId)}
              group={groups.find(g => g.id === item.groupId)}
              paymentStatus={getPaymentStatus(item.id)}
              onPress={() => isTeacher ? undefined : openEdit(item)}
              onEdit={!isTeacher ? () => openEdit(item) : undefined}
              onDelete={!isTeacher ? () => handleDelete(item.id) : undefined}
            />
            {isTeacher && user?.teacherId && (
              <TouchableOpacity
                style={[styles.discountBtn, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}
                onPress={() => openDiscountRequest(item)}
              >
                <Ionicons name="pricetag-outline" size={14} color={colors.secondary} />
                <Text style={[styles.discountBtnText, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
                  Chegirma so'rash
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="O'quvchilar yo'q"
            description={isTeacher ? "Bu guruhda hali o'quvchi yo'q" : "Hali hech qanday o'quvchi qo'shilmagan"}
            actionLabel="O'quvchi qo'shish"
            onAction={openAdd}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Student Modal */}
      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
      >
        {!editingStudent && (
          <View style={[styles.modeRow, { backgroundColor: colors.muted }]}>
            {([
              { key: "single" as const, label: "Bitta qo'shish", icon: "person-add-outline" as const },
              { key: "bulk" as const, label: "Ro'yxat bilan", icon: "list-outline" as const },
            ]).map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeBtn, { backgroundColor: addMode === m.key ? colors.card : "transparent" }]}
                onPress={() => setAddMode(m.key)}
              >
                <Ionicons name={m.icon} size={15} color={addMode === m.key ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.modeBtnText, {
                  color: addMode === m.key ? colors.foreground : colors.mutedForeground,
                  fontFamily: addMode === m.key ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {(editingStudent || addMode === "single") && (
          <>
            <FormField label="To'liq ism *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Ism familiya" autoCapitalize="words" />
            <FormField label="Telefon raqam *" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="+998 90 123 45 67" keyboardType="phone-pad" />
            <FormField label="Ota-ona telefoni" value={form.parentPhone} onChangeText={v => setForm(p => ({ ...p, parentPhone: v }))} placeholder="+998 90 000 00 00" keyboardType="phone-pad" />
          </>
        )}

        {!editingStudent && addMode === "bulk" && (
          <>
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              O'quvchilar ro'yxati *
            </Text>
            <Text style={[styles.bulkHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Har bir o'quvchi uchun: 1-qator ism, 2-qator telefon raqam.
            </Text>
            <TextInput
              style={[styles.bulkInput, {
                backgroundColor: colors.input, borderColor: colors.border,
                color: colors.foreground, fontFamily: "Inter_400Regular",
              }]}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              placeholder={"Ali Valiyev\n+998 90 123 45 67\nOlim Karimov\n+998 91 234 56 78"}
              placeholderTextColor={colors.mutedForeground}
              value={bulkText}
              onChangeText={setBulkText}
            />
            {parsedBulk.entries.length > 0 && (
              <View style={[styles.bulkPreview, { backgroundColor: "#10B98112", borderColor: "#10B98130" }]}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
                <Text style={[styles.bulkPreviewText, { color: "#10B981", fontFamily: "Inter_500Medium" }]}>
                  {parsedBulk.entries.length} ta o'quvchi aniqlandi
                </Text>
              </View>
            )}
            {parsedBulk.incomplete && (
              <View style={[styles.bulkPreview, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B30" }]}>
                <Ionicons name="warning-outline" size={15} color="#F59E0B" />
                <Text style={[styles.bulkPreviewText, { color: "#F59E0B", fontFamily: "Inter_500Medium" }]}>
                  Oxirgi qatorda telefon raqam yetishmayapti
                </Text>
              </View>
            )}
          </>
        )}

        {/* Group selector — for teacher, only own groups; for admin, all */}
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Guruh</Text>
        <View style={styles.selectorRow}>
          {visibleGroups.map(g => {
            const c = courses.find(cc => cc.id === g.courseId);
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.selectorChip, {
                  backgroundColor: form.groupId === g.id ? (c?.color ?? colors.secondary) : colors.muted,
                  borderWidth: form.groupId === g.id ? 0 : 1,
                  borderColor: colors.border,
                }]}
                onPress={() => setForm(p => ({ ...p, groupId: g.id, courseId: g.courseId }))}
              >
                <Text style={[styles.selectorText, {
                  color: form.groupId === g.id ? "#FFFFFF" : colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                }]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {visibleGroups.length === 0 && (
            <Text style={[styles.noGroupText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Guruh mavjud emas
            </Text>
          )}
        </View>

        {!isTeacher && (
          <>
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Kurs</Text>
            <View style={styles.selectorRow}>
              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.selectorChip, {
                    backgroundColor: form.courseId === c.id ? c.color : colors.muted,
                    borderWidth: form.courseId === c.id ? 0 : 1,
                    borderColor: colors.border,
                  }]}
                  onPress={() => {
                    const firstGroup = groups.find(g => g.courseId === c.id);
                    setForm(p => ({ ...p, courseId: c.id, groupId: firstGroup?.id ?? "" }));
                  }}
                >
                  <Text style={[styles.selectorText, {
                    color: form.courseId === c.id ? "#FFFFFF" : colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                  }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(editingStudent || addMode === "single") ? (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (!form.name || !form.phone || !form.groupId) ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={!form.name || !form.phone || !form.groupId}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {editingStudent ? "Saqlash" : "Qo'shish"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (parsedBulk.entries.length === 0 || !form.groupId || bulkSaving) ? 0.5 : 1 }]}
            onPress={handleBulkSave}
            disabled={parsedBulk.entries.length === 0 || !form.groupId || bulkSaving}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {bulkSaving ? "Qo'shilmoqda..." : `${parsedBulk.entries.length} ta o'quvchini qo'shish`}
            </Text>
          </TouchableOpacity>
        )}

        {editingStudent && !isTeacher && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.destructive }]}
            onPress={() => handleDelete(editingStudent.id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
              O'chirish
            </Text>
          </TouchableOpacity>
        )}
      </ModalSheet>

      {/* Discount Request Modal */}
      <ModalSheet
        visible={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="Chegirma so'rovnomasi"
      >
        {discountTargetStudent && (
          <View style={[styles.targetBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="person-circle-outline" size={20} color={colors.secondary} />
            <Text style={[styles.targetName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {discountTargetStudent.name}
            </Text>
          </View>
        )}

        <FormField
          label="Chegirma foizi (%) *"
          value={discountForm.percent}
          onChangeText={v => setDiscountForm(p => ({ ...p, percent: v }))}
          placeholder="10"
          keyboardType="numeric"
          suffix="%"
        />

        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Davr</Text>
        <View style={styles.periodRow}>
          {(["monthly", "unlimited"] as const).map(per => (
            <TouchableOpacity
              key={per}
              style={[styles.periodChip, {
                backgroundColor: discountForm.period === per ? colors.secondary : colors.muted,
                flex: 1,
              }]}
              onPress={() => setDiscountForm(p => ({ ...p, period: per }))}
            >
              <Ionicons
                name={per === "monthly" ? "calendar-outline" : "infinite-outline"}
                size={16}
                color={discountForm.period === per ? "#FFFFFF" : colors.mutedForeground}
              />
              <Text style={[styles.periodText, { color: discountForm.period === per ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {per === "monthly" ? "Bir oylik" : "Cheksiz"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {discountForm.period === "monthly" && (
          <FormField
            label="Oy (YYYY-MM)"
            value={discountForm.month}
            onChangeText={v => setDiscountForm(p => ({ ...p, month: v }))}
            placeholder="2026-07"
          />
        )}

        <FormField
          label="Sabab / Tavsif (ixtiyoriy)"
          value={discountForm.description}
          onChangeText={v => setDiscountForm(p => ({ ...p, description: v }))}
          placeholder="masalan: o'quvchi ijtimoiy ahvoli yaxshi emas"
        />

        <View style={[styles.noteBox, { backgroundColor: colors.secondary + "10", borderColor: colors.secondary + "25" }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
          <Text style={[styles.noteText, { color: colors.secondary, fontFamily: "Inter_400Regular" }]}>
            So'rovnoma adminga yuboriladi. Admin tasdiqlashi yoki miqdorni o'zgartirishi mumkin.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.secondary, opacity: !discountForm.percent ? 0.5 : 1 }]}
          onPress={sendDiscountRequest}
          disabled={!discountForm.percent}
          activeOpacity={0.85}
        >
          <Ionicons name="send-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Yuborish</Text>
        </TouchableOpacity>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  chips: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  count: { marginLeft: "auto", fontSize: 13 },
  groupChipsRow: { paddingHorizontal: 20, gap: 8, flexDirection: "row", marginBottom: 8 },
  groupChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  list: { paddingTop: 4 },
  discountBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 20, marginTop: -4, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
    alignSelf: "flex-start",
  },
  discountBtnText: { fontSize: 12 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  selectorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  selectorText: { fontSize: 13 },
  noGroupText: { fontSize: 13, fontStyle: "italic" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
  targetBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  targetName: { fontSize: 15 },
  periodRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  periodChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  periodText: { fontSize: 14 },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, marginTop: 4 },
  noteText: { fontSize: 12, flex: 1, lineHeight: 18 },
  modeRow: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 9,
  },
  modeBtnText: { fontSize: 13 },
  bulkHint: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  bulkInput: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, minHeight: 150, marginBottom: 10, lineHeight: 21,
  },
  bulkPreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, marginBottom: 10,
  },
  bulkPreviewText: { fontSize: 12 },
});
