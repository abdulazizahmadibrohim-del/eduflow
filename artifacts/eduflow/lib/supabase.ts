import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? "";
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function buildClient(): SupabaseClient {
  const url = supabaseUrl || "https://placeholder.supabase.co";
  const key = supabaseAnonKey || "placeholder-key";
  return createClient(url, key, {
    auth: {
      storage: Platform.OS !== "web" ? AsyncStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = buildClient();
