import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon} size={40} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { fontFamily: "Inter_600SemiBold" }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
