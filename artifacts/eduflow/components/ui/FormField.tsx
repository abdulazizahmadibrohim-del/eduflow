import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  suffix?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function FormField({ label, error, suffix, rightIcon, onRightIconPress, ...props }: FormFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={[
        styles.inputRow,
        {
          backgroundColor: colors.input,
          borderColor: error ? colors.destructive : colors.border,
        }
      ]}>
        <TextInput
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular", flex: 1 }]}
          placeholderTextColor={colors.mutedForeground}
          {...props}
        />
        {suffix && (
          <Text style={[styles.suffix, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {suffix}
          </Text>
        )}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  input: {
    fontSize: 15,
    paddingVertical: 12,
  },
  suffix: {
    fontSize: 14,
    marginLeft: 4,
  },
  rightIcon: {
    paddingLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
