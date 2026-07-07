import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Payment, Student } from "@/context/AppContext";

interface PaymentCardProps {
  payment: Payment;
  student?: Student;
  onMarkPaid?: () => void;
  onPress?: () => void;
}

const STATUS = {
  paid: { color: "#10B981", bg: "#10B98118", label: "To'langan", icon: "checkmark-circle" as const },
  pending: { color: "#F59E0B", bg: "#F59E0B18", label: "Kutilmoqda", icon: "time" as const },
  overdue: { color: "#EF4444", bg: "#EF444418", label: "Muddati o'tgan", icon: "warning" as const },
};

export function PaymentCard({ payment, student, onMarkPaid, onPress }: PaymentCardProps) {
  const colors = useColors();
  const cfg = STATUS[payment.status];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      activeOpacity={0.9}
    >
      <View style={[styles.indicator, { backgroundColor: cfg.color }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {student?.name ?? "—"}
          </Text>
          <Text style={[styles.amount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {payment.amount.toLocaleString()} so'm
          </Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color, fontFamily: "Inter_500Medium" }]}>
              {cfg.label}
            </Text>
          </View>
          <Text style={[styles.month, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {payment.month}
          </Text>
        </View>
        {(payment.status === "pending" || payment.status === "overdue") && onMarkPaid && (
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onMarkPaid();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            <Text style={[styles.payBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              To'landi deb belgilash
            </Text>
          </TouchableOpacity>
        )}
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
  indicator: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
  },
  month: {
    fontSize: 12,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
});
