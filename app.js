const LS_KEY = 'love-link-state-v5';
const TAB_KEY = 'love-link-tab-id';
const APP_VERSION = '20260310-ux7';
const SW_VERSION_KEY = 'love-link-sw-version';
const FCM_VAPID_KEY = 'BO_M2omP5zeSsaCCUPP4_FdGdei5m260GQy91xbp42g8fWuioaXuKGW2Pf3CEju0fsCdwDtzoYXC55MkUwGZPJ0'; // Set your Firebase Web Push certificate key for background lockscreen alerts

const FIREBASE_DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBGrgGAY6wGe5CDFofVLgZ2Rj0QbD_K-gM',
  authDomain: 'lovelink-bd7d0.firebaseapp.com',
  databaseURL: 'https://lovelink-bd7d0-default-rtdb.firebaseio.com',
  projectId: 'lovelink-bd7d0',
  storageBucket: 'lovelink-bd7d0.firebasestorage.app',
  messagingSenderId: '190328361766',
  appId: '1:190328361766:web:592f25d9f5299498cde7e7'
};

const defaultState = {
  auth: { loggedIn: false, name: '', role: 'guy', pairCode: '', partnerName: 'Partner' },
  settings: { anniversary: '', adminCode: 'lovelink-admin', themeOverride: 'auto', notifications: false, featureFlags: { reminders: true, letters: true, game: true, wall: true } },
  preferences: { focusMode: false, haptics: true, soundCue: false, perfMode: false, blur: 18, motion: 1, radius: 24, scale: 1 },
  wallpaper: { imageData: '', blur: 10, dim: 0.34 },
  sync: { firebaseConfig: '', enabled: true, connected: false, lastEventAt: 0, lastNotifiedMissAt: 0 },
  push: { token: '' },
  songs: [{ id: 'spotify-main', title: 'Our Spotify Playlist', url: 'https://open.spotify.com/playlist/6xqr5eKiT53i18ZEjJhCfY?si=c11fe2668a994cc8' }],
  goals: [],
  dates: [],
  reminders: [],
  letters: [],
  letterTombstones: {},
  mood: { value: 55 },
  dailyNote: '',
  missLog: [],
  pulse: [],
  admin: { logs: [], logFilter: 'all' },
  game: { bestByUser: {}, lastScore: 0 },
  metrics: { opens: 0, misses: 0, saves: 0 }
};

const state = loadState();
state.metrics.opens += 1;

const syncRuntime = {
  firebaseLoaded: false,
  db: null,
  roomRef: null,
  connected: false,
  authUid: '',
  eventListener: null,
  stateListener: null,
  presenceListener: null,
  profilesListener: null,
  publishTimer: null,
  lastRemoteStateTs: 0,
  lastRemoteStateData: null,
  seenEventIds: new Set(),
  heartbeatTimer: 0,
  sessionStartedAt: Date.now(),
  partnerOnline: false,
  partnerLastSeenTs: 0,
  partnerLiveName: ''
};

const gameRuntime = {
  running: false,
  paused: false,
  score: 0,
  level: 1,
  lives: 3,
  startedAt: 0,
  playerX: 0,
  targetX: 0,
  width: 640,
  height: 300,
  playerW: 110,
  basePlayerW: 110,
  minPlayerW: 62,
  playerH: 12,
  ballX: 0,
  ballY: 0,
  ballR: 10,
  baseBallR: 10,
  minBallR: 7,
  vx: 120,
  vy: 170,
  baseSpeed: 170,
  maxSpeed: 420,
  pointerActive: false,
  lastTickAt: 0,
  raf: 0,
  bindReady: false
};

const tabId = getTabId();
const motionRuntime = { enabled: true, raf: 0, initialized: false, start: null };
let deferredInstallPrompt = null;
let activeScreen = 'home';
let menuAnimating = false;
let drawerOpen = false;
let reminderTimer = 0;
let pendingWallpaperData = '';
let lastPresenceLogAt = 0;
let pendingLetterImageData = '';

const els = {
  authScreen: byId('authScreen'), appRoot: byId('appRoot'), roleInput: byId('roleInput'), nameInput: byId('nameInput'),
  pairCodeInput: byId('pairCodeInput'), loginBtn: byId('loginBtn'), demoBtn: byId('demoBtn'), brandTitle: byId('brandTitle'),
  installBtn: byId('installBtn'), syncBadge: byId('syncBadge'), missBtn: byId('missBtn'), shareMissBtn: byId('shareMissBtn'),
  menuBtn: byId('menuBtn'), sideMenu: byId('sideMenu'), menuCloseBtn: byId('menuCloseBtn'), menuBackdrop: byId('menuBackdrop'),
  drawerToggleBtn: byId('drawerToggleBtn'), homeDrawer: byId('homeDrawer'), homeDrawerHandle: byId('homeDrawerHandle'),
  vibePingBtn: byId('vibePingBtn'), missStatus: byId('missStatus'), moodLabel: byId('moodLabel'), moodText: byId('moodText'),
  homeNoteState: byId('homeNoteState'), homeMoodState: byId('homeMoodState'), homePartnerState: byId('homePartnerState'), presenceStatus: byId('presenceStatus'),
  moodSlider: byId('moodSlider'), partnerAvatar: byId('partnerAvatar'), partnerRing: byId('partnerRing'),
  daysTogether: byId('daysTogether'), sinceText: byId('sinceText'), dailyPrompt: byId('dailyPrompt'), savePromptBtn: byId('savePromptBtn'),
  promptSaved: byId('promptSaved'), pulseList: byId('pulseList'), navTabs: byId('navTabs'), songTitle: byId('songTitle'),
  songUrl: byId('songUrl'), addSongBtn: byId('addSongBtn'), songsList: byId('songsList'), goalText: byId('goalText'), goalDate: byId('goalDate'),
  addGoalBtn: byId('addGoalBtn'), goalsList: byId('goalsList'), dateTitle: byId('dateTitle'), dateValue: byId('dateValue'),
  addDateBtn: byId('addDateBtn'), datesList: byId('datesList'), calendarTitle: byId('calendarTitle'), calendarGrid: byId('calendarGrid'),
  reminderTitle: byId('reminderTitle'), reminderTime: byId('reminderTime'), reminderRepeat: byId('reminderRepeat'), addReminderBtn: byId('addReminderBtn'), remindersList: byId('remindersList'),
  reminderStats: byId('reminderStats'),
  letterTitle: byId('letterTitle'), letterBody: byId('letterBody'), letterLockType: byId('letterLockType'), letterLockValue: byId('letterLockValue'),
  addLetterImageBtn: byId('addLetterImageBtn'), letterImageInput: byId('letterImageInput'), letterAttachStatus: byId('letterAttachStatus'), boldLetterBtn: byId('boldLetterBtn'), italicLetterBtn: byId('italicLetterBtn'),
  addLetterBtn: byId('addLetterBtn'), lettersList: byId('lettersList'), annivInput: byId('annivInput'), partnerNameInput: byId('partnerNameInput'),
  saveSettingsBtn: byId('saveSettingsBtn'), requestNotifBtn: byId('requestNotifBtn'), focusToggle: byId('focusToggle'), hapticToggle: byId('hapticToggle'),
  soundToggle: byId('soundToggle'), perfToggle: byId('perfToggle'), blurInput: byId('blurInput'), motionInput: byId('motionInput'), radiusInput: byId('radiusInput'),
  wallpaperLayer: byId('wallpaperLayer'), wallpaperFileInput: byId('wallpaperFileInput'), chooseWallpaperBtn: byId('chooseWallpaperBtn'), removeWallpaperBtn: byId('removeWallpaperBtn'),
  wallpaperBlurInput: byId('wallpaperBlurInput'), wallpaperDimInput: byId('wallpaperDimInput'), applyWallpaperBtn: byId('applyWallpaperBtn'), wallpaperStatus: byId('wallpaperStatus'),
  scaleInput: byId('scaleInput'), adminCodeInput: byId('adminCodeInput'), adminOpenBtn: byId('adminOpenBtn'), adminPanel: byId('adminPanel'),
  newPairCode: byId('newPairCode'), genPairCodeBtn: byId('genPairCodeBtn'), newAdminCode: byId('newAdminCode'), saveAdminCodeBtn: byId('saveAdminCodeBtn'),
  themeOverride: byId('themeOverride'), applyThemeBtn: byId('applyThemeBtn'), firebaseConfigInput: byId('firebaseConfigInput'),
  saveFirebaseBtn: byId('saveFirebaseBtn'), connectRealtimeBtn: byId('connectRealtimeBtn'), syncStatusText: byId('syncStatusText'),
  forcePresenceBtn: byId('forcePresenceBtn'), forcePublishStateBtn: byId('forcePublishStateBtn'), refreshDiagBtn: byId('refreshDiagBtn'), copyDiagBtn: byId('copyDiagBtn'),
  diagList: byId('diagList'), logFilterSelect: byId('logFilterSelect'), clearLogsBtn: byId('clearLogsBtn'), adminLogsList: byId('adminLogsList'),
  replayEventsBtn: byId('replayEventsBtn'), viewDiffBtn: byId('viewDiffBtn'), pushTestBtn: byId('pushTestBtn'), exportDataBtn: byId('exportDataBtn'), importDataBtn: byId('importDataBtn'), importDataInput: byId('importDataInput'),
  flagRemindersToggle: byId('flagRemindersToggle'), flagLettersToggle: byId('flagLettersToggle'), flagGameToggle: byId('flagGameToggle'), flagWallToggle: byId('flagWallToggle'), superAdminOut: byId('superAdminOut'),
  monitorList: byId('monitorList'), resetConfirmInput: byId('resetConfirmInput'), hardResetBtn: byId('hardResetBtn'), logoutBtn: byId('logoutBtn'), toastHost: byId('toastHost'), signalOverlay: byId('signalOverlay'),
  signalTitle: byId('signalTitle'), signalBody: byId('signalBody'), closeSignalBtn: byId('closeSignalBtn'), miniGame: byId('miniGame'),
  letterViewOverlay: byId('letterViewOverlay'), letterViewTitle: byId('letterViewTitle'), letterViewReceipt: byId('letterViewReceipt'), letterViewMedia: byId('letterViewMedia'), letterViewBody: byId('letterViewBody'), closeLetterViewBtn: byId('closeLetterViewBtn'),
  startGameBtn: byId('startGameBtn'), pauseGameBtn: byId('pauseGameBtn'), myBestScore: byId('myBestScore'),
  runScore: byId('runScore'), gameLevel: byId('gameLevel'), gameLives: byId('gameLives'), scoreBoard: byId('scoreBoard')
};

setupPWA();
bindAuth();
bindMain();
// Disable tilt-based background motion for a lighter phone experience.
motionRuntime.enabled = false;
paintFromState();
handleMissQuery();
saveState(false);
if (state.auth.loggedIn && state.sync.enabled) connectRealtime();

window.addEventListener('online', () => { if (state.auth.loggedIn && state.sync.enabled && !syncRuntime.connected) connectRealtime(); });
document.addEventListener('visibilitychange', () => {
  if (!state.auth.loggedIn || !state.sync.enabled) return;
  if (!document.hidden && !syncRuntime.connected) connectRealtime();
  if (!document.hidden && syncRuntime.connected) publishPresence();
});

function byId(id) { return document.getElementById(id); }

