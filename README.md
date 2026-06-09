# StakeUp

A social accountability app where friend groups bet on goals (gym 3x/week, study, no junk food), submit photo proof for check-ins, get peer-verified, earn points, and spend them on group rewards or punishments.

Built with **Expo (React Native)** + **Firebase**.

---

## Project layout

```
StakeUp/
├── App.tsx                    # Entry point — renders Navigation
├── app.json                   # Expo config
├── src/
│   ├── config/firebase.ts     # Firebase init (fill in your config)
│   ├── theme.ts               # Colors, radius, tier helpers
│   ├── types/index.ts         # All TypeScript interfaces
│   ├── navigation/index.tsx   # React Navigation tree
│   ├── services/
│   │   ├── auth.ts            # Firebase Auth helpers
│   │   ├── firestore.ts       # All Firestore listeners + writes
│   │   └── storage.ts         # Photo upload
│   ├── components/
│   │   ├── MemberRing.tsx     # Animated SVG progress ring
│   │   ├── StreakWidget.tsx    # Week streak dots
│   │   ├── GOATCard.tsx       # Leader highlight card
│   │   ├── Pill.tsx           # Status chip
│   │   ├── IconTile.tsx       # Feather icon tile
│   │   └── cards/
│   │       ├── GoalCard.tsx
│   │       ├── CheckinCard.tsx
│   │       └── RedemptionCard.tsx
│   └── screens/
│       ├── SignInScreen.tsx
│       ├── ProfileSetupScreen.tsx
│       ├── GroupsListScreen.tsx
│       ├── GroupChatScreen.tsx    # Main screen
│       ├── ScoreboardScreen.tsx
│       ├── CatalogScreen.tsx
│       ├── ProfileScreen.tsx
│       └── modals/
│           ├── NewGoalModal.tsx
│           └── CheckinModal.tsx
├── functions/                 # Firebase Cloud Functions (TypeScript)
│   └── src/
│       ├── index.ts
│       ├── checkins.ts        # Quorum logic + point awarding
│       ├── redemptions.ts     # Point deduction + chat card
│       ├── schedulers.ts      # 24h auto-approve, goal expiry
│       └── push.ts            # FCM fan-out
├── scripts/
│   └── seed-catalog.ts        # One-time catalog seed
├── prototype/
│   ├── stakeup.js             # Terminal prototype (node stakeup.js)
│   └── ui-preview.html        # Browser UI preview (open in browser)
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── storage.rules
```

---

## Quick start (Expo Go — no build step)

### 1. Install dependencies

```bash
cd StakeUp
npm install
```

### 2. Set up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. Add a **Web app** (not iOS) — copy the config object.
3. Open `src/config/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

4. In the Firebase console, enable:
   - **Authentication** → Phone (for production) or set up test phone numbers
   - **Firestore Database** (start in test mode for development)
   - **Storage**

### 3. Start Expo

```bash
npm start
# or
npx expo start
```

### 4. Open on your phone

1. Download **Expo Go** from the App Store (iOS) or Play Store (Android).
2. Scan the QR code shown in the terminal.
3. The app will load on your device instantly.

> **Phone auth in Expo Go:** Firebase Phone auth requires a native build for full functionality. For dev testing, go to Firebase Console → Authentication → Sign-in method → Phone → Scroll to "Phone numbers for testing" and add a number like `+1 650-555-3434` with any 6-digit OTP code. Use those in the app.

---

## Deploy the Cloud Functions + rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project

cd functions && npm install && npm run build && cd ..
firebase deploy --only firestore:rules,storage,functions,firestore:indexes
```

## Seed the catalog

```bash
# Get a service-account JSON: Firebase Console → Project Settings → Service accounts
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx ts-node scripts/seed-catalog.ts
```

---

## Run locally with emulators

```bash
firebase emulators:start
```

Then uncomment the emulator block in `src/config/firebase.ts`.

---

## How the system works

- **Goals** start as `proposed`. Half the participants must approve before they go `active`.
- **Check-ins** are photo proofs taken in-app (camera only — no gallery uploads). They start as `pending`.
- **Peer verification** — other participants approve or reject inline in the chat card. Quorum (default 50% of non-submitter participants) flips status to `verified` and awards points. Reject quorum sets `rejected`.
- **Auto-approve** — pending check-ins older than 24h get auto-verified by the scheduled Cloud Function `resolvePendingCheckins`.
- **Points** are server-set only via Cloud Functions (Firestore rules block direct client writes to `member.points`).
- **Redemptions** deduct points atomically in `onRedemptionCreated`, post a `redemption_card` to the group chat, and push-notify all members.

---

## Post-MVP roadmap

- Streak multipliers + flame UI
- Weekly recap auto-posted Sunday night
- Apple Health auto-verify for workout goals
- 1v1 side bets between two members
- Group invite via deep link (currently share the group ID)
- Cross-group lifetime profile with badges
