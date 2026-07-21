# Repository Guidelines

## Project Structure & Module Organization

IronForge is an offline-first Expo/React Native application. `App.tsx` contains the current screens, state management, AsyncStorage persistence, and styles. Training models and program-generation logic live in `src/domain/training.ts`; keep reusable business rules in `src/domain` rather than embedding them in UI components. Root configuration includes `app.json` for Expo, `eas.json` for builds, and `tsconfig.json` for strict TypeScript settings. Static images or fonts should be added under an `assets/` directory and referenced through Expo-compatible imports.

## Build, Test, and Development Commands

- `npm install` installs the locked dependencies (Node.js 20 LTS or newer is recommended).
- `npm start` launches the Expo development server and displays device connection options.
- `npm run ios` or `npm run android` starts Expo for the selected native platform.
- `npm run web` runs the browser target for quick UI checks.
- `npx tsc --noEmit` performs a strict TypeScript check without producing build files.

There is no dedicated production build script; use the profiles in `eas.json` with EAS CLI when preparing distributable builds.

## Coding Style & Naming Conventions

Use TypeScript and functional React components. Follow the existing two-space indentation, double quotes, semicolons, and trailing commas in multiline structures. Name components and exported types in `PascalCase`, functions and variables in `camelCase`, and constants in `UPPER_SNAKE_CASE`. Prefer immutable updates with `map`, object spreads, and typed helper functions. Keep domain entities explicit (`Workout`, `Exercise`, `SessionRecord`) and avoid `any`. No formatter or linter is configured, so match surrounding code and run the type checker before submitting.

## Testing Guidelines

No automated test framework or coverage threshold is currently configured. Validate changes with `npx tsc --noEmit` and smoke-test the affected flow through Expo on at least one target. For persistence changes, verify both a fresh launch and state restoration after reload. If adding tests, place them beside the module as `*.test.ts` or `*.test.tsx`, and add the corresponding test script to `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case subjects, such as `Add adaptive workout program builder`. Keep each commit focused on one logical change. Pull requests should summarize behavior, list manual validation performed, and link relevant issues. Include screenshots or a short recording for visible UI changes, and call out storage-schema or Expo configuration changes explicitly.
