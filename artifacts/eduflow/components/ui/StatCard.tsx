import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, icon, color, onPress }: StatCardProps) {
  const colors = useColors();
  const isWeb = Platform.OS === "web";

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
          ...(isWeb ? { marginTop: 0 } : {}),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: (color ?? colors.primary) + "18" }]}>
        {icon}
      </View>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 140,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 26,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
  },
});
