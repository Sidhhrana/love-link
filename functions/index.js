const { onValueCreated } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.pushOnMissSignal = onValueCreated(
  {
    ref: '/rooms/{room}/events/{eventId}',
    region: 'us-central1'
  },
  async (event) => {
    const data = event.data.val();
    if (!data || data.type !== 'miss_signal') return;

    const room = event.params.room;
    const sender = data.sender;
    const senderName = data.senderName || 'Your person';

    const db = getDatabase();
    const snap = await db.ref(`roomTokens/${room}`).get();
    if (!snap.exists()) return;

    const roomTokens = snap.val();
    const targetTokens = [];

    for (const [uid, tokenMap] of Object.entries(roomTokens)) {
      if (uid === sender || !tokenMap || typeof tokenMap !== 'object') continue;
      for (const encoded of Object.keys(tokenMap)) {
        targetTokens.push(decodeURIComponent(encoded));
      }
    }

    if (!targetTokens.length) return;

    const msg = {
      tokens: targetTokens,
      notification: {
        title: `${senderName} misses you`,
        body: 'Open Love Link now'
      },
      data: {
        type: 'miss_signal',
        room
      },
      android: {
        priority: 'high',
        notification: {
          defaultVibrateTimings: true,
          channelId: 'love_link_alerts'
        }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            sound: 'default',
            alert: {
              title: `${senderName} misses you`,
              body: 'Open Love Link now'
            }
          }
        }
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          title: `${senderName} misses you`,
          body: 'Open Love Link now',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [40, 80, 40]
        }
      }
    };

    const res = await getMessaging().sendEachForMulticast(msg);

    if (res.failureCount > 0) {
      const updates = {};
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const bad = encodeURIComponent(targetTokens[i]);
          for (const uid of Object.keys(roomTokens)) {
            if (roomTokens[uid] && roomTokens[uid][bad]) {
              updates[`roomTokens/${room}/${uid}/${bad}`] = null;
            }
          }
        }
      });
      if (Object.keys(updates).length) await db.ref().update(updates);
    }
  }
);
