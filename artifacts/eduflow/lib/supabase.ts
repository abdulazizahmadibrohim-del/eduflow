import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const supabaseUrl: string = Constants.expoConfig?.extra?.supabaseUrl ?? "";
const supabaseAnonKey: string = Constants.expoConfig?.extra?.supabaseAnonKey ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== "web" ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
