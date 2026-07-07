import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Course, Student } from "@/context/AppContext";

interface CourseCardProps {
  course: Course;
  students: Student[];
  onPress: () => void;
}

export function CourseCard({ course, students, onPress }: CourseCardProps) {
  const colors = useColors();
  const activeCount = students.filter(s => s.courseId === course.id && s.status === "active").length;
  const totalCount = students.filter(s => s.courseId === course.id).length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.85}
    >
      <View style={[styles.colorBar, { backgroundColor: course.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: course.color + "18" }]}>
            <Ionicons name="book-outline" size={20} color={course.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {course.name}
            </Text>
            <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {course.description ?? ""}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {activeCount}/{totalCount} o'quvchi
            </Text>
          </View>
          <Text style={[styles.price, { color: course.color, fontFamily: "Inter_700Bold" }]}>
            {course.price.toLocaleString()} so'm
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  colorBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
  },
  desc: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  price: {
    fontSize: 15,
  },
});
