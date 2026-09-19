// Vitest setup: define React Native / Expo globals missing under Node so
// that modules importing react-native or expo packages can be unit-tested.
// @ts-expect-error test-global injection
globalThis.__DEV__ = false;
// @ts-expect-error test-global injection
globalThis.__EXPO_ENV__ = { mode: "test", dev: false };
// @ts-expect-error test-global injection
globalThis.__expo_module_debug_log_filtered__ = true;