function setupUXMotion() {
  if (motionRuntime.initialized) return;
  motionRuntime.initialized = true;
  const root = document.documentElement;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  const render = () => {
    if (!motionRuntime.enabled) {
      motionRuntime.raf = 0;
      root.style.setProperty('--tilt-x', '0px');
      root.style.setProperty('--tilt-y', '0px');
      root.style.setProperty('--mx', '50%');
      root.style.setProperty('--my', '50%');
      return;
    }
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    root.style.setProperty('--tilt-x', `${(cx * 9).toFixed(2)}px`);
    root.style.setProperty('--tilt-y', `${(cy * 9).toFixed(2)}px`);
    root.style.setProperty('--mx', `${(50 + cx * 18).toFixed(2)}%`);
    root.style.setProperty('--my', `${(50 + cy * 18).toFixed(2)}%`);
    motionRuntime.raf = requestAnimationFrame(render);
  };
  motionRuntime.start = () => {
    if (!motionRuntime.raf) motionRuntime.raf = requestAnimationFrame(render);
  };
  motionRuntime.start();

  window.addEventListener('pointermove', (ev) => {
    if (!motionRuntime.enabled) return;
    const nx = (ev.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    const ny = (ev.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    tx = Math.max(-1, Math.min(1, nx));
    ty = Math.max(-1, Math.min(1, ny));
  }, { passive: true });

  window.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { passive: true });

  window.addEventListener('deviceorientation', (ev) => {
    if (!motionRuntime.enabled) return;
    if (document.hidden) return;
    const gx = Number(ev.gamma || 0);
    const gy = Number(ev.beta || 0);
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) return;
    tx = Math.max(-1, Math.min(1, gx / 22));
    ty = Math.max(-1, Math.min(1, gy / 38));
  }, true);

  document.addEventListener('pointerdown', (ev) => {
    const target = ev.target.closest('button, .btn, .hamburger, .drawer-arrow, .menu-nav button');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    target.style.setProperty('--tap-x', `${x}px`);
    target.style.setProperty('--tap-y', `${y}px`);
    target.classList.remove('tap');
    void target.offsetWidth;
    target.classList.add('tap');
    setTimeout(() => target.classList.remove('tap'), 380);
    if (state.auth.loggedIn) maybeVibrate([8]);
  });
}

