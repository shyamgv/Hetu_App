# Hetu App

A React Native app built with [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction/), using **Expo Development Builds** (not Expo Go) so the app can use custom native modules (e.g. `expo-sqlite`, `expo-secure-store`) and be built end-to-end into production binaries for the **Apple App Store** and **Google Play Store**.

> **Why not Expo Go?** Expo Go only bundles a fixed set of native modules and can't reflect custom native configuration (permissions, entitlements, custom native code). A **development build** is a debug build of your *own* app (with the Dev Menu + Fast Refresh) that includes exactly the native modules your project needs — it is the recommended workflow for any real-world Expo app and is required to eventually ship to the stores.

---

## 1. Prerequisites

Install these once per machine.

### All platforms
| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS or newer (project tested on 25.x) | [nodejs.org](https://nodejs.org) or `nvm install --lts` |
| npm | bundled with Node | — |
| Watchman (recommended) | latest | `brew install watchman` (macOS) |
| Git | latest | — |
| EAS CLI | latest | not installed globally — invoke via `npx eas-cli` (see below) |
| Expo account | — | [expo.dev/signup](https://expo.dev/signup) — required for EAS builds |

We intentionally do **not** install `eas-cli` as a project dependency (it's flagged by `expo-doctor` as an anti-pattern). Always invoke it with `npx eas-cli <command>` or install it globally:

```bash
npm install -g eas-cli
```

### macOS (for iOS builds/simulator)
1. **Xcode** (latest, from the Mac App Store) + once installed, run:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app
   sudo xcodebuild -runFirstLaunch
   ```
2. **CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```
3. **iOS Simulator** ships with Xcode — open once via Xcode → Settings → Platforms to download a runtime.

### macOS / Windows / Linux (for Android builds/emulator)
1. **Android Studio** → [developer.android.com/studio](https://developer.android.com/studio)
2. During setup, install:
   - Android SDK Platform (latest, currently API 35/36)
   - Android SDK Build-Tools
   - Android Emulator + at least one AVD (Pixel 8, API 35 recommended)
3. Set environment variables (add to `~/.zshrc`, `~/.bashrc`, or Windows System Env Vars):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
   # export ANDROID_HOME=$HOME/Android/Sdk         # Linux
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```
   On Windows, `ANDROID_HOME` is typically `%LOCALAPPDATA%\Android\Sdk`.
4. Accept licenses: `sdkmanager --licenses` (from `$ANDROID_HOME/cmdline-tools/latest/bin`).

> **Windows note:** iOS builds/simulators are not possible on Windows — use **EAS Build** (cloud build) for iOS instead of running Xcode locally. Android development (emulator + local `expo run:android`) works fully on Windows.

---

## 2. Project Setup

```bash
git clone <your-repo-url>
cd Hetu_App
npm install
```

### Environment variables
Copy the example env file and point it at your backend:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_API_URL=http://<your-machine-LAN-IP>:8000
```

> Use your computer's **LAN IP** (not `localhost`/`127.0.0.1`) so physical devices/emulators on the same network can reach your backend. Find it with `ipconfig getifaddr en0` (macOS Wi-Fi) or `ipconfig` (Windows).
>
> `.env` is git-ignored — every developer/machine keeps their own local value. There is **no hardcoded fallback IP** in the code anymore (`src/constants/config.ts`); if `EXPO_PUBLIC_API_URL` is missing you'll see a console warning and it'll fall back to `http://localhost:8000`.
>
> Changing `.env` requires a full restart of `expo start` (env vars are read at bundler start, not hot-reloaded).

### Login to EAS
```bash
npx eas-cli login
```

### Link project to EAS (first time only)
```bash
npx eas-cli init
```
This generates a real `projectId` — replace the placeholder `YOUR_EAS_PROJECT_ID` values in `app.json` (`extra.eas.projectId` and `updates.url`) with what it outputs, and set `owner` to your Expo account/organization username.

---

## 3. Running Locally with a Development Build

Unlike Expo Go, a dev client is a real native app you build **once** (or whenever you add/change a native module), then reuse for all your day-to-day JS development with fast refresh.

### Option A — Build & run locally (fastest inner loop, requires native toolchains from step 1)

```bash
# Generates native ios/ and android/ projects (git-ignored, regenerate anytime)
npm run prebuild

# iOS Simulator (macOS only)
npm run ios

# Android Emulator / connected device
npm run android
```

These commands (`expo run:ios` / `expo run:android`) compile the native app locally and install it on the simulator/emulator/connected device, then start Metro automatically.

### Option B — Build via EAS Cloud (works on any OS, needed for physical iOS devices without a Mac, or CI)

```bash
# iOS Simulator build (macOS not required to build, but you need a Mac to *run* .app files)
npm run build:dev:ios

# Android APK you can sideload on an emulator or device
npm run build:dev:android
```

Download the resulting build from the link EAS prints (or via [expo.dev](https://expo.dev) → your project → Builds), install it:
- **iOS Simulator**: drag the `.app`/`.tar.gz` onto the simulator, or `xcrun simctl install booted <path>`
- **Android**: drag the `.apk` onto the emulator, or `adb install <path>.apk`, or scan the QR code from EAS on a physical device.

### Start the JS bundler against your installed dev client
Once the dev client app is installed (either option above), start Metro:

```bash
npm start
```
This runs `expo start --dev-client`. Open the installed **Hetu** dev-client app on your simulator/device/emulator — it will connect to Metro automatically (or scan the QR code / enter the URL manually).

> `npm run start:go` (plain `expo start`) still exists if you ever need classic Expo Go for a quick UI-only preview, but it **will not** support `expo-sqlite`/`expo-secure-store` native behavior correctly — prefer the dev client.

---

## 4. Rebuilding the Dev Client

You only need to rebuild the dev client (Option A or B above) when you:
- Add/remove/upgrade a native module (anything with native code, e.g. `expo-sqlite`, `expo-camera`, etc.)
- Change `app.json` `plugins`, permissions, `ios`/`android` native config
- Change the native project via `npm run prebuild`

For pure JS/TS/React changes, just keep `npm start` running — Fast Refresh handles it live.

---

## 5. Building for Production (App Store & Play Store)

Build profiles are defined in `eas.json`:

| Profile | Purpose |
|---|---|
| `development` | Dev client, simulator (iOS) + debug APK (Android), internal distribution |
| `development-device` | Dev client for a physical iOS device (needs Apple Developer account device registration) |
| `preview` | Release-config build for internal QA (TestFlight-like/APK sideload), no store submission |
| `production` | Store-ready build, auto-incrementing build numbers |

```bash
# Production builds
npm run build:prod:ios
npm run build:prod:android
```

First iOS production build will prompt EAS to create/manage your Distribution Certificate & Provisioning Profile (or upload your own) — just follow the CLI prompts. You'll need an active **Apple Developer Program** membership ($99/yr).

First Android production build needs a signing keystore — let EAS generate & store one for you (recommended), or upload an existing one.

### Submitting to the stores

Edit `eas.json` → `submit.production` with your real:
- Apple: `appleId`, `ascAppId` (App Store Connect app ID), `appleTeamId`
- Android: path to a Google Play **service account JSON key** (`serviceAccountKeyPath`), generated from Google Cloud Console with access granted in Play Console → Setup → API access.

Then:
```bash
npm run submit:ios
npm run submit:android
```

Or submit directly right after a build finishes:
```bash
npx eas-cli build --profile production --platform ios --auto-submit
```

---

## 6. Over-the-Air (OTA) Updates (optional, already wired up)

`app.json` has `runtimeVersion.policy: "appVersion"` and an `updates.url` pointing at your EAS project. Once `projectId` is set, you can push JS-only fixes without a full store review:

```bash
npx eas-cli update --branch production --message "Fix chat bug"
```

> OTA updates can only change JS/assets — any native module change still requires a new build + store submission (or at least a new dev/preview client install).

---

## 7. Troubleshooting

- **`ERESOLVE` peer dependency errors on `npm install`**: Run `npx expo install --fix` to align all Expo-managed package versions with your installed Expo SDK, rather than hand-editing versions.
- **App connects to the wrong/old backend IP**: Confirm `.env` has the right `EXPO_PUBLIC_API_URL`, fully stop and restart `expo start` (env vars aren't hot-reloaded), and clear cache with `npx expo start --dev-client --clear` if it persists.
- **`expo-doctor` complaints**: Run `npx expo-doctor` any time after adding dependencies or editing `app.json` — it catches asset/schema/duplicate-dependency issues before they cause native build failures.
- **Native module added but app crashes / doesn't recognize it**: You're likely still running an old dev client build — rebuild it (§4).
- **Duplicate native dependency versions**: Run `npm dedupe`, then `npx expo-doctor` to confirm.

---

## 8. Project Structure Notes

- Entry point: `index.ts` → `expo-router/entry` (file-based routing via the `app/` directory). The old CRA-style `App.tsx` template has been removed since it wasn't used.
- `src/services/` — API + domain services (axios client, auth, chat, onboarding).
- `src/store/` — Zustand stores, some with local SQLite caching for offline support (`src/db/sqlite.ts`).
- `src/constants/config.ts` — reads `EXPO_PUBLIC_API_URL` from the environment; no hardcoded IP fallback.

# Issues
- Landing page after creating an account not readable. Background is interrupting with the text. Text size is pretty small for the product description.
- After the profile page before the user is presented with a quiz present with an additional screen asking user saying "In order for me to be a good friend and guide your growth I need to know you a little better. I can do it in 2 ways (1) Jump start by asking you a few situational questions. (2) Gradually understand you better as we keep chatting with each other." A disclaimer should be given in a clearer text and tone that none of this data is going out of their device and we don't use their data to train our algorithms or models. Option 1 should take the user to quiz screen and start the quiz and selecting Option 2 should take them directly to chat screen.
- Profile page scroll seems to have issues
- give a previous button on the quiz page 1st question
- Shuffle the work drive page qualities answers
- Shuffle the Response to success/falure responses.
- asking for 3 selections but accepting more without error (food question and success/failure )
- Energy pattern slider too obvious - change the labeling - slider moving in the increments of 10% need to make it a continuous slider.
- Scroll working as expected in "Decesion making style screen"
- Add ability to end conversation
- Add background image in the choose page
- Why is it directly bringing up the Welcome page instead of the sign-in page? Is it caching somewhere?