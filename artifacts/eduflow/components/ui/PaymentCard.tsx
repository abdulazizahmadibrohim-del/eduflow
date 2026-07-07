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
  onAddTransaction?: () => void;
  onPress?: () => void;
}

const STATUS = {
  paid: { color: "#10B981", bg: "#10B98118", label: "To'langan", icon: "checkmark-circle" as const },
  pending: { color: "#F59E0B", bg: "#F59E0B18", label: "Kutilmoqda", icon: "time" as const },
  overdue: { color: "#EF4444", bg: "#EF444418", label: "Muddati o'tgan", icon: "warning" as const },
  partial: { color: "#0EA5E9", bg: "#0EA5E918", label: "Qisman to'langan", icon: "timer-outline" as const },
};

export function PaymentCard({ payment, student, onMarkPaid, onAddTransaction, onPress }: PaymentCardProps) {
  const colors = useColors();
  const cfg = STATUS[payment.status];
  const paidTotal = payment.paidTotal ?? 0;
  const remaining = payment.amount - paidTotal;
  const progress = payment.amount > 0 ? Math.min(paidTotal / payment.amount, 1) : 0;
  const isPartial = payment.status === "partial";
  const isPending = payment.status === "pending" || payment.status === "overdue";

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

        {isPartial && (
          <View style={styles.progressRow}>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: cfg.color, width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={[styles.progressText, { color: cfg.color, fontFamily: "Inter_500Medium" }]}>
              {paidTotal.toLocaleString()} / {payment.amount.toLocaleString()}
            </Text>
          </View>
        )}

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

        {payment.method && (
          <View style={styles.methodRow}>
            <Ionicons
              name={payment.method === "cash" ? "cash-outline" : "card-outline"}
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.methodText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {payment.method === "cash" ? "Naqd" : "Plastik"}
            </Text>
          </View>
        )}

        {(isPending || isPartial) && (
          <View style={styles.actionRow}>
            {onAddTransaction && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: cfg.color + "20", borderColor: cfg.color + "40", borderWidth: 1, flex: isPartial ? 1 : undefined }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onAddTransaction();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={14} color={cfg.color} />
                <Text style={[styles.payBtnText, { color: cfg.color, fontFamily: "Inter_600SemiBold" }]}>
                  {isPartial ? `To'lov qo'shish (qoldi: ${remaining.toLocaleString()})` : "To'lov qo'shish"}
                </Text>
              </TouchableOpacity>
            )}
            {!isPartial && onMarkPaid && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: "#10B981", flex: 1 }]}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onMarkPaid();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={[styles.payBtnText, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>
                  To'liq to'landi
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  indicator: { width: 4 },
  body: { flex: 1, padding: 14, gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: { fontSize: 15, flex: 1, marginRight: 8 },
  amount: { fontSize: 16 },
  progressRow: { gap: 4 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11 },
  month: { fontSize: 12 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  methodText: { fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  payBtnText: { fontSize: 13 },
});