function getTabId() {
  let v = sessionStorage.getItem(TAB_KEY);
  if (!v) {
    v = `t-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(TAB_KEY, v);
  }
  return v;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return structuredClone(defaultState);
    return deepMerge(structuredClone(defaultState), JSON.parse(raw));
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState(publish = true) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  if (publish) schedulePublishState();
}
function deepMerge(a, b) {
  if (typeof a !== 'object' || !a || typeof b !== 'object' || !b) return b ?? a;
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) a[k] = b[k];
    else if (typeof b[k] === 'object' && b[k]) a[k] = deepMerge(a[k] ?? {}, b[k]);
    else a[k] = b[k];
  }
  return a;
}

function setupPWA() {
  if ('serviceWorker' in navigator) {
    forceRefreshPWA().finally(() => {
      navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).catch(() => {});
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    els.installBtn.classList.remove('hidden');
  });
  els.installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installBtn.classList.add('hidden');
  });
}

async function forceRefreshPWA() {
  try {
    const prev = localStorage.getItem(SW_VERSION_KEY);
    if (prev === APP_VERSION) return;

    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('love-link-v')).map((k) => caches.delete(k)));
    }

    localStorage.setItem(SW_VERSION_KEY, APP_VERSION);
  } catch {}
}

function bindAuth() {
  els.loginBtn.addEventListener('click', () => {
    const name = els.nameInput.value.trim();
    const code = els.pairCodeInput.value.trim();
    if (!name || !code) return toast('Enter name and pair code');
    state.auth.loggedIn = true;
    state.auth.name = name;
    state.auth.role = els.roleInput.value;
    state.auth.pairCode = code;
    saveState();
    paintFromState();
    if (state.sync.enabled) connectRealtime();
  });
  els.demoBtn.addEventListener('click', () => {
    state.auth = { loggedIn: true, name: 'Demo User', role: 'guy', pairCode: 'LOVE-777', partnerName: 'My Person' };
    if (!state.settings.anniversary) state.settings.anniversary = new Date().toISOString().slice(0, 10);
    saveState();
    paintFromState();
  });
}

function bindMain() {
  els.navTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    showScreen(b.dataset.tab);
  });
  bindShellLayout();

  els.missBtn.addEventListener('click', sendMiss);
  if (els.shareMissBtn) els.shareMissBtn.addEventListener('click', shareMissLink);
  if (els.vibePingBtn) els.vibePingBtn.addEventListener('click', () => {
    emitEvent('vibe_ping', { mood: state.mood });
    pulse(`${state.auth.name} sent a vibe ping`);
    maybeVibrate([18]);
    maybeBeep();
  });

  els.closeSignalBtn.addEventListener('click', () => els.signalOverlay.classList.add('hidden'));

  if (els.moodSlider) els.moodSlider.addEventListener('input', saveMoodFromUI);
  els.savePromptBtn.addEventListener('click', saveDailyPrompt);

  if (els.addSongBtn && els.songTitle && els.songUrl) {
    els.addSongBtn.addEventListener('click', () => {
      const title = els.songTitle.value.trim();
      const url = els.songUrl.value.trim();
      if (!title) return;
      state.songs.unshift({ id: uid(), title, url, at: Date.now() });
      els.songTitle.value = '';
      els.songUrl.value = '';
      state.metrics.saves += 1;
      saveState();
      renderSongs();
      emitEvent('song_add', { title });
    });
  }

  els.addGoalBtn.addEventListener('click', () => {
    const text = els.goalText.value.trim();
    if (!text) return;
    state.goals.unshift({ id: uid(), text, date: els.goalDate.value || '', done: false });
    els.goalText.value = '';
    els.goalDate.value = '';
    state.metrics.saves += 1;
    saveState();
    renderGoals();
    emitEvent('goal_add', { text });
  });

  els.addDateBtn.addEventListener('click', () => {
    const title = els.dateTitle.value.trim();
    const value = els.dateValue.value;
    if (!title || !value) return;
    state.dates.push({ id: uid(), title, date: value });
    els.dateTitle.value = '';
    els.dateValue.value = '';
    state.metrics.saves += 1;
    saveState();
    renderDates();
    emitEvent('date_add', { title });
  });

  if (els.addReminderBtn) {
    els.addReminderBtn.addEventListener('click', () => {
      if (!isFeatureEnabled('reminders')) return toast('Reminders are disabled by admin');
      const title = (els.reminderTitle.value || '').trim();
      const time = els.reminderTime.value;
      const repeat = els.reminderRepeat.value || 'none';
      if (!title || !time) return toast('Set reminder title and time');
      state.reminders.unshift({
        id: uid(),
        title,
        time,
        repeat,
        enabled: true,
        senderUid: syncRuntime.authUid || '',
        senderName: state.auth.name || 'Partner',
        lastFiredOn: '',
        lastDueOn: '',
        lastDoneOn: '',
        doneCount: 0,
        skipCount: 0,
        streak: 0,
        snoozedUntil: 0
      });
      state.reminders = state.reminders.slice(0, 80);
      els.reminderTitle.value = '';
      saveState();
      renderReminders();
      emitEvent('reminder_add', { title, time, repeat });
      toast('Reminder added');
    });
  }

  els.letterLockType.addEventListener('change', () => {
    if (els.letterLockType.value === 'mood') {
      els.letterLockValue.type = 'text';
      els.letterLockValue.placeholder = 'calm / low / balanced / high';
    } else {
      els.letterLockValue.type = 'datetime-local';
      els.letterLockValue.placeholder = '';
    }
  });
  els.letterLockType.dispatchEvent(new Event('change'));

  if (els.boldLetterBtn) els.boldLetterBtn.addEventListener('click', () => wrapLetterSelection('**'));
  if (els.italicLetterBtn) els.italicLetterBtn.addEventListener('click', () => wrapLetterSelection('*'));
  if (els.addLetterImageBtn && els.letterImageInput) {
    els.addLetterImageBtn.addEventListener('click', () => els.letterImageInput.click());
    els.letterImageInput.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        pendingLetterImageData = await compressImageFile(file);
        if (els.letterAttachStatus) els.letterAttachStatus.textContent = `Attached: ${file.name}`;
      } catch {
        toast('Could not attach image');
      } finally {
        els.letterImageInput.value = '';
      }
    });
  }

  els.addLetterBtn.addEventListener('click', () => {
    if (!isFeatureEnabled('letters')) return toast('Letters are disabled by admin');
    const title = els.letterTitle.value.trim();
    const body = els.letterBody.value.trim();
    if (!title || !body) return;
    state.letters.unshift({ id: uid(), title, body, imageData: pendingLetterImageData || '', lockType: els.letterLockType.value, lockValue: els.letterLockValue.value.trim(), opened: false, openedAt: 0 });
    els.letterTitle.value = '';
    els.letterBody.value = '';
    els.letterLockValue.value = '';
    pendingLetterImageData = '';
    if (els.letterAttachStatus) els.letterAttachStatus.textContent = 'No photo attached';
    state.metrics.saves += 1;
    saveState();
    renderLetters();
    emitEvent('letter_add', { title });
  });

  els.saveSettingsBtn.addEventListener('click', () => {
    state.settings.anniversary = els.annivInput.value;
    state.auth.partnerName = els.partnerNameInput.value.trim() || 'Partner';
    state.preferences.focusMode = els.focusToggle.checked;
    state.preferences.haptics = els.hapticToggle.checked;
    state.preferences.soundCue = els.soundToggle.checked;
    if (els.perfToggle) state.preferences.perfMode = !!els.perfToggle.checked;
    state.preferences.blur = Number(els.blurInput.value || 18);
    state.preferences.motion = Number(els.motionInput.value || 1);
    state.preferences.radius = Number(els.radiusInput.value || 24);
    state.preferences.scale = Number(els.scaleInput.value || 1);
    saveState();
    applyTheme();
    applyPreferences();
    paintHeader();
    renderHomeBits();
    emitEvent('settings_update', {});
  });

  if (els.chooseWallpaperBtn && els.wallpaperFileInput) {
    els.chooseWallpaperBtn.addEventListener('click', () => els.wallpaperFileInput.click());
    els.wallpaperFileInput.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return toast('Choose an image file');
      try {
        pendingWallpaperData = await compressImageFile(file);
        applyWallpaperPreview(pendingWallpaperData, Number(els.wallpaperBlurInput?.value || state.wallpaper.blur || 10), Number(els.wallpaperDimInput?.value || state.wallpaper.dim || 0.34));
        if (els.wallpaperStatus) els.wallpaperStatus.textContent = `Selected: ${file.name}`;
      } catch {
        toast('Could not load image');
      } finally {
        els.wallpaperFileInput.value = '';
      }
    });
  }

  if (els.removeWallpaperBtn) {
    els.removeWallpaperBtn.addEventListener('click', () => {
      pendingWallpaperData = '';
      state.wallpaper.imageData = '';
      saveState();
      applyWallpaperFromState();
      emitEvent('wallpaper_update', {});
      if (els.wallpaperStatus) els.wallpaperStatus.textContent = 'No custom wallpaper selected';
    });
  }

  if (els.applyWallpaperBtn) {
    els.applyWallpaperBtn.addEventListener('click', () => {
      if (pendingWallpaperData) state.wallpaper.imageData = pendingWallpaperData;
      state.wallpaper.blur = Number(els.wallpaperBlurInput?.value || state.wallpaper.blur || 10);
      state.wallpaper.dim = Number(els.wallpaperDimInput?.value || state.wallpaper.dim || 0.34);
      saveState();
      applyWallpaperFromState();
      emitEvent('wallpaper_update', {});
      if (els.wallpaperStatus) els.wallpaperStatus.textContent = state.wallpaper.imageData ? 'Wallpaper applied' : 'Gradient mode applied';
      toast('Shared wall applied');
    });
  }

  if (els.wallpaperBlurInput) {
    els.wallpaperBlurInput.addEventListener('input', () => {
      applyWallpaperPreview(pendingWallpaperData || state.wallpaper.imageData, Number(els.wallpaperBlurInput.value || 10), Number(els.wallpaperDimInput?.value || state.wallpaper.dim || 0.34));
    });
  }
  if (els.wallpaperDimInput) {
    els.wallpaperDimInput.addEventListener('input', () => {
      applyWallpaperPreview(pendingWallpaperData || state.wallpaper.imageData, Number(els.wallpaperBlurInput?.value || state.wallpaper.blur || 10), Number(els.wallpaperDimInput.value || 0.34));
    });
  }

  els.requestNotifBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) return toast('Notifications not supported');
    const p = await Notification.requestPermission();
    state.settings.notifications = p === 'granted';
    saveState(false);
    if (p === 'granted') await enableBackgroundAlerts();
    toast(`Notification: ${p}`);
  });

  els.adminOpenBtn.addEventListener('click', () => {
    if (els.adminCodeInput.value.trim() !== state.settings.adminCode) return toast('Invalid admin code');
    els.adminPanel.classList.remove('hidden');
    renderPulse();
    renderMonitoring();
    renderScoreBoard();
    renderDiagnostics();
    renderAdminLogs();
    renderSuperAdminOut();
  });

  els.genPairCodeBtn.addEventListener('click', () => {
    const v = els.newPairCode.value.trim().toUpperCase();
    state.auth.pairCode = v || `LOVE-${Math.floor(1000 + Math.random() * 9000)}`;
    saveState(false);
    toast(`Pair code: ${state.auth.pairCode}`);
  });

  els.saveAdminCodeBtn.addEventListener('click', () => {
    const v = els.newAdminCode.value.trim();
    if (!v) return;
    state.settings.adminCode = v;
    els.newAdminCode.value = '';
    saveState(false);
    toast('Admin code updated');
  });

  els.applyThemeBtn.addEventListener('click', () => {
    state.settings.themeOverride = els.themeOverride.value;
    applyTheme();
    saveState(false);
  });

  els.saveFirebaseBtn.addEventListener('click', () => {
    state.sync.firebaseConfig = els.firebaseConfigInput.value.trim();
    state.sync.enabled = true;
    saveState(false);
    toast('Realtime config saved');
  });

  els.connectRealtimeBtn.addEventListener('click', connectRealtime);
  if (els.forcePresenceBtn) els.forcePresenceBtn.addEventListener('click', () => {
    publishPresence();
    toast('Presence ping sent');
  });
  if (els.forcePublishStateBtn) els.forcePublishStateBtn.addEventListener('click', () => {
    publishState();
    toast('State published');
  });
  if (els.refreshDiagBtn) els.refreshDiagBtn.addEventListener('click', renderDiagnostics);
  if (els.copyDiagBtn) els.copyDiagBtn.addEventListener('click', async () => {
    const payload = buildDiagnostics();
    try {
      await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
      toast('Diagnostics copied');
    } catch {
      toast('Could not copy diagnostics');
    }
  });
  if (els.logFilterSelect) {
    els.logFilterSelect.addEventListener('change', () => {
      state.admin.logFilter = els.logFilterSelect.value || 'all';
      saveState(false);
      renderAdminLogs();
    });
  }
  if (els.clearLogsBtn) {
    els.clearLogsBtn.addEventListener('click', () => {
      state.admin.logs = [];
      saveState(false);
      renderAdminLogs();
    });
  }

  if (els.replayEventsBtn) els.replayEventsBtn.addEventListener('click', replayRecentEvents);
  if (els.viewDiffBtn) els.viewDiffBtn.addEventListener('click', viewSyncDiff);
  if (els.pushTestBtn) els.pushTestBtn.addEventListener('click', () => {
    pushDeviceAlert('Love Link Test', 'Admin push test');
    adminLog('system', 'Push test sent');
  });
  if (els.exportDataBtn) els.exportDataBtn.addEventListener('click', exportDataJson);
  if (els.importDataBtn && els.importDataInput) {
    els.importDataBtn.addEventListener('click', () => els.importDataInput.click());
    els.importDataInput.addEventListener('change', importDataJson);
  }
  bindFeatureFlagToggles();
  if (els.closeLetterViewBtn) els.closeLetterViewBtn.addEventListener('click', () => els.letterViewOverlay?.classList.add('hidden'));
  if (els.letterViewOverlay) {
    els.letterViewOverlay.addEventListener('click', (ev) => {
      if (ev.target === els.letterViewOverlay) els.letterViewOverlay.classList.add('hidden');
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      els.signalOverlay?.classList.add('hidden');
      els.letterViewOverlay?.classList.add('hidden');
    }
  });

  els.hardResetBtn.addEventListener('click', async () => {
    const phrase = (els.resetConfirmInput.value || '').trim();
    if (phrase !== 'RESET LOVE LINK') {
      toast('Type RESET LOVE LINK to unlock reset');
      return;
    }

    const first = confirm('Hard reset will wipe all Love Link data on this device. Continue?');
    if (!first) return;

    const second = confirm('Final confirmation: this action cannot be undone. Reset now?');
    if (!second) return;

    const cloud = confirm('Also wipe cloud data for this pair code on ALL devices?');
    if (!cloud) return;

    try {
      await wipeRemoteRoomData();
      disconnectRealtime();
      localStorage.removeItem(LS_KEY);
      sessionStorage.removeItem(TAB_KEY);
      location.reload();
    } catch (err) {
      toast(`Reset failed: ${String(err.message || err).slice(0, 90)}`);
    }
  });
  els.logoutBtn.addEventListener('click', () => {
    state.auth.loggedIn = false;
    disconnectRealtime();
    stopReminderEngine();
    saveState(false);
    paintFromState();
  });

  if (els.startGameBtn) els.startGameBtn.addEventListener('click', startMiniGame);
  if (els.pauseGameBtn) els.pauseGameBtn.addEventListener('click', togglePauseGame);
  bindGameInput();
}
function paintFromState() {
  if (!state.auth.loggedIn) {
    stopReminderEngine();
    els.authScreen.classList.remove('hidden');
    els.appRoot.classList.add('hidden');
    els.roleInput.value = state.auth.role || 'guy';
    els.nameInput.value = state.auth.name || '';
    els.pairCodeInput.value = state.auth.pairCode || '';
    return;
  }
  els.authScreen.classList.add('hidden');
  els.appRoot.classList.remove('hidden');
  els.adminPanel.classList.add('hidden');

  paintHeader();
  applyTheme();
  applyPreferences();
  applyFeatureFlags();

  els.annivInput.value = state.settings.anniversary || '';
  els.partnerNameInput.value = state.auth.partnerName || '';
  els.dailyPrompt.value = state.dailyNote || '';
  if (els.moodSlider) els.moodSlider.value = String(normalizeMoodValue(state.mood?.value ?? state.mood?.energy ?? 55));
  els.themeOverride.value = state.settings.themeOverride || 'auto';
  els.focusToggle.checked = !!state.preferences.focusMode;
  els.hapticToggle.checked = !!state.preferences.haptics;
  els.soundToggle.checked = !!state.preferences.soundCue;
  if (els.perfToggle) els.perfToggle.checked = !!state.preferences.perfMode;
  els.blurInput.value = String(state.preferences.blur || 18);
  els.motionInput.value = String(state.preferences.motion ?? 1);
  els.radiusInput.value = String(state.preferences.radius || 24);
  els.scaleInput.value = String(state.preferences.scale || 1);
  els.firebaseConfigInput.value = state.sync.firebaseConfig || JSON.stringify(FIREBASE_DEFAULT_CONFIG, null, 2);
  if (els.wallpaperBlurInput) els.wallpaperBlurInput.value = String(state.wallpaper?.blur ?? 10);
  if (els.wallpaperDimInput) els.wallpaperDimInput.value = String(state.wallpaper?.dim ?? 0.34);
  if (els.wallpaperStatus) els.wallpaperStatus.textContent = state.wallpaper?.imageData ? 'Custom wallpaper active' : 'No custom wallpaper selected';
  if (els.letterAttachStatus) els.letterAttachStatus.textContent = 'No photo attached';
  if (els.flagRemindersToggle) els.flagRemindersToggle.checked = isFeatureEnabled('reminders');
  if (els.flagLettersToggle) els.flagLettersToggle.checked = isFeatureEnabled('letters');
  if (els.flagGameToggle) els.flagGameToggle.checked = isFeatureEnabled('game');
  if (els.flagWallToggle) els.flagWallToggle.checked = isFeatureEnabled('wall');
  if (els.reminderTime && !els.reminderTime.value) {
    const now = new Date();
    els.reminderTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  renderHomeBits();
  renderSongs();
  renderGoals();
  renderDates();
  renderReminders();
  renderLetters();
  renderPulse();
  renderMonitoring();
  renderScoreBoard();
  renderSuperAdminOut();
  updateSyncUI();
  showScreen(activeScreen);
  setDrawerOpen(drawerOpen, true);
  applyWallpaperFromState();
  startReminderEngine();
}

function paintHeader() {
  const n = state.auth.name || 'You';
  const p = syncRuntime.partnerLiveName || state.auth.partnerName || 'Partner';
  els.brandTitle.textContent = `${n} + ${p}`;
  els.partnerAvatar.textContent = p[0]?.toUpperCase() || 'P';
  updatePresenceUI();
}

function showScreen(tab) {
  activeScreen = tab;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === tab));
  els.navTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  closeMenu(true);
}

function bindShellLayout() {
  if (els.menuBtn && els.menuCloseBtn && els.menuBackdrop && els.sideMenu) {
    els.menuBtn.addEventListener('click', openMenu);
    els.menuCloseBtn.addEventListener('click', () => closeMenu());
    els.menuBackdrop.addEventListener('click', () => closeMenu());
  }

  if (els.drawerToggleBtn) els.drawerToggleBtn.addEventListener('click', () => setDrawerOpen(!drawerOpen));
  if (!els.homeDrawerHandle || !els.homeDrawer) return;

  setDrawerOpen(false, true);
  let dragStartY = 0;
  let dragLastY = 0;
  let dragStartTs = 0;
  let dragging = false;
  let baseOpen = false;

  const shouldIgnoreDrag = (ev) => !!ev.target.closest('input, textarea, select, button, a');

  const onPointerMove = (ev) => {
    if (!dragging) return;
    const currentY = ev.clientY ?? (ev.touches?.[0]?.clientY ?? dragLastY);
    dragLastY = currentY;
    const dy = currentY - dragStartY;
    const maxPull = 120;
    let visual = 0;
    if (baseOpen) {
      visual = dy > 0 ? Math.min(dy * 0.55, maxPull) : dy * 0.15;
    } else {
      visual = dy < 0 ? Math.max(dy * 0.55, -maxPull) : dy * 0.15;
    }
    els.homeDrawer.style.transform = `translateY(${visual}px)`;
  };

  const onPointerUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    els.homeDrawer.classList.remove('dragging');
    els.homeDrawerHandle.classList.remove('dragging');
    els.homeDrawer.style.transform = '';
    const endY = ev.clientY ?? (ev.changedTouches?.[0]?.clientY ?? dragLastY);
    const dy = endY - dragStartY;
    const dt = Math.max(0.01, (performance.now() - dragStartTs) / 1000);
    const velocity = dy / dt;
    if (baseOpen) {
      if (dy > 42 || velocity > 420) setDrawerOpen(false);
      else setDrawerOpen(true);
    } else {
      if (dy < -42 || velocity < -420) setDrawerOpen(true);
      else setDrawerOpen(false);
    }
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  const beginDrag = (ev) => {
    if (shouldIgnoreDrag(ev)) return;
    dragStartY = ev.clientY ?? 0;
    dragLastY = dragStartY;
    dragStartTs = performance.now();
    dragging = true;
    baseOpen = drawerOpen;
    els.homeDrawer.classList.add('dragging');
    els.homeDrawerHandle.classList.add('dragging');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    ev.preventDefault();
  };

  els.homeDrawerHandle.addEventListener('pointerdown', beginDrag);
  els.homeDrawer.addEventListener('pointerdown', beginDrag);
}

function setDrawerOpen(open, immediate = false) {
  drawerOpen = !!open;
  if (!els.homeDrawer || !els.drawerToggleBtn) return;
  els.homeDrawer.classList.toggle('open', drawerOpen);
  els.homeDrawer.classList.toggle('closed', !drawerOpen);
  els.drawerToggleBtn.classList.toggle('open', drawerOpen);
  els.drawerToggleBtn.textContent = drawerOpen ? '⌃' : '⌄';
  if (!immediate) maybeVibrate([10]);
}

function openMenu() {
  if (!els.sideMenu || !els.menuBackdrop || menuAnimating) return;
  menuAnimating = true;
  els.sideMenu.classList.remove('hidden');
  els.menuBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    els.sideMenu.classList.add('open');
    els.menuBackdrop.classList.add('open');
    document.body.classList.add('menu-open');
    menuAnimating = false;
  });
}

function closeMenu(immediate = false) {
  if (!els.sideMenu || !els.menuBackdrop || menuAnimating) return;
  menuAnimating = true;
  els.sideMenu.classList.remove('open');
  els.menuBackdrop.classList.remove('open');
  document.body.classList.remove('menu-open');
  const done = () => {
    els.sideMenu.classList.add('hidden');
    els.menuBackdrop.classList.add('hidden');
    menuAnimating = false;
  };
  if (immediate) done();
  else setTimeout(done, 180);
}

function detectAutoPerf() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const mem = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  return !!reduced || (mem && mem <= 4) || (cores && cores <= 4);
}

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  const smallScreen = Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 820;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || smallScreen;
}

function isPerfMode() {
  return !!state.preferences.perfMode || detectAutoPerf() || isMobileDevice();
}

function setMotionEnabled(enabled) {
  motionRuntime.enabled = !!enabled;
  if (motionRuntime.enabled) motionRuntime.start?.();
}

function applyPreferences() {
  const perf = isPerfMode();
  document.body.classList.toggle('focus', !!state.preferences.focusMode);
  document.body.classList.toggle('perf', perf);
  document.body.classList.toggle('mobile', isMobileDevice());
  const blur = perf ? Math.min(state.preferences.blur || 18, 10) : (state.preferences.blur || 18);
  const motion = perf ? Math.min(state.preferences.motion ?? 1, 0.6) : (state.preferences.motion ?? 1);
  document.documentElement.style.setProperty('--blur', `${blur}px`);
  document.documentElement.style.setProperty('--motion', String(motion));
  document.documentElement.style.setProperty('--radius', `${state.preferences.radius || 24}px`);
  document.documentElement.style.setProperty('--scale', String(state.preferences.scale ?? 1));
  setMotionEnabled(!perf);
}

function applyWallpaperPreview(imageData, blur, dim) {
  if (!els.wallpaperLayer) return;
  const perf = isPerfMode();
  const b = Math.max(0, Math.min(perf ? 8 : 24, Number(blur || 0)));
  const d = Math.max(0, Math.min(0.8, Number(dim || 0)));
  els.wallpaperLayer.style.setProperty('--wall-blur', `${b}px`);
  els.wallpaperLayer.style.setProperty('--wall-dim', String(d));
  els.wallpaperLayer.style.backgroundImage = imageData
    ? `linear-gradient(rgba(4,10,20,${d}), rgba(4,10,20,${d})), url("${imageData}")`
    : `radial-gradient(900px 460px at 10% 10%, rgba(113,184,255,0.25), transparent 55%), radial-gradient(900px 460px at 90% 90%, rgba(255,158,199,0.22), transparent 60%), linear-gradient(160deg, rgba(10,24,50,0.35), rgba(10,18,38,0.3))`;
}

function applyWallpaperFromState() {
  applyWallpaperPreview(state.wallpaper?.imageData || '', state.wallpaper?.blur ?? 10, state.wallpaper?.dim ?? 0.34);
  document.body.classList.toggle('has-wallpaper', !!state.wallpaper?.imageData);
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image decode failed'));
      img.onload = () => {
        const maxSide = 1280;
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.74));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function applyTheme() {
  const role = (state.settings.themeOverride && state.settings.themeOverride !== 'auto') ? state.settings.themeOverride : state.auth.role;
  document.body.classList.toggle('role-girl', role === 'girl');
  document.body.classList.toggle('role-guy', role !== 'girl');
  if (role === 'girl') {
    setVars({ '--bg1': '#230d19', '--bg2': '#41172d', '--glass': 'rgba(77, 31, 53, .50)', '--accent': '#ff97c5', '--accent2': '#ffd7e9', '--muted': '#ffd7e8', '--glow': 'rgba(255, 151, 197, .58)' });
  } else {
    setVars({ '--bg1': '#060d1f', '--bg2': '#10274d', '--glass': 'rgba(18, 34, 62, .48)', '--accent': '#61b2ff', '--accent2': '#9bd8ff', '--muted': '#a6bbdd', '--glow': 'rgba(97, 178, 255, .55)' });
  }
}

function setVars(vars) { Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)); }

function normalizeMoodValue(v) {
  return Math.max(0, Math.min(100, Number(v || 0)));
}

function moodProfile(m) {
  const value = normalizeMoodValue(m?.value ?? m?.energy ?? 55);
  if (value <= 20) return { value, label: 'Tired', text: 'Low battery mode. Gentle day.', ring: '#ffbc8f' };
  if (value <= 40) return { value, label: 'Calm', text: 'Quiet and steady vibes.', ring: '#ffd79a' };
  if (value <= 60) return { value, label: 'Balanced', text: 'Balanced and warm.', ring: '#7fd7c0' };
  if (value <= 80) return { value, label: 'Happy', text: 'Good energy and affectionate.', ring: '#7dc4ff' };
  return { value, label: 'Excited', text: 'High energy and playful mood.', ring: '#b7a8ff' };
}

function saveMoodFromUI() {
  const value = normalizeMoodValue(els.moodSlider?.value || 55);
  state.mood = { value };
  saveState();
  renderMood();
  emitEvent('mood_update', { mood: state.mood });
}

function renderMood() {
  const m = moodProfile(state.mood);
  if (els.moodSlider && document.activeElement !== els.moodSlider) els.moodSlider.value = String(m.value);
  els.moodLabel.textContent = m.label;
  els.moodText.textContent = m.text;
  if (els.homeMoodState) els.homeMoodState.textContent = m.label;
  els.partnerRing.style.background = `conic-gradient(from 0deg, ${m.ring}, var(--accent), ${m.ring})`;
  document.documentElement.style.setProperty('--glow', `${m.ring}99`);
}

function sendMiss() {
  const now = new Date();
  state.missLog.unshift(now.toISOString());
  state.missLog = state.missLog.slice(0, 60);
  state.metrics.misses += 1;
  saveState();
  els.missStatus.textContent = `Signal sent at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  pulse(`${state.auth.name} sent a miss signal`);
  emitEvent('miss_signal', { at: now.toISOString() });

  maybeVibrate([24, 42, 24]);
  maybeBeep();
}

function shareMissLink() {
  const from = encodeURIComponent(state.auth.name || 'Someone');
  const code = encodeURIComponent(state.auth.pairCode || 'LOVE');
  const ts = Date.now();
  const url = `${location.origin}${location.pathname}?miss=1&from=${from}&code=${code}&ts=${ts}`;
  if (navigator.share) navigator.share({ title: 'Love Link Signal', text: `${state.auth.name} misses you`, url }).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast('Signal link copied')).catch(() => alert(url));
}

function handleMissQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get('miss') !== '1') return;
  const from = q.get('from') || 'Your person';
  const ts = Number(q.get('ts') || Date.now());
  els.missStatus.textContent = `${from} sent a signal (${new Date(ts).toLocaleString()})`;
  showSignalOverlay(`${from} misses you`, 'Shared link signal');
  pushDeviceAlert(`${from} misses you`, 'Shared signal');
  maybeBeep();
  history.replaceState({}, '', `${location.origin}${location.pathname}`);
}

function saveDailyPrompt() {
  state.dailyNote = els.dailyPrompt.value.trim();
  state.metrics.saves += 1;
  saveState();
  emitEvent('note_update', { note: state.dailyNote.slice(0, 40) });
  els.promptSaved.textContent = 'Saved';
  if (els.homeNoteState) els.homeNoteState.textContent = state.dailyNote ? 'Saved' : 'Not saved';
  setTimeout(() => { els.promptSaved.textContent = ''; }, 1200);
}

function renderHomeBits() {
  const anniv = state.settings.anniversary ? new Date(state.settings.anniversary) : null;
  if (anniv && !Number.isNaN(anniv.getTime())) {
    const days = Math.max(0, Math.floor((Date.now() - anniv.getTime()) / 86400000));
    els.daysTogether.textContent = String(days);
    els.sinceText.textContent = `Since ${anniv.toLocaleDateString()}`;
  } else {
    els.daysTogether.textContent = '0';
    els.sinceText.textContent = 'Set anniversary in Settings';
  }
  if (els.homeNoteState) els.homeNoteState.textContent = state.dailyNote ? 'Saved' : 'Not saved';
  renderMood();
  updatePresenceUI();
}

function updatePresenceUI() {
  const partnerName = syncRuntime.partnerLiveName || state.auth.partnerName || 'Partner';
  const online = !!syncRuntime.partnerOnline;
  const lastSeen = syncRuntime.partnerLastSeenTs ? new Date(syncRuntime.partnerLastSeenTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'never';
  if (els.partnerNameInput && document.activeElement !== els.partnerNameInput) els.partnerNameInput.value = partnerName;
  if (els.presenceStatus) {
    els.presenceStatus.textContent = online ? `${partnerName} online` : `${partnerName} last seen ${lastSeen}`;
    els.presenceStatus.classList.toggle('online', online);
  }
  if (els.homePartnerState) {
    els.homePartnerState.textContent = online ? `Online now` : `Last seen ${lastSeen}`;
  }
}

function isFeatureEnabled(key) {
  return state.settings?.featureFlags?.[key] !== false;
}

function applyFeatureFlags() {
  if (els.flagRemindersToggle) els.flagRemindersToggle.checked = isFeatureEnabled('reminders');
  if (els.flagLettersToggle) els.flagLettersToggle.checked = isFeatureEnabled('letters');
  if (els.flagGameToggle) els.flagGameToggle.checked = isFeatureEnabled('game');
  if (els.flagWallToggle) els.flagWallToggle.checked = isFeatureEnabled('wall');
  const map = {
    reminders: 'reminders',
    letters: 'letters',
    game: 'game'
  };
  for (const [key, tab] of Object.entries(map)) {
    const btn = els.navTabs?.querySelector(`button[data-tab="${tab}"]`);
    if (!btn) continue;
    btn.style.display = isFeatureEnabled(key) ? '' : 'none';
  }
  if ((!isFeatureEnabled('reminders') && activeScreen === 'reminders') ||
      (!isFeatureEnabled('letters') && activeScreen === 'letters') ||
      (!isFeatureEnabled('game') && activeScreen === 'game')) {
    showScreen('home');
  }
  if (!isFeatureEnabled('wall')) {
    state.wallpaper.imageData = '';
    applyWallpaperFromState();
  }
}

function bindFeatureFlagToggles() {
  const pairs = [
    ['reminders', els.flagRemindersToggle],
    ['letters', els.flagLettersToggle],
    ['game', els.flagGameToggle],
    ['wall', els.flagWallToggle]
  ];
  for (const [key, el] of pairs) {
    if (!el) continue;
    el.checked = isFeatureEnabled(key);
    el.addEventListener('change', () => {
      state.settings.featureFlags[key] = !!el.checked;
      saveState();
      applyFeatureFlags();
      renderSuperAdminOut();
      emitEvent('feature_flag_update', { key, value: !!el.checked });
      adminLog('system', `Feature flag ${key} -> ${el.checked ? 'on' : 'off'}`);
    });
  }
}

function renderSuperAdminOut() {
  if (!els.superAdminOut) return;
  els.superAdminOut.innerHTML = '';
  const flags = state.settings.featureFlags || {};
  const lastEvent = Number(state.sync?.lastEventAt || 0);
  const logCount = Number(state.admin?.logs?.length || 0);
  const rows = [
    `Reminders: ${flags.reminders ? 'enabled' : 'disabled'}`,
    `Letters: ${flags.letters ? 'enabled' : 'disabled'}`,
    `Game: ${flags.game ? 'enabled' : 'disabled'}`,
    `Wall: ${flags.wall ? 'enabled' : 'disabled'}`,
    `State snapshot: goals ${state.goals.length}, reminders ${state.reminders.length}, letters ${state.letters.length}, dates ${state.dates.length}`,
    `Last remote event: ${lastEvent ? new Date(lastEvent).toLocaleString() : 'none'}`,
    `Admin logs stored: ${logCount}`
  ];
  rows.forEach((txt) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = txt;
    els.superAdminOut.appendChild(row);
  });
}

function wrapLetterSelection(mark) {
  if (!els.letterBody) return;
  const ta = els.letterBody;
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  const selected = ta.value.slice(start, end) || 'text';
  ta.value = ta.value.slice(0, start) + `${mark}${selected}${mark}` + ta.value.slice(end);
  ta.focus();
  ta.selectionStart = start + mark.length;
  ta.selectionEnd = start + mark.length + selected.length;
}
function renderSongs() {
  if (!els.songsList) return;
  els.songsList.innerHTML = '';
  state.songs.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>${escapeHtml(s.title)}</span><span>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">Open</a>` : ''} <button data-del="${s.id}" class="btn ghost">X</button></span>`;
    els.songsList.appendChild(row);
  });
  bindDelete(els.songsList, state.songs, renderSongs, 'song_delete');
}

