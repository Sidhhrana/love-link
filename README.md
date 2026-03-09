# Love Link

Premium installable long-distance PWA with realtime sync, lockscreen alert support, and mini-game score sync.

## Key updates
- Aesthetic Music tab with embedded Spotify playlist
- Miss button fixed and redesigned
- Full-screen incoming signal popup
- iOS-style toggles and sliders
- Mini game in Admin with synced high scores

## Background lockscreen notifications (required for closed-app alerts)
This now includes push token registration in the web app, but true background notifications require:

1. Firebase Cloud Functions deployment (`functions/` folder)
2. Web Push certificate key (VAPID public key) set in `app.js`:
   - `const FCM_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY'`

### Deploy functions
From project root:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Function deployed: `pushOnMissSignal`
- Trigger: `rooms/{room}/events/{eventId}` when `type = miss_signal`
- Sends push to other room members using `roomTokens/{room}`

## Realtime setup in app
1. Login on both devices with same pair code
2. Open Settings -> Enable Notifications
3. Open Admin -> Connect Realtime
4. Press Miss Signal from one device

## Notes
- Closed-app lockscreen notifications depend on browser/OS support and permissions.
- iOS web push requires Add-to-Home-Screen PWA and notifications permission granted.
