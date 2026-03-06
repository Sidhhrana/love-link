# Love Link

Premium installable long-distance PWA with realtime sync.

## Current Features
- Pair-code login
- Miss Signal + Vibe Ping
- Reworked Mood Sync (Energy + Affection model)
- Songs, Goals, Important Dates calendar, Open-When letters
- Advanced UI settings: blur, motion, radius, scale, focus mode, haptics, sound cue
- Admin panel with realtime controls, connection pulse, and monitoring
- Firebase anonymous-auth realtime sync (production-ready flow)

## Realtime Notes
- Uses Firebase Auth (Anonymous) + Realtime Database
- Registers room membership under `roomMembers/{pairCode}/{uid}`
- Incremental remote updates (no full-screen repaint)

## Deploy
Host as static files on GitHub Pages.
