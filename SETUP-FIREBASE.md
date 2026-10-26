# AICTE FDR Portal: setup note

## Required Firebase configuration

This archive does not contain the original `firebase-applet-config.json`, so it must not invent your Firebase project credentials.
1. Copy `.env.example` to `.env.local`.
2. Fill the values from Firebase Console > Project settings > Your apps.
3. Set `VITE_FIREBASE_DATABASE_ID` if your project uses a non-default Firestore database.
4. Restart `npm run dev` after editing `.env.local`.

Without valid Firebase values, the project may compile but Google sign-in and Firestore operations will not work.

## Commands

```powershell
npm install
npm run lint
npm run build
npm run dev
```

The complaint-box and Download ZIP removals and the AI feature additions from the supplied archive are otherwise preserved.
