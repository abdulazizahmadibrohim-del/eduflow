import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.action, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
  },
  action: {
    fontSize: 14,
  },
});