function renderGoals() {
  els.goalsList.innerHTML = '';
  state.goals.forEach((g) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span><input type="checkbox" data-tick="${g.id}" ${g.done ? 'checked' : ''}/> ${escapeHtml(g.text)} ${g.date ? `(${g.date})` : ''}</span><button data-del="${g.id}" class="btn ghost">X</button>`;
    els.goalsList.appendChild(row);
  });
  els.goalsList.querySelectorAll('input[data-tick]').forEach((el) => el.addEventListener('change', (ev) => {
    const g = state.goals.find((x) => x.id === ev.target.dataset.tick);
    if (!g) return;
    g.done = ev.target.checked;
    saveState();
    emitEvent('goal_toggle', { id: g.id, done: g.done });
  }));
  bindDelete(els.goalsList, state.goals, renderGoals, 'goal_delete');
}

function renderDates() {
  els.datesList.innerHTML = '';
  state.dates.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((d) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>${escapeHtml(d.title)} - ${d.date}</span><button data-del="${d.id}" class="btn ghost">X</button>`;
    els.datesList.appendChild(row);
  });
  bindDelete(els.datesList, state.dates, renderDates, 'date_delete');
  renderCalendar();
  renderHomeBits();
}

function renderReminders() {
  if (!els.remindersList) return;
  if (!isFeatureEnabled('reminders')) {
    if (els.reminderStats) els.reminderStats.innerHTML = '';
    els.remindersList.innerHTML = '<div class="pill">Reminders disabled by admin</div>';
    return;
  }
  els.remindersList.innerHTML = '';
  const myUid = syncRuntime.authUid || '';
  const mySet = state.reminders.filter((r) => !r.senderUid || r.senderUid === myUid);
  const partnerSet = state.reminders.filter((r) => r.senderUid && r.senderUid !== myUid);
  if (els.reminderStats) {
    const myDone = mySet.reduce((a, r) => a + Number(r.doneCount || 0), 0);
    const partnerDone = partnerSet.reduce((a, r) => a + Number(r.doneCount || 0), 0);
    const bestStreak = state.reminders.reduce((a, r) => Math.max(a, Number(r.streak || 0)), 0);
    els.reminderStats.innerHTML = `
      <div class="pill"><span>Your Done</span><strong>${myDone}</strong></div>
      <div class="pill"><span>Partner Done</span><strong>${partnerDone}</strong></div>
      <div class="pill"><span>Best Streak</span><strong>${bestStreak}</strong></div>
    `;
  }
  state.reminders
    .slice()
    .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
    .forEach((r) => {
      const row = document.createElement('div');
      row.className = 'reminder-row';
      const nextInfo = r.snoozedUntil && r.snoozedUntil > Date.now() ? `Snoozed until ${new Date(r.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : reminderRepeatLabel(r.repeat);
      row.innerHTML = `
        <div class="reminder-main">
          <div class="reminder-time">${escapeHtml(formatReminderTime(r.time || '00:00'))}</div>
          <div class="reminder-meta">
            <strong>${escapeHtml(r.title)}</strong>
            <small>${escapeHtml(nextInfo)}</small>
            <small>Streak ${Number(r.streak || 0)} | Done ${Number(r.doneCount || 0)} | Skip ${Number(r.skipCount || 0)}</small>
          </div>
        </div>
        <div class="reminder-actions">
          <button data-rem-done="${r.id}" class="btn ghost">Done</button>
          <button data-rem-snooze="${r.id}" class="btn ghost">+10m</button>
          <button data-rem-skip="${r.id}" class="btn ghost">Skip</button>
          <label class="ios-toggle mini"><input data-rem-toggle="${r.id}" type="checkbox" ${r.enabled ? 'checked' : ''} /><span></span></label>
          <button data-rem-del="${r.id}" class="btn ghost">X</button>
        </div>
      `;
      els.remindersList.appendChild(row);
    });

  els.remindersList.querySelectorAll('input[data-rem-toggle]').forEach((el) => el.addEventListener('change', (ev) => {
    const id = ev.target.dataset.remToggle;
    const r = state.reminders.find((x) => x.id === id);
    if (!r) return;
    r.enabled = ev.target.checked;
    saveState();
    emitEvent('reminder_toggle', { id, enabled: r.enabled });
  }));

  els.remindersList.querySelectorAll('button[data-rem-del]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.remDel;
    const idx = state.reminders.findIndex((x) => x.id === id);
    if (idx === -1) return;
    state.reminders.splice(idx, 1);
    saveState();
    renderReminders();
    emitEvent('reminder_delete', { id });
  }));
  els.remindersList.querySelectorAll('button[data-rem-done]').forEach((btn) => btn.addEventListener('click', () => markReminderDone(btn.dataset.remDone)));
  els.remindersList.querySelectorAll('button[data-rem-skip]').forEach((btn) => btn.addEventListener('click', () => markReminderSkip(btn.dataset.remSkip)));
  els.remindersList.querySelectorAll('button[data-rem-snooze]').forEach((btn) => btn.addEventListener('click', () => markReminderSnooze(btn.dataset.remSnooze, 10)));
}

function reminderRepeatLabel(repeat) {
  if (repeat === 'daily') return 'Every Day';
  if (repeat === 'weekdays') return 'Weekdays';
  if (repeat === 'weekends') return 'Weekends';
  return 'Once';
}

function formatReminderTime(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map((v) => Number(v || 0));
  const dt = new Date();
  dt.setHours(h, m, 0, 0);
  return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isConsecutiveDay(prevDay, nextDay) {
  const a = new Date(prevDay + 'T00:00:00').getTime();
  const b = new Date(nextDay + 'T00:00:00').getTime();
  return b - a === 86400000;
}

function markReminderDone(id) {
  const r = state.reminders.find((x) => x.id === id);
  if (!r) return;
  const today = new Date();
  const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (r.lastDoneOn && r.lastDoneOn !== dayKey) {
    r.streak = isConsecutiveDay(r.lastDoneOn, dayKey) ? Number(r.streak || 0) + 1 : 1;
  } else if (!r.lastDoneOn) {
    r.streak = 1;
  }
  if (r.lastDoneOn !== dayKey) r.doneCount = Number(r.doneCount || 0) + 1;
  r.lastDoneOn = dayKey;
  r.lastFiredOn = dayKey;
  r.snoozedUntil = 0;
  if (r.repeat === 'none') r.enabled = false;
  saveState();
  renderReminders();
  emitEvent('reminder_done', { id, dayKey, streak: r.streak, doneCount: r.doneCount });
}

function markReminderSkip(id) {
  const r = state.reminders.find((x) => x.id === id);
  if (!r) return;
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  r.skipCount = Number(r.skipCount || 0) + 1;
  r.streak = 0;
  r.lastFiredOn = dayKey;
  r.snoozedUntil = 0;
  if (r.repeat === 'none') r.enabled = false;
  saveState();
  renderReminders();
  emitEvent('reminder_skip', { id, dayKey, skipCount: r.skipCount });
}

function markReminderSnooze(id, mins = 10) {
  const r = state.reminders.find((x) => x.id === id);
  if (!r) return;
  r.snoozedUntil = Date.now() + Math.max(1, mins) * 60000;
  saveState();
  renderReminders();
  emitEvent('reminder_snooze', { id, until: r.snoozedUntil });
}

function startReminderEngine() {
  stopReminderEngine();
  reminderTimer = setInterval(checkRemindersDue, 30000);
  checkRemindersDue();
}

function stopReminderEngine() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = 0;
}

function reminderAppliesToday(reminder, now) {
  const day = now.getDay(); // 0 sun ... 6 sat
  if (reminder.repeat === 'weekdays') return day >= 1 && day <= 5;
  if (reminder.repeat === 'weekends') return day === 0 || day === 6;
  return true;
}

function checkRemindersDue() {
  if (!isFeatureEnabled('reminders')) return;
  if (!state.auth.loggedIn) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const nowKey = `${hh}:${mm}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let changed = false;

  for (const r of state.reminders) {
    if (!r.enabled || !r.time) continue;
    if (!reminderAppliesToday(r, now)) continue;
    const dueByTime = r.time === nowKey;
    const dueBySnooze = Number(r.snoozedUntil || 0) > 0 && Date.now() >= Number(r.snoozedUntil || 0);
    if (!dueByTime && !dueBySnooze) continue;
    if (r.lastFiredOn === todayKey) continue;

    const isOwn = (r.senderUid && r.senderUid === syncRuntime.authUid) || (r.senderName && r.senderName === state.auth.name);
    if (!isOwn) {
      showSignalOverlay(`Reminder: ${r.title}`, `Scheduled for ${formatReminderTime(r.time)}`);
      pushDeviceAlert(`Reminder: ${r.title}`, `From ${r.senderName || 'your partner'} at ${formatReminderTime(r.time)}`);
      maybeVibrate([25, 45, 25]);
    }

    r.lastFiredOn = todayKey;
    if (dueBySnooze) r.snoozedUntil = 0;
    changed = true;
  }

  if (changed) {
    saveState();
    renderReminders();
  }
}

function renderLetters() {
  if (!isFeatureEnabled('letters')) {
    els.lettersList.innerHTML = '<div class="pill">Letters disabled by admin</div>';
    return;
  }
  els.lettersList.innerHTML = '';
  state.letters.forEach((l) => {
    const unlocked = isLetterUnlocked(l);
    const lockInfo = l.lockType === 'time' ? `Unlock at ${l.lockValue || 'not set'}` : `Unlock when mood is ${l.lockValue || 'calm'}`;
    const receipt = l.openedAt ? `Opened ${new Date(l.openedAt).toLocaleString()}` : 'Unopened';
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>${escapeHtml(l.title)}<br><small>${lockInfo}</small><br><small>${receipt}</small></span><span>${unlocked ? `<button data-open="${l.id}" class="btn primary">Open</button>` : '<small>Locked</small>'} <button data-del="${l.id}" class="btn ghost">X</button></span>`;
    els.lettersList.appendChild(row);
  });
  els.lettersList.querySelectorAll('button[data-open]').forEach((b) => b.addEventListener('click', (ev) => {
    const l = state.letters.find((x) => x.id === ev.target.dataset.open);
    if (!l) return;
    openLetterView(l);
    l.opened = true;
    l.openedAt = l.openedAt || Date.now();
    saveState(false);
    emitEvent('letter_open', { id: l.id, openedAt: l.openedAt });
  }));
  bindDelete(els.lettersList, state.letters, renderLetters, 'letter_delete', 'Delete this letter?');
}

function formatLetterBody(text) {
  const src = escapeHtml(text || '');
  return src
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function openLetterView(letter) {
  if (!els.letterViewOverlay) return;
  els.letterViewTitle.textContent = letter.title || 'Letter';
  els.letterViewReceipt.textContent = letter.openedAt ? `Opened at ${new Date(letter.openedAt).toLocaleString()}` : 'First open';
  els.letterViewBody.innerHTML = formatLetterBody(letter.body || '');
  els.letterViewMedia.innerHTML = letter.imageData ? `<img src="${letter.imageData}" alt="Letter attachment" />` : '';
  els.letterViewOverlay.classList.remove('hidden');
}

function isLetterUnlocked(letter) {
  if (letter.lockType === 'time') return letter.lockValue ? Date.now() >= new Date(letter.lockValue).getTime() : false;
  const mood = moodProfile(state.mood).label.toLowerCase();
  const gate = (letter.lockValue || '').toLowerCase();
  if (!gate) return false;
  if (gate.includes('calm') || gate.includes('low')) return mood === 'tired' || mood === 'calm';
  if (gate.includes('high') || gate.includes('spark')) return mood === 'happy' || mood === 'excited';
  return mood === gate;
}

function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const total = last.getDate();
  const startPad = (first.getDay() + 6) % 7;
  els.calendarTitle.textContent = now.toLocaleString([], { month: 'long', year: 'numeric' });
  const eventsSet = new Set(state.dates.filter((d) => {
    const dt = new Date(d.date);
    return dt.getFullYear() === y && dt.getMonth() === m;
  }).map((d) => new Date(d.date).getDate()));
  els.calendarGrid.innerHTML = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => `<div class="day"><strong>${d}</strong></div>`).join('');
  for (let i = 0; i < startPad; i++) els.calendarGrid.insertAdjacentHTML('beforeend', '<div class="day" aria-hidden="true"></div>');
  for (let d = 1; d <= total; d++) {
    const cls = ['day'];
    if (eventsSet.has(d)) cls.push('event');
    if (d === now.getDate()) cls.push('today');
    els.calendarGrid.insertAdjacentHTML('beforeend', `<div class="${cls.join(' ')}">${d}</div>`);
  }
}

function renderPulse() {
  els.pulseList.innerHTML = '';
  state.pulse.slice(0, 12).forEach((p) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>${escapeHtml(p.text)}</span><small>${new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
    els.pulseList.appendChild(row);
  });
}

function renderMonitoring() {
  els.monitorList.innerHTML = '';
  const latestMiss = state.missLog[0] ? new Date(state.missLog[0]).toLocaleString() : 'None yet';
  const items = [
    `App opens: ${state.metrics.opens}`,
    `Miss signals: ${state.metrics.misses}`,
    `Content saves: ${state.metrics.saves}`,
    `Latest miss: ${latestMiss}`,
    `Pair code: ${state.auth.pairCode || '-'}`,
    `Realtime: ${syncRuntime.connected ? 'connected' : 'offline'}`,
    `UID: ${syncRuntime.authUid || 'n/a'}`,
    `Partner status: ${syncRuntime.partnerOnline ? 'online' : 'offline'}`
  ];
  items.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = t;
    els.monitorList.appendChild(row);
  });
  renderDiagnostics();
  renderAdminLogs();
}

function buildDiagnostics() {
  const room = (state.auth.pairCode || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    now: new Date().toISOString(),
    appVersion: APP_VERSION,
    auth: {
      uid: syncRuntime.authUid || '',
      name: state.auth.name || '',
      partnerName: state.auth.partnerName || ''
    },
    sync: {
      connected: !!syncRuntime.connected,
      room,
      lastEventAt: Number(state.sync.lastEventAt || 0),
      seenEvents: Number(syncRuntime.seenEventIds?.size || 0),
      heartbeatActive: !!syncRuntime.heartbeatTimer
    },
    presence: {
      partnerOnline: !!syncRuntime.partnerOnline,
      partnerLastSeenTs: Number(syncRuntime.partnerLastSeenTs || 0),
      partnerLiveName: syncRuntime.partnerLiveName || ''
    },
    stats: {
      opens: Number(state.metrics.opens || 0),
      misses: Number(state.metrics.misses || 0),
      saves: Number(state.metrics.saves || 0),
      reminders: Number(state.reminders?.length || 0),
      goals: Number(state.goals?.length || 0),
      letters: Number(state.letters?.length || 0),
      flags: structuredClone(state.settings?.featureFlags || {})
    }
  };
}

function renderDiagnostics() {
  if (!els.diagList) return;
  const d = buildDiagnostics();
  els.diagList.innerHTML = '';
  const lines = [
    `Version: ${d.appVersion}`,
    `Room: ${d.sync.room || '-'}`,
    `Connected: ${d.sync.connected ? 'yes' : 'no'}`,
    `Partner: ${d.presence.partnerLiveName || state.auth.partnerName || 'Partner'} (${d.presence.partnerOnline ? 'online' : 'offline'})`,
    `Last seen ts: ${d.presence.partnerLastSeenTs || 0}`,
    `Seen events: ${d.sync.seenEvents}`,
    `Counts: reminders ${d.stats.reminders}, goals ${d.stats.goals}, letters ${d.stats.letters}`,
    `Flags: rem ${d.stats.flags.reminders ? 'on' : 'off'}, letters ${d.stats.flags.letters ? 'on' : 'off'}, game ${d.stats.flags.game ? 'on' : 'off'}, wall ${d.stats.flags.wall ? 'on' : 'off'}`
  ];
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = line;
    els.diagList.appendChild(row);
  }
}

function renderAdminLogs() {
  if (!els.adminLogsList) return;
  const filter = state.admin?.logFilter || 'all';
  if (els.logFilterSelect && els.logFilterSelect.value !== filter) els.logFilterSelect.value = filter;
  const logs = (state.admin?.logs || []).filter((l) => filter === 'all' || l.type === filter);
  els.adminLogsList.innerHTML = '';
  logs.slice(0, 120).forEach((l) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>[${escapeHtml(l.type)}] ${escapeHtml(l.msg)}</span><small>${new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;
    els.adminLogsList.appendChild(row);
  });
}

function adminLog(type, msg, data = null) {
  if (!state.admin) state.admin = { logs: [], logFilter: 'all' };
  state.admin.logs.unshift({
    id: uid(),
    ts: Date.now(),
    type: String(type || 'system'),
    msg: String(msg || ''),
    data: data || null
  });
  state.admin.logs = state.admin.logs.slice(0, 240);
  saveState(false);
  if (!els.adminPanel?.classList.contains('hidden')) renderAdminLogs();
}

async function replayRecentEvents() {
  if (!syncRuntime.connected || !syncRuntime.roomRef) return toast('Connect realtime first');
  try {
    const snap = await syncRuntime.roomRef.child('events').orderByChild('ts').limitToLast(30).get();
    const list = [];
    snap.forEach((child) => {
      const ev = child.val() || {};
      list.push({
        id: child.key,
        ts: Number(ev.ts || 0),
        type: ev.type || 'unknown',
        who: ev.senderName || 'Unknown'
      });
    });
    list.sort((a, b) => b.ts - a.ts).forEach((ev) => adminLog('event', `[Replay] ${ev.who}: ${ev.type} @ ${new Date(ev.ts).toLocaleTimeString()}`));
    toast(`Replayed ${list.length} events`);
  } catch (err) {
    toast(`Replay failed: ${String(err.message || err).slice(0, 80)}`);
  }
}

function buildSyncDiff() {
  const remote = syncRuntime.lastRemoteStateData || {};
  const local = {
    songs: state.songs,
    goals: state.goals,
    dates: state.dates,
    reminders: state.reminders,
    letters: state.letters,
    mood: state.mood,
    dailyNote: state.dailyNote,
    game: state.game
  };
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const diff = [];
  for (const k of keys) {
    const a = JSON.stringify(local[k] ?? null);
    const b = JSON.stringify(remote[k] ?? null);
    if (a !== b) diff.push({ key: k, localSize: a.length, remoteSize: b.length });
  }
  return diff;
}

function viewSyncDiff() {
  const diff = buildSyncDiff();
  if (!els.superAdminOut) return;
  els.superAdminOut.innerHTML = '';
  if (!diff.length) {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = 'No diff: local and last remote snapshot match';
    els.superAdminOut.appendChild(row);
    return;
  }
  diff.forEach((d) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = `${d.key}: local ${d.localSize} chars vs remote ${d.remoteSize} chars`;
    els.superAdminOut.appendChild(row);
  });
  adminLog('sync', `Sync diff viewed (${diff.length} keys differ)`);
}

function exportDataJson() {
  const payload = structuredClone(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `love-link-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  adminLog('system', 'Data exported');
}

async function importDataJson(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const merged = deepMerge(structuredClone(defaultState), data);
    Object.assign(state, merged);
    saveState();
    paintFromState();
    emitEvent('data_import', { by: state.auth.name || 'User' });
    adminLog('system', 'Data imported');
    toast('Data imported');
  } catch (err) {
    toast(`Import failed: ${String(err.message || err).slice(0, 80)}`);
  } finally {
    if (els.importDataInput) els.importDataInput.value = '';
  }
}

function renderScoreBoard() {
  const meKey = syncRuntime.authUid || `tab:${tabId}`;
  const my = state.game.bestByUser[meKey]?.score || 0;
  if (els.myBestScore) els.myBestScore.textContent = String(my);
  if (els.runScore) els.runScore.textContent = String(gameRuntime.score || 0);
  if (els.gameLevel) els.gameLevel.textContent = String(gameRuntime.level || 1);
  if (els.gameLives) els.gameLives.textContent = String(gameRuntime.lives || 3);
  if (!els.scoreBoard) return;
  els.scoreBoard.innerHTML = '';
  Object.entries(state.game.bestByUser)
    .map(([k, v]) => ({ key: k, name: v.name || 'User', score: Number(v.score || 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .forEach((row) => {
      const div = document.createElement('div');
      div.className = 'pill';
      div.innerHTML = `<span>${escapeHtml(row.name)}</span><strong>${row.score}</strong>`;
      els.scoreBoard.appendChild(div);
    });
}
function startMiniGame() {
  const c = els.miniGame;
  if (!c) return;
  const ctx = c.getContext('2d');
  const perf = isPerfMode();
  if (perf) {
    const targetW = Math.max(360, Math.min(520, Math.floor(window.innerWidth * 0.9)));
    c.width = targetW;
    c.height = Math.max(200, Math.floor(targetW * 0.45));
  }
  const w = gameRuntime.width = c.width;
  const h = gameRuntime.height = c.height;
  gameRuntime.running = true;
  gameRuntime.paused = false;
  gameRuntime.score = 0;
  gameRuntime.level = 1;
  gameRuntime.lives = 3;
  gameRuntime.startedAt = performance.now();
  gameRuntime.basePlayerW = Math.max(96, Math.min(132, Math.floor(w * 0.16)));
  gameRuntime.playerW = gameRuntime.basePlayerW;
  gameRuntime.baseBallR = Math.max(9, Math.min(11, Math.floor(w * 0.015)));
  gameRuntime.ballR = gameRuntime.baseBallR;
  gameRuntime.playerX = w / 2 - gameRuntime.playerW / 2;
  gameRuntime.targetX = gameRuntime.playerX;
  gameRuntime.ballX = w / 2;
  gameRuntime.ballY = h * 0.42;
  gameRuntime.baseSpeed = Math.max(160, Math.floor(w * 0.24));
  gameRuntime.maxSpeed = Math.max(380, Math.floor(w * 0.62));
  gameRuntime.vx = (Math.random() > 0.5 ? 1 : -1) * (gameRuntime.baseSpeed * 0.72);
  gameRuntime.vy = gameRuntime.baseSpeed;
  gameRuntime.lastTickAt = performance.now();
  if (els.pauseGameBtn) els.pauseGameBtn.textContent = 'Pause';
  renderScoreBoard();

  const tick = (now) => {
    if (!gameRuntime.running) return;
    if (gameRuntime.paused) {
      gameRuntime.raf = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.05, (now - gameRuntime.lastTickAt) / 1000 || 0.016);
    gameRuntime.lastTickAt = now;
    const elapsedSec = Math.max(0, (now - gameRuntime.startedAt) / 1000);
    const levelByTime = Math.floor(elapsedSec / 7);
    const levelByScore = Math.floor(gameRuntime.score / 6);
    gameRuntime.level = 1 + levelByTime + levelByScore;
    const difficulty = Math.max(0, gameRuntime.level - 1);
    gameRuntime.playerW = Math.max(gameRuntime.minPlayerW, gameRuntime.basePlayerW - difficulty * 2);
    gameRuntime.ballR = Math.max(gameRuntime.minBallR, gameRuntime.baseBallR - Math.floor(difficulty / 2));

    gameRuntime.playerX += (gameRuntime.targetX - gameRuntime.playerX) * Math.min(1, dt * 18);
    gameRuntime.playerX = Math.max(8, Math.min(w - gameRuntime.playerW - 8, gameRuntime.playerX));
    const paddleY = h - 28;

    gameRuntime.ballX += gameRuntime.vx * dt;
    gameRuntime.ballY += gameRuntime.vy * dt;

    if (gameRuntime.ballX <= gameRuntime.ballR + 8) {
      gameRuntime.ballX = gameRuntime.ballR + 8;
      gameRuntime.vx = Math.abs(gameRuntime.vx);
    }
    if (gameRuntime.ballX >= w - gameRuntime.ballR - 8) {
      gameRuntime.ballX = w - gameRuntime.ballR - 8;
      gameRuntime.vx = -Math.abs(gameRuntime.vx);
    }
    if (gameRuntime.ballY <= gameRuntime.ballR + 8) {
      gameRuntime.ballY = gameRuntime.ballR + 8;
      gameRuntime.vy = Math.abs(gameRuntime.vy);
    }

    const hitPaddle = gameRuntime.ballY + gameRuntime.ballR >= paddleY &&
      gameRuntime.ballY - gameRuntime.ballR <= paddleY + gameRuntime.playerH &&
      gameRuntime.ballX >= gameRuntime.playerX &&
      gameRuntime.ballX <= gameRuntime.playerX + gameRuntime.playerW &&
      gameRuntime.vy > 0;

    if (hitPaddle) {
      const paddleCenter = gameRuntime.playerX + gameRuntime.playerW / 2;
      const offset = (gameRuntime.ballX - paddleCenter) / (gameRuntime.playerW / 2);
      gameRuntime.ballY = paddleY - gameRuntime.ballR - 1;
      gameRuntime.vy = -Math.abs(gameRuntime.vy);
      gameRuntime.vx += offset * (54 + difficulty * 2);
      gameRuntime.score += 1;
      const targetSpeed = Math.min(gameRuntime.maxSpeed, gameRuntime.baseSpeed + difficulty * 12 + gameRuntime.score * 1.8);
      const speedNow = Math.hypot(gameRuntime.vx, gameRuntime.vy) || targetSpeed;
      const k = targetSpeed / speedNow;
      gameRuntime.vx *= k;
      gameRuntime.vy *= k;
      gameRuntime.vx = Math.max(-gameRuntime.maxSpeed, Math.min(gameRuntime.maxSpeed, gameRuntime.vx));
      gameRuntime.vy = Math.max(-gameRuntime.maxSpeed, Math.min(gameRuntime.maxSpeed, gameRuntime.vy));
      maybeBeep();
      renderScoreBoard();
    }

    if (gameRuntime.ballY - gameRuntime.ballR > h) {
      gameRuntime.lives -= 1;
      if (gameRuntime.lives <= 0) {
        renderScoreBoard();
        endMiniGame();
        return;
      }
      gameRuntime.ballX = w / 2;
      gameRuntime.ballY = h * 0.42;
      const relaunchSpeed = Math.min(gameRuntime.maxSpeed, gameRuntime.baseSpeed + difficulty * 12);
      gameRuntime.vx = (Math.random() > 0.5 ? 1 : -1) * relaunchSpeed * 0.7;
      gameRuntime.vy = relaunchSpeed;
      maybeVibrate([35, 25, 35]);
      renderScoreBoard();
    }

    ctx.clearRect(0, 0, w, h);
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(149,203,255,0.18)');
    grd.addColorStop(1, 'rgba(8,18,42,0.84)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const lines = perf ? 4 : 8;
    for (let i = 0; i < lines; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (h / lines) * i + 4);
      ctx.lineTo(w, (h / lines) * i + 4);
      ctx.stroke();
    }

    ctx.shadowColor = 'rgba(110,190,255,0.55)';
    ctx.shadowBlur = perf ? 0 : 16;
    ctx.fillStyle = '#e9f4ff';
    ctx.fillRect(gameRuntime.playerX, paddleY, gameRuntime.playerW, gameRuntime.playerH);
    ctx.shadowBlur = 0;
    const ballGrad = ctx.createRadialGradient(gameRuntime.ballX - 3, gameRuntime.ballY - 4, 2, gameRuntime.ballX, gameRuntime.ballY, gameRuntime.ballR + 2);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(1, '#ff7fa7');
    ctx.shadowColor = 'rgba(255,123,171,0.65)';
    ctx.shadowBlur = perf ? 0 : 18;
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(gameRuntime.ballX, gameRuntime.ballY, gameRuntime.ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ecf4ff';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Score ${gameRuntime.score}`, 14, 24);
    ctx.fillText(`Lives ${gameRuntime.lives}`, 14, 46);
    ctx.fillText(`Level ${gameRuntime.level}`, w - 98, 24);

    gameRuntime.raf = requestAnimationFrame(tick);
  };

  cancelAnimationFrame(gameRuntime.raf);
  gameRuntime.raf = requestAnimationFrame((now) => {
    gameRuntime.lastTickAt = now;
    tick(now);
  });
}

function endMiniGame() {
  gameRuntime.running = false;
  gameRuntime.paused = false;
  cancelAnimationFrame(gameRuntime.raf);
  const key = syncRuntime.authUid || `tab:${tabId}`;
  const prev = Number(state.game.bestByUser[key]?.score || 0);
  const next = Math.max(prev, gameRuntime.score);
  state.game.lastScore = gameRuntime.score;
  state.game.bestByUser[key] = { name: state.auth.name || 'You', score: next };
  saveState();
  renderScoreBoard();
  emitEvent('score_update', { key, score: next, name: state.auth.name || 'You' });
  toast(`Run complete. Score ${gameRuntime.score}`);
}

function togglePauseGame() {
  if (!gameRuntime.running) return;
  gameRuntime.paused = !gameRuntime.paused;
  if (els.pauseGameBtn) els.pauseGameBtn.textContent = gameRuntime.paused ? 'Resume' : 'Pause';
}

function bindGameInput() {
  const c = els.miniGame;
  if (!c || gameRuntime.bindReady) return;
  gameRuntime.bindReady = true;
  const move = (x) => {
    const rect = c.getBoundingClientRect();
    const px = (x - rect.left) * (c.width / rect.width);
    gameRuntime.targetX = Math.max(12, Math.min(c.width - gameRuntime.playerW - 12, px - gameRuntime.playerW / 2));
  };
  c.addEventListener('mousemove', (e) => move(e.clientX));
  c.addEventListener('touchmove', (e) => { move(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
  c.addEventListener('touchstart', (e) => { move(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
  c.addEventListener('pointerdown', (e) => {
    gameRuntime.pointerActive = true;
    c.setPointerCapture?.(e.pointerId);
    move(e.clientX);
  });
  c.addEventListener('pointermove', (e) => {
    if (gameRuntime.pointerActive || e.pressure > 0 || e.buttons) move(e.clientX);
  });
  c.addEventListener('pointerup', (e) => {
    gameRuntime.pointerActive = false;
    c.releasePointerCapture?.(e.pointerId);
  });
  c.addEventListener('pointercancel', () => {
    gameRuntime.pointerActive = false;
  });
}

function schedulePublishState() {
  if (!syncRuntime.connected || !syncRuntime.roomRef || !syncRuntime.authUid) return;
  clearTimeout(syncRuntime.publishTimer);
  const delay = document.hidden ? 650 : 140;
  syncRuntime.publishTimer = setTimeout(publishState, delay);
}

function publishState() {
  if (!syncRuntime.connected || !syncRuntime.roomRef || !syncRuntime.authUid) return;
  const payload = {
    ts: Date.now(),
    sender: syncRuntime.authUid,
    clientId: tabId,
    data: {
      songs: state.songs,
      goals: state.goals,
      dates: state.dates,
      reminders: state.reminders,
      wallpaper: state.wallpaper,
      letters: state.letters,
      letterTombstones: state.letterTombstones,
      mood: state.mood,
      dailyNote: state.dailyNote,
      missLog: state.missLog,
      game: state.game,
      settings: { anniversary: state.settings.anniversary, featureFlags: state.settings.featureFlags },
      auth: { partnerName: state.auth.partnerName }
    }
  };
  syncRuntime.roomRef.child('state').set(payload).catch(() => {});
}

function emitEvent(type, payload = {}) {
  pulse(`${state.auth.name} ${type.replace('_', ' ')}`);
  adminLog('event', `Emit ${type}`, payload);
  if (!syncRuntime.connected || !syncRuntime.roomRef || !syncRuntime.authUid) return;
  syncRuntime.roomRef.child('events').push({
    type,
    payload,
    ts: Date.now(),
    sender: syncRuntime.authUid,
    senderName: state.auth.name,
    clientId: tabId
  }).catch(() => {});
}

async function connectRealtime() {
  if (!state.auth.loggedIn) return toast('Login first');
  if (!state.auth.pairCode) return toast('Set pair code');
  try {
    const cfg = parseFirebaseConfig();
    await loadFirebaseSDK();
    if (!window.firebase?.apps?.length) window.firebase.initializeApp(cfg);

    const auth = window.firebase.auth();
    if (!auth.currentUser) await auth.signInAnonymously();
    syncRuntime.authUid = auth.currentUser?.uid || '';
    if (!syncRuntime.authUid) throw new Error('Anonymous auth failed');

    syncRuntime.db = window.firebase.database();
    const room = state.auth.pairCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    syncRuntime.roomRef = syncRuntime.db.ref(`rooms/${room}`);
    await syncRuntime.db.ref(`roomMembers/${room}/${syncRuntime.authUid}`).set(true);
    if (state.push.token) await registerPushToken(state.push.token);

    disconnectRealtimeListeners();
    syncRuntime.seenEventIds.clear();

    const eventCutoff = Math.max(Number(state.sync.lastEventAt || 0) + 1, Date.now() - 120000);
    syncRuntime.eventListener = syncRuntime.roomRef.child('events').orderByChild('ts').startAt(eventCutoff).limitToLast(80).on('child_added', (snap) => {
      const ev = snap.val();
      const id = snap.key;
      if (!ev || syncRuntime.seenEventIds.has(id)) return;
      syncRuntime.seenEventIds.add(id);
      if (ev.clientId === tabId) return;
      if (ev.sender && ev.sender === syncRuntime.authUid) return;
      const ts = Number(ev.ts || 0);
      if (!Number.isFinite(ts) || ts <= Number(state.sync.lastEventAt || 0)) return;
      handleRemoteEvent(ev);
    });

    syncRuntime.stateListener = syncRuntime.roomRef.child('state').on('value', (snap) => {
      const remote = snap.val();
      if (!remote || !remote.data) return;
      if (remote.clientId === tabId) return;
      if (remote.sender && remote.sender === syncRuntime.authUid) return;
      if (remote.ts <= syncRuntime.lastRemoteStateTs) return;
      syncRuntime.lastRemoteStateTs = remote.ts;
      applyRemoteState(remote.data);
    });

    syncRuntime.presenceListener = syncRuntime.roomRef.child('presence').on('value', (snap) => {
      const data = snap.val() || {};
      const now = Date.now();
      let bestTs = 0;
      let bestName = '';
      for (const [uid, p] of Object.entries(data)) {
        if (uid === syncRuntime.authUid) continue;
        const ts = Number(p?.ts || 0);
        if (ts > bestTs) {
          bestTs = ts;
          bestName = String(p?.name || '');
        }
      }
      syncRuntime.partnerLastSeenTs = bestTs || syncRuntime.partnerLastSeenTs || 0;
      syncRuntime.partnerOnline = !!bestTs && now - bestTs < 45000;
      if (bestName) syncRuntime.partnerLiveName = bestName;
      if (bestName && bestName !== state.auth.partnerName) {
        state.auth.partnerName = bestName;
        saveState(false);
      }
      updatePresenceUI();
      paintHeader();
    });

    syncRuntime.profilesListener = syncRuntime.roomRef.child('profiles').on('value', (snap) => {
      const data = snap.val() || {};
      let latestName = '';
      let latestAt = 0;
      for (const [uid, p] of Object.entries(data)) {
        if (uid === syncRuntime.authUid) continue;
        const updatedAt = Number(p?.updatedAt || 0);
        if (updatedAt >= latestAt && p?.name) {
          latestAt = updatedAt;
          latestName = String(p.name);
        }
      }
      if (latestName) {
        syncRuntime.partnerLiveName = latestName;
        if (latestName !== state.auth.partnerName) {
          state.auth.partnerName = latestName;
          saveState(false);
        }
        paintHeader();
        updatePresenceUI();
      }
    });

    syncRuntime.connected = true;
    state.sync.connected = true;
    saveState(false);
    updateSyncUI();
    renderMonitoring();
    toast('Realtime connected');
    pulse('Realtime connected');
    adminLog('sync', 'Realtime connected', { uid: syncRuntime.authUid });
    publishPresence();
    publishProfile();
    startHeartbeat();
    await enableBackgroundAlerts();
    publishState();
  } catch (err) {
    syncRuntime.connected = false;
    state.sync.connected = false;
    saveState(false);
    updateSyncUI();
    toast(`Realtime error: ${String(err.message || err).slice(0, 120)}`);
  }
}

function applyRemoteState(data) {
  syncRuntime.lastRemoteStateData = structuredClone(data || {});
  state.letterTombstones = deepMerge(state.letterTombstones || {}, data.letterTombstones || {});
  state.songs = data.songs || state.songs;
  state.goals = data.goals || state.goals;
  state.dates = data.dates || state.dates;
  state.reminders = data.reminders || state.reminders;
  state.wallpaper = data.wallpaper || state.wallpaper;
  state.letters = (data.letters || state.letters).filter((l) => !state.letterTombstones[l.id]);
  state.mood = data.mood || state.mood;
  state.dailyNote = data.dailyNote ?? state.dailyNote;
  state.missLog = data.missLog || state.missLog;
  state.game = data.game || state.game;
  state.settings.anniversary = data.settings?.anniversary ?? state.settings.anniversary;
  state.settings.featureFlags = deepMerge(state.settings.featureFlags || {}, data.settings?.featureFlags || {});
  state.auth.partnerName = data.auth?.partnerName ?? state.auth.partnerName;

  saveState(false);

  renderHomeBits();
  if (document.activeElement !== els.dailyPrompt) els.dailyPrompt.value = state.dailyNote || '';
  renderSongs();
  renderGoals();
  renderDates();
  renderReminders();
  renderLetters();
  applyWallpaperFromState();
  renderScoreBoard();
  renderMonitoring();
  applyFeatureFlags();
  pulse('Live state updated');
}

function startHeartbeat() {
  stopHeartbeat();
  syncRuntime.heartbeatTimer = setInterval(() => {
    if (!syncRuntime.connected || document.hidden) return;
    publishPresence();
  }, 25000);
}

function stopHeartbeat() {
  if (syncRuntime.heartbeatTimer) clearInterval(syncRuntime.heartbeatTimer);
  syncRuntime.heartbeatTimer = 0;
}

function publishPresence() {
  if (!syncRuntime.connected || !syncRuntime.roomRef || !syncRuntime.authUid) return;
  syncRuntime.roomRef.child(`presence/${syncRuntime.authUid}`).set({
    ts: Date.now(),
    name: state.auth.name || 'User',
    tabId
  }).catch(() => {});
  if (Date.now() - lastPresenceLogAt > 60000) {
    lastPresenceLogAt = Date.now();
    adminLog('presence', 'Presence heartbeat');
  }
}

function publishProfile() {
  if (!syncRuntime.connected || !syncRuntime.roomRef || !syncRuntime.authUid) return;
  syncRuntime.roomRef.child(`profiles/${syncRuntime.authUid}`).set({
    name: state.auth.name || 'User',
    updatedAt: Date.now()
  }).catch(() => {});
}

async function wipeRemoteRoomData() {
  if (!state.auth.pairCode) throw new Error('Pair code missing');

  await loadFirebaseSDK();
  const cfg = parseFirebaseConfig();
  if (!window.firebase?.apps?.length) window.firebase.initializeApp(cfg);

  const auth = window.firebase.auth();
  if (!auth.currentUser) await auth.signInAnonymously();
  syncRuntime.authUid = auth.currentUser?.uid || syncRuntime.authUid;

  const db = window.firebase.database();
  const room = state.auth.pairCode.replace(/[^a-zA-Z0-9_-]/g, '_');

  const updates = {};
  updates[`rooms/${room}`] = null;
  updates[`roomTokens/${room}`] = null;
  updates[`roomMembers/${room}`] = null;

  await db.ref().update(updates);
}
function parseFirebaseConfig() {
  if (!state.sync.firebaseConfig?.trim()) return FIREBASE_DEFAULT_CONFIG;
  return JSON.parse(state.sync.firebaseConfig);
}

function disconnectRealtimeListeners() {
  if (!syncRuntime.roomRef) return;
  if (syncRuntime.eventListener) syncRuntime.roomRef.child('events').off('child_added', syncRuntime.eventListener);
  if (syncRuntime.stateListener) syncRuntime.roomRef.child('state').off('value', syncRuntime.stateListener);
  if (syncRuntime.presenceListener) syncRuntime.roomRef.child('presence').off('value', syncRuntime.presenceListener);
  if (syncRuntime.profilesListener) syncRuntime.roomRef.child('profiles').off('value', syncRuntime.profilesListener);
  syncRuntime.eventListener = null;
  syncRuntime.stateListener = null;
  syncRuntime.presenceListener = null;
  syncRuntime.profilesListener = null;
}

function disconnectRealtime() {
  disconnectRealtimeListeners();
  syncRuntime.connected = false;
  syncRuntime.partnerOnline = false;
  state.sync.connected = false;
  stopHeartbeat();
  updatePresenceUI();
  updateSyncUI();
  adminLog('sync', 'Realtime disconnected');
}
function handleRemoteEvent(ev) {
  const ts = Number(ev.ts || Date.now());
  state.sync.lastEventAt = ts;
  saveState(false);
  const who = ev.senderName || 'Partner';
  const freshMiss = ts >= Date.now() - 120000 && ts >= Number(syncRuntime.sessionStartedAt || 0) - 4000;
  const unseenMiss = ts > Number(state.sync.lastNotifiedMissAt || 0);
  if (ev.type === 'miss_signal' && freshMiss && unseenMiss) {
    state.sync.lastNotifiedMissAt = ts;
    saveState(false);
    els.missStatus.textContent = `${who} sent a miss signal`;
    showSignalOverlay(`${who} misses you`, 'Live signal received');
    pushDeviceAlert(`${who} misses you`, 'Live signal received');
    maybeVibrate([30, 55, 30]);
    maybeBeep();
  }
  if (ev.type === 'score_update' && ev.payload?.key) {
    state.game.bestByUser[ev.payload.key] = { name: ev.payload.name || who, score: Number(ev.payload.score || 0) };
    saveState(false);
    renderScoreBoard();
  }
  if (ev.type === 'reminder_delete' && ev.payload?.id) {
    state.reminders = state.reminders.filter((x) => x.id !== ev.payload.id);
    saveState(false);
    renderReminders();
  }
  if (ev.type === 'reminder_toggle' && ev.payload?.id) {
    const r = state.reminders.find((x) => x.id === ev.payload.id);
    if (r) {
      r.enabled = !!ev.payload.enabled;
      saveState(false);
      renderReminders();
    }
  }
  if (ev.type === 'reminder_done' && ev.payload?.id) {
    const r = state.reminders.find((x) => x.id === ev.payload.id);
    if (r) {
      r.lastDoneOn = ev.payload.dayKey || r.lastDoneOn;
      r.lastFiredOn = ev.payload.dayKey || r.lastFiredOn;
      r.doneCount = Number(ev.payload.doneCount ?? r.doneCount ?? 0);
      r.streak = Number(ev.payload.streak ?? r.streak ?? 0);
      r.snoozedUntil = 0;
      if (r.repeat === 'none') r.enabled = false;
      saveState(false);
      renderReminders();
    }
  }
  if (ev.type === 'reminder_skip' && ev.payload?.id) {
    const r = state.reminders.find((x) => x.id === ev.payload.id);
    if (r) {
      r.lastFiredOn = ev.payload.dayKey || r.lastFiredOn;
      r.skipCount = Number(ev.payload.skipCount ?? r.skipCount ?? 0);
      r.streak = 0;
      r.snoozedUntil = 0;
      if (r.repeat === 'none') r.enabled = false;
      saveState(false);
      renderReminders();
    }
  }
  if (ev.type === 'reminder_snooze' && ev.payload?.id) {
    const r = state.reminders.find((x) => x.id === ev.payload.id);
    if (r) {
      r.snoozedUntil = Number(ev.payload.until || 0);
      saveState(false);
      renderReminders();
    }
  }
  if (ev.type === 'feature_flag_update' && ev.payload?.key) {
    state.settings.featureFlags[ev.payload.key] = !!ev.payload.value;
    saveState(false);
    applyFeatureFlags();
  }
  if (ev.type === 'letter_open' && ev.payload?.id) {
    const l = state.letters.find((x) => x.id === ev.payload.id);
    if (l) {
      l.opened = true;
      l.openedAt = Number(ev.payload.openedAt || l.openedAt || Date.now());
      saveState(false);
      renderLetters();
    }
  }
  if (ev.type === 'letter_delete' && ev.payload?.id) {
    state.letterTombstones[ev.payload.id] = Number(ev.ts || Date.now());
    const len = state.letters.length;
    state.letters = state.letters.filter((x) => x.id !== ev.payload.id);
    if (state.letters.length !== len) {
      saveState(false);
      renderLetters();
    }
  }
  pulse(`${who}: ${ev.type.replace('_', ' ')}`);
  adminLog('event', `Recv ${ev.type} from ${who}`, ev.payload || null);
  renderMonitoring();
}

function updateSyncUI() {
  const live = syncRuntime.connected;
  els.syncBadge.textContent = live ? 'Live' : 'Offline';
  els.syncBadge.classList.toggle('live', live);
  const suffix = syncRuntime.authUid ? ` (uid ${syncRuntime.authUid.slice(0, 8)}...)` : '';
  els.syncStatusText.textContent = (live ? 'Connected realtime' : 'Not connected') + suffix;
}

async function loadFirebaseSDK() {
  if (syncRuntime.firebaseLoaded && window.firebase) return;
  await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');
  syncRuntime.firebaseLoaded = true;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function showSignalOverlay(title, body) {
  els.signalTitle.textContent = title;
  els.signalBody.textContent = body;
  els.signalOverlay.classList.remove('hidden');
}

async function pushDeviceAlert(title, body) {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', vibrate: [40, 80, 40] });
        return;
      }
    }
  } catch {}
  notify(title, body);
}

async function enableBackgroundAlerts() {
  if (!state.settings.notifications) return;
  if (!('serviceWorker' in navigator)) return;
  try {
    await loadFirebaseSDK();
    const cfg = parseFirebaseConfig();
    if (!window.firebase?.apps?.length) window.firebase.initializeApp(cfg);
    const auth = window.firebase.auth();
    if (!auth.currentUser) await auth.signInAnonymously();
    syncRuntime.authUid = auth.currentUser?.uid || syncRuntime.authUid;

    if (!FCM_VAPID_KEY) {
      toast('Set FCM_VAPID_KEY in app.js to enable lockscreen push when app is closed');
      return;
    }

    const reg = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);
    const messaging = window.firebase.messaging();
    const token = await messaging.getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return;

    state.push.token = token;
    saveState(false);
    await registerPushToken(token);
    toast('Background alerts enabled');
  } catch (err) {
    toast(`Push setup failed: ${String(err.message || err).slice(0, 80)}`);
  }
}

async function registerPushToken(token) {
  if (!syncRuntime.db || !syncRuntime.authUid || !state.auth.pairCode || !token) return;
  const room = state.auth.pairCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safe = encodeURIComponent(token);
  await syncRuntime.db.ref(`roomTokens/${room}/${syncRuntime.authUid}/${safe}`).set(true);
}
function pulse(text) {
  state.pulse.unshift({ text, ts: Date.now() });
  state.pulse = state.pulse.slice(0, 40);
  if (typeof text === 'string' && text.trim()) adminLog('system', text);
  saveState(false);
  renderPulse();
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  els.toastHost.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function notify(title, body) {
  if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function maybeVibrate(pattern = [18]) {
  if (state.preferences.haptics && navigator.vibrate) navigator.vibrate(pattern);
}

function maybeBeep() {
  if (!state.preferences.soundCue) return;
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = 680;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(a.destination);
    const t = a.currentTime;
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.start(t); o.stop(t + 0.17);
  } catch {}
}

function bindDelete(container, arr, rerender, eventType, confirmMessage = '') {
  container.querySelectorAll('button[data-del]').forEach((btn) => btn.addEventListener('click', (e) => {
    const id = btn.dataset.del;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return;
    if (confirmMessage && !confirm(confirmMessage)) return;
    if (eventType === 'letter_delete') state.letterTombstones[id] = Date.now();
    arr.splice(idx, 1);
    saveState();
    rerender();
    if (eventType) emitEvent(eventType, { id });
  }));
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function escapeHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }


































