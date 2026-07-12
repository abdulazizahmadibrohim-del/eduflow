---
name: EduFlow platform quirks
description: Web/native gotchas and APK build constraints for the EduFlow Expo app
---

# Alert.alert is a no-op on react-native-web
Buttons-style `Alert.alert(title, msg, [buttons])` silently does nothing in browsers, so destructive confirmations (delete buttons) fail silently on web.
**Why:** react-native-web does not implement the multi-button Alert API.
**How to apply:** Always use the shared web-safe helpers (`confirmAction`/`showAlert` in the app's `lib/confirm.ts`) instead of `Alert.alert` anywhere in this app; they fall back to `window.confirm`/`window.alert` on web.

# APK build constraints (GitHub Actions eas build --local)
- `react-native-reanimated` 4.x REQUIRES `newArchEnabled: true` in app config — disabling new architecture breaks the Gradle build.
- Supabase credentials are injected at build time via `app.config.js` `extra` from env vars, so the GitHub repo must have `SUPABASE_URL` and `SUPABASE_ANON_KEY` Actions secrets (alongside `EXPO_TOKEN`); a build without them produces an APK that can't reach the backend.
- `gh secret set -R <owner>/<repo>` with `GH_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN` works from this workspace for setting repo secrets without printing values.
