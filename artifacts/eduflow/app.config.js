module.exports = {
  expo: {
    name: "EduFlow",
    slug: "eduflow",
    owner: "abdulazizahmad",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "eduflow",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#F8FAFC",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.abdulazizahmad.eduflow",
    },
    android: {
      package: "com.abdulazizahmad.eduflow",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#1E3A8A",
      },
      versionCode: 1,
    },
    web: {
      favicon: "./assets/images/icon.png",
      bundler: "metro",
    },
    plugins: [
      ["expo-router", { origin: "https://replit.com/" }],
      "expo-font",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      eas: {
        projectId: "eduflow",
      },
    },
  },
};
