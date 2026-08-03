# Ki

An offline-first strength-training coach: adaptive weekly split, quick set logging, and explainable progression recommendations.

## Run on Windows and iPhone

1. Install Node.js 20 LTS or newer (your currently installed Node 18.17 is too old for current Expo tooling).
2. From this folder, run `npm install` and then `npx expo start`.
3. Install **Expo Go** on the iPhone, make sure the phone and laptop share a network, then scan the terminal QR code.

The project intentionally begins with no backend. Training-day preference is persisted locally; the next step is persisting workout logs and modelling user-specific exercise history.
