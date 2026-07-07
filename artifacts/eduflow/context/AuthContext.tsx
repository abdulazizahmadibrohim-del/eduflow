import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "teacher";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  teacherId?: string;
  centerName?: string;
}

interface AuthContextType {
  authUser: AuthUser | null;
  isAuthLoading: boolean;
  isSetupDone: boolean;
  login: (phone: string, pin: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setupAdmin: (centerName: string, phone: string, pin: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const AUTH_KEY = "eduflow_auth_v1";

function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSetupDone, setIsSetupDone] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.user) setAuthUser(parsed.user);
      }
      const { data } = await supabase
        .from("app_settings")
        .select("admin_pin_hash, center_name")
        .eq("id", "main")
        .single();
      setIsSetupDone(!!data?.admin_pin_hash);
    } catch {
      setIsSetupDone(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const setupAdmin = useCallback(async (
    centerName: string, phone: string, pin: string
  ): Promise<{ error?: string }> => {
    if (pin.length < 4) return { error: "PIN kamida 4 ta raqam bo'lishi kerak" };
    try {
      const pinHash = hashPin(pin);
      const { error } = await supabase.from("app_settings").update({
        center_name: centerName,
        admin_phone: phone,
        admin_pin_hash: pinHash,
        updated_at: new Date().toISOString(),
      }).eq("id", "main");
      if (error) return { error: error.message };
      const user: AuthUser = {
        id: "admin", name: centerName || "Admin",
        role: "admin", phone, centerName,
      };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user }));
      setAuthUser(user);
      setIsSetupDone(true);
      return {};
    } catch (e: any) {
      return { error: e.message ?? "Noma'lum xato" };
    }
  }, []);

  const login = useCallback(async (
    phone: string, pin: string
  ): Promise<{ error?: string }> => {
    if (!phone || !pin) return { error: "Telefon raqam va PIN kiriting" };
    try {
      const pinHash = hashPin(pin);
      const cleanPhone = phone.replace(/\s/g, "");

      const { data: settings } = await supabase
        .from("app_settings")
        .select("admin_phone, admin_pin_hash, center_name")
        .eq("id", "main")
        .single();

      if (
        settings?.admin_phone?.replace(/\s/g, "") === cleanPhone &&
        settings?.admin_pin_hash === pinHash
      ) {
        const user: AuthUser = {
          id: "admin", name: settings.center_name ?? "Admin",
          role: "admin", phone: cleanPhone, centerName: settings.center_name,
        };
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user }));
        setAuthUser(user);
        return {};
      }

      const { data: teachers } = await supabase
        .from("teachers")
        .select("id, name, phone, pin_hash, status")
        .eq("status", "active");

      const teacher = (teachers ?? []).find(
        t => t.phone.replace(/\s/g, "") === cleanPhone
      );
      if (!teacher) return { error: "Telefon raqam topilmadi" };
      if (teacher.pin_hash !== pinHash) return { error: "PIN noto'g'ri" };

      const user: AuthUser = {
        id: teacher.id, name: teacher.name,
        role: "teacher", phone: cleanPhone, teacherId: teacher.id,
      };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user }));
      setAuthUser(user);
      return {};
    } catch (e: any) {
      return { error: e.message ?? "Noma'lum xato" };
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setAuthUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      authUser, isAuthLoading, isSetupDone, login, logout, setupAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
