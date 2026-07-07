import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Course, Group, Student } from "@/context/AppContext";

interface StudentCardProps {
  student: Student;
  course?: Course;
  group?: Group;
  paymentStatus?: "paid" | "pending" | "overdue" | "partial";
  onPress: () => void;
}

const statusConfig = {
  paid: { color: "#10B981", label: "To'langan", icon: "checkmark-circle" as const },
  pending: { color: "#F59E0B", label: "Kutilmoqda", icon: "time" as const },
  overdue: { color: "#EF4444", label: "Muddati o'tgan", icon: "warning" as const },
  partial: { color: "#0EA5E9", label: "Qisman", icon: "timer-outline" as const },
};

export function StudentCard({ student, course, group, paymentStatus, onPress }: StudentCardProps) {
  const colors = useColors();
  const initials = student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const avatarColor = course?.color ?? colors.primary;
  const status = paymentStatus ? statusConfig[paymentStatus] : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={[styles.initials, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {course?.name ?? "—"} {group ? `· ${group.name}` : ""}
        </Text>
        <Text style={[styles.phone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {student.phone}
        </Text>
      </View>

      <View style={styles.right}>
        {status && (
          <View style={[styles.badge, { backgroundColor: status.color + "18" }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color, fontFamily: "Inter_500Medium" }]}>
              {status.label}
            </Text>
          </View>
        )}
        {student.status === "inactive" && (
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Faol emas
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
  },
  sub: {
    fontSize: 13,
  },
  phone: {
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
  },
});
