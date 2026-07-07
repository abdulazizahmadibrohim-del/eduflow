import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Course, type Group } from "@/context/AppContext";
import { CourseCard } from "@/components/ui/CourseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";
import { SectionHeader } from "@/components/ui/SectionHeader";

const COLORS = ["#1E3A8A", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#EC4899", "#6366F1"];

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { courses, groups, students, addCourse, updateCourse, deleteCourse, addGroup, updateGroup, deleteGroup } = useApp();

  const [tab, setTab] = useState<"courses" | "groups">("courses");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [courseForm, setCourseForm] = useState({ name: "", description: "", price: "", duration: "3", color: COLORS[0] });
  const [groupForm, setGroupForm] = useState({ name: "", courseId: "", teacherId: "u1", schedule: "", maxStudents: "15", room: "" });

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({ name: "", description: "", price: "", duration: "3", color: COLORS[0] });
    setShowCourseModal(true);
  };
  const openEditCourse = (c: Course) => {
    setEditingCourse(c);
    setCourseForm({ name: c.name, description: c.description ?? "", price: c.price.toString(), duration: c.duration.toString(), color: c.color });
    setShowCourseModal(true);
  };
  const saveCourse = () => {
    if (!courseForm.name) return;
    const data = { name: courseForm.name, description: courseForm.description, price: Number(courseForm.price), duration: Number(courseForm.duration), color: courseForm.color };
    if (editingCourse) updateCourse(editingCourse.id, data);
    else addCourse(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCourseModal(false);
  };
  const deleteCourseHandler = (id: string) => {
    Alert.alert("O'chirish", "Kursni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => { deleteCourse(id); setShowCourseModal(false); } }
    ]);
  };

  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", courseId: courses[0]?.id ?? "", teacherId: "u1", schedule: "", maxStudents: "15", room: "" });
    setShowGroupModal(true);
  };
  const openEditGroup = (g: Group) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, courseId: g.courseId, teacherId: g.teacherId, schedule: g.schedule, maxStudents: g.maxStudents.toString(), room: g.room ?? "" });
    setShowGroupModal(true);
  };
  const saveGroup = () => {
    if (!groupForm.name) return;
    const data = { name: groupForm.name, courseId: groupForm.courseId, teacherId: groupForm.teacherId, schedule: groupForm.schedule, maxStudents: Number(groupForm.maxStudents), room: groupForm.room };
    if (editingGroup) updateGroup(editingGroup.id, data);
    else addGroup(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGroupModal(false);
  };
  const deleteGroupHandler = (id: string) => {
    Alert.alert("O'chirish", "Guruhni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => { deleteGroup(id); setShowGroupModal(false); } }
    ]);
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Kurslar</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: tab === "courses" ? colors.primary : colors.secondary }]}
          onPress={tab === "courses" ? openAddCourse : openAddGroup}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
        {(["courses", "groups"] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, { backgroundColor: tab === t ? colors.card : "transparent" }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, {
              color: tab === t ? colors.foreground : colors.mutedForeground,
              fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular"
            }]}>
              {t === "courses" ? `Kurslar (${courses.length})` : `Guruhlar (${groups.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "courses" ? (
        <FlatList
          data={courses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CourseCard course={item} students={students} onPress={() => openEditCourse(item)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
          ListEmptyComponent={<EmptyState icon="book-outline" title="Kurslar yo'q" description="Birinchi kursni yarating" actionLabel="Kurs qo'shish" onAction={openAddCourse} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={courses.length > 0}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const course = courses.find(c => c.id === item.courseId);
            const count = students.filter(s => s.groupId === item.id).length;
            return (
              <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openEditGroup(item)}
                activeOpacity={0.85}
              >
                <View style={[styles.groupDot, { backgroundColor: course?.color ?? colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{item.name}</Text>
                  <Text style={[styles.groupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {course?.name} · {item.schedule}
                  </Text>
                  <Text style={[styles.groupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {count}/{item.maxStudents} o'quvchi {item.room ? `· ${item.room}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
          ListEmptyComponent={<EmptyState icon="grid-outline" title="Guruhlar yo'q" description="Birinchi guruhni yarating" actionLabel="Guruh qo'shish" onAction={openAddGroup} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={groups.length > 0}
        />
      )}

      {/* Course Modal */}
      <ModalSheet visible={showCourseModal} onClose={() => setShowCourseModal(false)} title={editingCourse ? "Kursni tahrirlash" : "Yangi kurs"}>
        <FormField label="Kurs nomi *" value={courseForm.name} onChangeText={v => setCourseForm(p => ({ ...p, name: v }))} placeholder="masalan: Matematika" />
        <FormField label="Tavsif" value={courseForm.description} onChangeText={v => setCourseForm(p => ({ ...p, description: v }))} placeholder="Kurs haqida qisqacha" />
        <FormField label="Narxi (so'm) *" value={courseForm.price} onChangeText={v => setCourseForm(p => ({ ...p, price: v }))} placeholder="350000" keyboardType="numeric" />
        <FormField label="Davomiyligi (oy)" value={courseForm.duration} onChangeText={v => setCourseForm(p => ({ ...p, duration: v }))} keyboardType="numeric" />
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Rang</Text>
        <View style={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: courseForm.color === c ? 3 : 0, borderColor: colors.foreground }]}
              onPress={() => setCourseForm(p => ({ ...p, color: c }))}
            />
          ))}
        </View>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !courseForm.name ? 0.5 : 1 }]} onPress={saveCourse} disabled={!courseForm.name} activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>{editingCourse ? "Saqlash" : "Qo'shish"}</Text>
        </TouchableOpacity>
        {editingCourse && (
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.destructive }]} onPress={() => deleteCourseHandler(editingCourse.id)}>
            <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>O'chirish</Text>
          </TouchableOpacity>
        )}
      </ModalSheet>

      {/* Group Modal */}
      <ModalSheet visible={showGroupModal} onClose={() => setShowGroupModal(false)} title={editingGroup ? "Guruhni tahrirlash" : "Yangi guruh"}>
        <FormField label="Guruh nomi *" value={groupForm.name} onChangeText={v => setGroupForm(p => ({ ...p, name: v }))} placeholder="masalan: Mat-A" />
        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Kurs</Text>
        <View style={styles.selectorRow}>
          {courses.map(c => (
            <TouchableOpacity key={c.id} style={[styles.selectorChip, { backgroundColor: groupForm.courseId === c.id ? c.color : colors.muted }]} onPress={() => setGroupForm(p => ({ ...p, courseId: c.id }))}>
              <Text style={[styles.selectorText, { color: groupForm.courseId === c.id ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FormField label="Dars vaqti" value={groupForm.schedule} onChangeText={v => setGroupForm(p => ({ ...p, schedule: v }))} placeholder="Du-Cho-Ju, 09:00" />
        <FormField label="Xona" value={groupForm.room} onChangeText={v => setGroupForm(p => ({ ...p, room: v }))} placeholder="201-xona" />
        <FormField label="Max o'quvchi soni" value={groupForm.maxStudents} onChangeText={v => setGroupForm(p => ({ ...p, maxStudents: v }))} keyboardType="numeric" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.secondary, opacity: !groupForm.name ? 0.5 : 1 }]} onPress={saveGroup} disabled={!groupForm.name} activeOpacity={0.85}>
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>{editingGroup ? "Saqlash" : "Qo'shish"}</Text>
        </TouchableOpacity>
        {editingGroup && (
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.destructive }]} onPress={() => deleteGroupHandler(editingGroup.id)}>
            <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>O'chirish</Text>
          </TouchableOpacity>
        )}
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", margin: 16, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14 },
  list: { paddingTop: 4 },
  groupCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 10, borderWidth: 1 },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontSize: 15, marginBottom: 2 },
  groupSub: { fontSize: 13 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  selectorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  selectorText: { fontSize: 13 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
});
