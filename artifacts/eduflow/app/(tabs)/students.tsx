import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Student } from "@/context/AppContext";
import { StudentCard } from "@/components/ui/StudentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

export default function StudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { students, courses, groups, payments, addStudent, updateStudent, deleteStudent } = useApp();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", parentPhone: "",
    courseId: "", groupId: "", status: "active" as "active" | "inactive"
  });

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search);
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [students, search, filterStatus]);

  const getPaymentStatus = (studentId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const p = payments.find(p => p.studentId === studentId && p.month === currentMonth);
    return p?.status;
  };

  const openAdd = () => {
    setEditingStudent(null);
    setForm({ name: "", phone: "", parentPhone: "", courseId: courses[0]?.id ?? "", groupId: groups[0]?.id ?? "", status: "active" });
    setShowModal(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setForm({ name: s.name, phone: s.phone, parentPhone: s.parentPhone ?? "", courseId: s.courseId, groupId: s.groupId, status: s.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    if (editingStudent) {
      updateStudent(editingStudent.id, form);
    } else {
      addStudent(form);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("O'chirishni tasdiqlang", "Bu o'quvchini o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish", style: "destructive",
        onPress: () => {
          deleteStudent(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setShowModal(false);
        }
      }
    ]);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          O'quvchilar
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
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

      {/* Filter chips */}
      <View style={styles.chips}>
        {(["all", "active", "inactive"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, {
              backgroundColor: filterStatus === f ? colors.primary : colors.muted,
            }]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[styles.chipText, {
              color: filterStatus === f ? "#FFFFFF" : colors.mutedForeground,
              fontFamily: "Inter_500Medium"
            }]}>
              {f === "all" ? "Barchasi" : f === "active" ? "Faol" : "Faol emas"}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {filtered.length} ta
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <StudentCard
            student={item}
            course={courses.find(c => c.id === item.courseId)}
            group={groups.find(g => g.id === item.groupId)}
            paymentStatus={getPaymentStatus(item.id)}
            onPress={() => openEdit(item)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: isWeb ? 34 + 80 : 80 }
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="O'quvchilar yo'q"
            description="Hali hech qanday o'quvchi qo'shilmagan"
            actionLabel="O'quvchi qo'shish"
            onAction={openAdd}
          />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
      />

      <ModalSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
      >
        <FormField
          label="To'liq ism *"
          value={form.name}
          onChangeText={v => setForm(p => ({ ...p, name: v }))}
          placeholder="Ism familiya"
          autoCapitalize="words"
        />
        <FormField
          label="Telefon raqam *"
          value={form.phone}
          onChangeText={v => setForm(p => ({ ...p, phone: v }))}
          placeholder="+998 90 123 45 67"
          keyboardType="phone-pad"
        />
        <FormField
          label="Ota-ona telefoni"
          value={form.parentPhone}
          onChangeText={v => setForm(p => ({ ...p, parentPhone: v }))}
          placeholder="+998 90 000 00 00"
          keyboardType="phone-pad"
        />

        {/* Course selector */}
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Kurs
        </Text>
        <View style={styles.selectorRow}>
          {courses.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.selectorChip, {
                backgroundColor: form.courseId === c.id ? c.color : colors.muted,
                borderWidth: form.courseId === c.id ? 0 : 1,
                borderColor: colors.border,
              }]}
              onPress={() => setForm(p => ({ ...p, courseId: c.id, groupId: groups.find(g => g.courseId === c.id)?.id ?? "" }))}
            >
              <Text style={[styles.selectorText, {
                color: form.courseId === c.id ? "#FFFFFF" : colors.mutedForeground,
                fontFamily: "Inter_500Medium"
              }]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Group selector */}
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Guruh
        </Text>
        <View style={styles.selectorRow}>
          {groups.filter(g => g.courseId === form.courseId || !form.courseId).map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.selectorChip, {
                backgroundColor: form.groupId === g.id ? colors.primary : colors.muted,
                borderWidth: form.groupId === g.id ? 0 : 1,
                borderColor: colors.border,
              }]}
              onPress={() => setForm(p => ({ ...p, groupId: g.id }))}
            >
              <Text style={[styles.selectorText, {
                color: form.groupId === g.id ? "#FFFFFF" : colors.mutedForeground,
                fontFamily: "Inter_500Medium"
              }]}>
                {g.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (!form.name || !form.phone) ? 0.5 : 1 }]}
          onPress={handleSave}
          disabled={!form.name || !form.phone}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {editingStudent ? "Saqlash" : "Qo'shish"}
          </Text>
        </TouchableOpacity>

        {editingStudent && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13 },
  count: { marginLeft: "auto", fontSize: 13 },
  list: { paddingTop: 4 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  selectorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  selectorText: { fontSize: 13 },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 15 },
});
