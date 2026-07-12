import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, type Course, type Group } from "@/context/AppContext";
import { confirmAction, showAlert } from "@/lib/confirm";
import { CourseCard } from "@/components/ui/CourseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { FormField } from "@/components/ui/FormField";

const COLORS = ["#1E3A8A", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#EC4899", "#6366F1"];

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const {
    user, courses, groups, students, teachers,
    addCourse, updateCourse, deleteCourse,
    addGroup, updateGroup, deleteGroup,
    addDiscountRequest,
  } = useApp();

  const isTeacher = user?.role === "teacher";

  const visibleGroups = useMemo(() => {
    if (!isTeacher || !user?.teacherId) return groups;
    return groups.filter(g => g.teacherId === user.teacherId);
  }, [isTeacher, user, groups]);

  const [tab, setTab] = useState<"courses" | "groups">("courses");
  const [search, setSearch] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [discountTargetGroup, setDiscountTargetGroup] = useState<Group | null>(null);

  const [courseForm, setCourseForm] = useState({ name: "", description: "", price: "", duration: "3", color: COLORS[0] });
  const [groupForm, setGroupForm] = useState({ name: "", courseId: "", teacherId: "", schedule: "", maxStudents: "15", room: "" });
  const [discountForm, setDiscountForm] = useState({
    percent: "10",
    period: "monthly" as "monthly" | "unlimited",
    month: new Date().toISOString().slice(0, 7),
    description: "",
  });

  const filteredCourses = useMemo(() => {
    if (!search) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [courses, search]);

  const filteredGroups = useMemo(() => {
    const base = visibleGroups;
    if (!search) return base;
    return base.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [visibleGroups, search]);

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({ name: "", description: "", price: "", duration: "3", color: COLORS[0] });
    setShowCourseModal(true);
  };
  const openEditCourse = (c: Course) => {
    if (isTeacher) return;
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
    confirmAction("O'chirish", "Kursni o'chirmoqchimisiz?", () => {
      deleteCourse(id);
      setShowCourseModal(false);
    });
  };

  const openAddGroup = () => {
    if (isTeacher) return;
    setEditingGroup(null);
    setGroupForm({ name: "", courseId: courses[0]?.id ?? "", teacherId: teachers[0]?.id ?? "", schedule: "", maxStudents: "15", room: "" });
    setShowGroupModal(true);
  };
  const openEditGroup = (g: Group) => {
    if (isTeacher) return;
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
    confirmAction("O'chirish", "Guruhni o'chirmoqchimisiz?", () => {
      deleteGroup(id);
      setShowGroupModal(false);
    });
  };

  const openGroupDiscount = (g: Group) => {
    setDiscountTargetGroup(g);
    setDiscountForm({ percent: "10", period: "monthly", month: new Date().toISOString().slice(0, 7), description: "" });
    setShowDiscountModal(true);
  };
  const sendGroupDiscountRequest = () => {
    if (!discountTargetGroup || !user?.teacherId) return;
    addDiscountRequest({
      teacherId: user.teacherId,
      targetType: "group",
      targetId: discountTargetGroup.id,
      period: discountForm.period,
      month: discountForm.period === "monthly" ? discountForm.month : undefined,
      percent: Number(discountForm.percent),
      description: discountForm.description || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDiscountModal(false);
    showAlert("Yuborildi", "Guruh uchun chegirma so'rovnomasi adminga yuborildi.");
  };

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Kurslar</Text>
        {!isTeacher && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: tab === "courses" ? colors.primary : colors.secondary }]}
            onPress={tab === "courses" ? openAddCourse : openAddGroup}
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
          placeholder="Kurs yoki guruh nomi..."
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
              fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
            }]}>
              {t === "courses" ? `Kurslar (${courses.length})` : `Guruhlar (${visibleGroups.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "courses" ? (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              students={students}
              onPress={() => openEditCourse(item)}
              onEdit={!isTeacher ? () => openEditCourse(item) : undefined}
              onDelete={!isTeacher ? () => deleteCourseHandler(item.id) : undefined}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
          ListEmptyComponent={<EmptyState icon="book-outline" title="Kurslar yo'q" description="Birinchi kursni yarating" actionLabel="Kurs qo'shish" onAction={isTeacher ? undefined : openAddCourse} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const course = courses.find(c => c.id === item.courseId);
            const teacher = teachers.find(t => t.id === item.teacherId);
            const count = students.filter(s => s.groupId === item.id).length;
            return (
              <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => isTeacher ? undefined : openEditGroup(item)}
                activeOpacity={isTeacher ? 1 : 0.85}
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
                  {teacher && (
                    <View style={styles.teacherTag}>
                      <Ionicons name="school-outline" size={11} color={colors.secondary} />
                      <Text style={[styles.teacherTagText, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
                        {teacher.name}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.groupRight}>
                  {isTeacher && user?.teacherId && (
                    <TouchableOpacity
                      style={[styles.groupDiscountBtn, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}
                      onPress={() => openGroupDiscount(item)}
                    >
                      <Ionicons name="pricetag-outline" size={13} color={colors.secondary} />
                      <Text style={[styles.groupDiscountTxt, { color: colors.secondary, fontFamily: "Inter_500Medium" }]}>
                        Chegirma
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!isTeacher && (
                    <View style={styles.groupActions}>
                      <TouchableOpacity
                        style={[styles.groupActionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                        onPress={() => openEditGroup(item)}
                      >
                        <Ionicons name="pencil-outline" size={13} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.groupActionBtn, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}
                        onPress={() => deleteGroupHandler(item.id)}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 80 : 80 }]}
          ListEmptyComponent={<EmptyState icon="grid-outline" title="Guruhlar yo'q" description="Birinchi guruhni yarating" actionLabel={isTeacher ? undefined : "Guruh qo'shish"} onAction={isTeacher ? undefined : openAddGroup} />}
          showsVerticalScrollIndicator={false}
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

        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>O'qituvchi</Text>
        {teachers.length === 0 ? (
          <View style={[styles.noTeacherBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.noTeacherText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Avval Sozlamalar → O'qituvchi qo'shing
            </Text>
          </View>
        ) : (
          <View style={styles.selectorColumn}>
            {teachers.map(t => {
              const isSelected = groupForm.teacherId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.teacherChip, { backgroundColor: isSelected ? colors.secondary : colors.muted, borderWidth: isSelected ? 0 : 1, borderColor: colors.border }]}
                  onPress={() => setGroupForm(p => ({ ...p, teacherId: t.id }))}
                >
                  <View style={[styles.teacherChipAvatar, { backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : colors.background }]}>
                    <Text style={[styles.teacherChipInitials, { color: isSelected ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                      {t.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teacherChipName, { color: isSelected ? "#FFFFFF" : colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {t.name.split(" ")[0]}
                    </Text>
                    <Text style={[styles.teacherChipSub, { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {t.salaryType === "percentage" ? `${t.salaryPercent ?? 0}% foiz` : "O'zgarmas"}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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

      {/* Group Discount Request Modal */}
      <ModalSheet visible={showDiscountModal} onClose={() => setShowDiscountModal(false)} title="Guruh chegirma so'rovnomasi">
        {discountTargetGroup && (
          <View style={[styles.targetBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={20} color={colors.secondary} />
            <Text style={[styles.targetName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {discountTargetGroup.name}
            </Text>
          </View>
        )}

        <FormField label="Chegirma foizi (%) *" value={discountForm.percent} onChangeText={v => setDiscountForm(p => ({ ...p, percent: v }))} placeholder="10" keyboardType="numeric" suffix="%" />

        <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Davr</Text>
        <View style={styles.periodRow}>
          {(["monthly", "unlimited"] as const).map(per => (
            <TouchableOpacity
              key={per}
              style={[styles.periodChip, { backgroundColor: discountForm.period === per ? colors.secondary : colors.muted, flex: 1 }]}
              onPress={() => setDiscountForm(p => ({ ...p, period: per }))}
            >
              <Ionicons name={per === "monthly" ? "calendar-outline" : "infinite-outline"} size={16} color={discountForm.period === per ? "#FFFFFF" : colors.mutedForeground} />
              <Text style={[styles.periodText, { color: discountForm.period === per ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {per === "monthly" ? "Bir oylik" : "Cheksiz"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {discountForm.period === "monthly" && (
          <FormField label="Oy (YYYY-MM)" value={discountForm.month} onChangeText={v => setDiscountForm(p => ({ ...p, month: v }))} placeholder="2026-07" />
        )}

        <FormField label="Sabab / Tavsif (ixtiyoriy)" value={discountForm.description} onChangeText={v => setDiscountForm(p => ({ ...p, description: v }))} placeholder="masalan: guruh kichik, davomati yaxshi" />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.secondary, opacity: !discountForm.percent ? 0.5 : 1 }]}
          onPress={sendGroupDiscountRequest}
          disabled={!discountForm.percent}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Yuborish</Text>
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
  tabRow: { flexDirection: "row", margin: 16, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14 },
  list: { paddingTop: 4 },
  groupCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 10, borderWidth: 1 },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontSize: 15, marginBottom: 2 },
  groupSub: { fontSize: 13 },
  teacherTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  teacherTagText: { fontSize: 12 },
  groupRight: { alignItems: "flex-end", gap: 8 },
  groupDiscountBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  groupDiscountTxt: { fontSize: 12 },
  groupActions: { flexDirection: "row", gap: 6 },
  groupActionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  pickerLabel: { fontSize: 13, marginBottom: 8, marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  selectorColumn: { gap: 8, marginBottom: 16 },
  selectorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  selectorText: { fontSize: 13 },
  noTeacherBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  noTeacherText: { fontSize: 13, flex: 1 },
  teacherChip: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12 },
  teacherChipAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  teacherChipInitials: { fontSize: 13 },
  teacherChipName: { fontSize: 14 },
  teacherChipSub: { fontSize: 11 },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
  targetBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  targetName: { fontSize: 15 },
  periodRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  periodChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  periodText: { fontSize: 14 },
});
