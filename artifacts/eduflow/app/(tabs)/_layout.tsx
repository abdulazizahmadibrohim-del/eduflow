import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const NAV_ITEMS = [
  { name: "index",    label: "Bosh sahifa", icon: "home-outline",    iconActive: "home"           },
  { name: "students", label: "O'quvchilar", icon: "people-outline",  iconActive: "people"         },
  { name: "courses",  label: "Kurslar",     icon: "book-outline",    iconActive: "book"           },
  { name: "payments", label: "To'lovlar",   icon: "card-outline",    iconActive: "card"           },
  { name: "settings", label: "Sozlamalar",  icon: "settings-outline",iconActive: "settings"       },
] as const;

function pathToTab(pathname: string): string {
  if (pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index") return "index";
  const last = pathname.split("/").pop() ?? "index";
  return last;
}

function DesktopSidebar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = pathToTab(pathname);
  const { authUser } = useAuth();

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="school" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.logoTitle, { color: colors.foreground }]}>EduFlow</Text>
          {authUser?.centerName ? (
            <Text style={[styles.logoSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {authUser.centerName}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Nav items */}
      <View style={styles.navItems}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => {
                const route = item.name === "index" ? "/(tabs)/" : `/(tabs)/${item.name}`;
                router.push(route as any);
              }}
              style={({ pressed }) => [
                styles.navItem,
                isActive && { backgroundColor: colors.primary + "15" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[
                styles.navItemIcon,
                isActive && { backgroundColor: colors.primary + "20" },
              ]}>
                <Ionicons
                  name={(isActive ? item.iconActive : item.icon) as any}
                  size={20}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
              </View>
              <Text style={[
                styles.navItemLabel,
                { color: isActive ? colors.primary : colors.mutedForeground },
                isActive && { fontWeight: "600" },
              ]}>
                {item.label}
              </Text>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Bottom user badge */}
      <View style={[styles.sidebarFooter, { borderTopColor: colors.border }]}>
        <View style={[styles.userBadge, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="person-circle" size={32} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {authUser?.name ?? "Admin"}
            </Text>
            <Text style={[styles.userRole, { color: colors.mutedForeground }]}>
              {authUser?.role === "teacher" ? "O'qituvchi" : "Admin"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DesktopLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View style={[styles.desktopRoot, { backgroundColor: colors.background }]}>
      <DesktopSidebar />
      <View style={styles.desktopContent}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="students" />
          <Tabs.Screen name="courses" />
          <Tabs.Screen name="payments" />
          <Tabs.Screen name="settings" />
        </Tabs>
      </View>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Bosh sahifa</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="students">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>O'quvchilar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="courses">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Kurslar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="payments">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>To'lovlar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Sozlamalar</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: 60,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Bosh sahifa",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Ionicons name="home-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "O'quvchilar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Ionicons name="people-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Kurslar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book" tintColor={color} size={24} />
            ) : (
              <Ionicons name="book-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "To'lovlar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="creditcard" tintColor={color} size={24} />
            ) : (
              <Ionicons name="card-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Sozlamalar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={24} />
            ) : (
              <Ionicons name="settings-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { authUser, isAuthLoading } = useAuth();
  const isDesktop = useIsDesktop();

  if (!isAuthLoading && !authUser) {
    return <Redirect href={"/login" as any} />;
  }

  if (Platform.OS === "web" && isDesktop) {
    return <DesktopLayout />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    flexDirection: "column",
  },
  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  logoSub: {
    fontSize: 11,
    marginTop: 1,
  },
  navItems: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: "relative",
  },
  navItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navItemLabel: {
    fontSize: 14,
    flex: 1,
  },
  activeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    position: "absolute",
    right: -12,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
  },
  userRole: {
    fontSize: 11,
    marginTop: 1,
  },
  desktopContent: {
    flex: 1,
    overflow: "hidden",
  },
});
