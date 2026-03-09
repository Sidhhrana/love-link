const LS_KEY = 'love-link-state-v5';
const TAB_KEY = 'love-link-tab-id';
const APP_VERSION = '20260310';
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
  settings: { anniversary: '', adminCode: 'lovelink-admin', themeOverride: 'auto', notifications: false },
  preferences: { focusMode: false, haptics: true, soundCue: false, blur: 18, motion: 1, radius: 24, scale: 1 },
  sync: { firebaseConfig: '', enabled: true, connected: false, lastEventAt: 0, lastNotifiedMissAt: 0 },
  push: { token: '' },
  songs: [{ id: 'spotify-main', title: 'Our Spotify Playlist', url: 'https://open.spotify.com/playlist/6xqr5eKiT53i18ZEjJhCfY?si=c11fe2668a994cc8' }],
  goals: [],
  dates: [],
  letters: [],
  letterTombstones: {},
  mood: { energy: 50, affection: 70 },
  dailyNote: '',
  missLog: [],
  pulse: [],
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
  publishTimer: null,
  lastRemoteStateTs: 0,
  seenEventIds: new Set(),
  heartbeatTimer: 0,
  sessionStartedAt: Date.now()
};

const gameRuntime = {
  running: false,
  paused: false,
  score: 0,
  level: 1,
  lives: 3,
  playerX: 0,
  targetX: 0,
  width: 640,
  height: 300,
  playerW: 94,
  playerH: 12,
  ballX: 0,
  ballY: 0,
  ballR: 10,
  vx: 140,
  vy: 190,
  lastTickAt: 0,
  raf: 0,
  bindReady: false
};

const tabId = getTabId();
let deferredInstallPrompt = null;
let activeScreen = 'home';
let menuAnimating = false;
let drawerOpen = false;

const els = {
  authScreen: byId('authScreen'), appRoot: byId('appRoot'), roleInput: byId('roleInput'), nameInput: byId('nameInput'),
  pairCodeInput: byId('pairCodeInput'), loginBtn: byId('loginBtn'), demoBtn: byId('demoBtn'), brandTitle: byId('brandTitle'),
  installBtn: byId('installBtn'), syncBadge: byId('syncBadge'), missBtn: byId('missBtn'), shareMissBtn: byId('shareMissBtn'),
  menuBtn: byId('menuBtn'), sideMenu: byId('sideMenu'), menuCloseBtn: byId('menuCloseBtn'), menuBackdrop: byId('menuBackdrop'),
  drawerToggleBtn: byId('drawerToggleBtn'), homeDrawer: byId('homeDrawer'), homeDrawerHandle: byId('homeDrawerHandle'),
  vibePingBtn: byId('vibePingBtn'), missStatus: byId('missStatus'), moodLabel: byId('moodLabel'), moodText: byId('moodText'),
  homeNoteState: byId('homeNoteState'), homeMoodState: byId('homeMoodState'),
  energySlider: byId('energySlider'), affectionSlider: byId('affectionSlider'), partnerAvatar: byId('partnerAvatar'), partnerRing: byId('partnerRing'),
  daysTogether: byId('daysTogether'), sinceText: byId('sinceText'), dailyPrompt: byId('dailyPrompt'), savePromptBtn: byId('savePromptBtn'),
  promptSaved: byId('promptSaved'), pulseList: byId('pulseList'), navTabs: byId('navTabs'), songTitle: byId('songTitle'),
  songUrl: byId('songUrl'), addSongBtn: byId('addSongBtn'), songsList: byId('songsList'), goalText: byId('goalText'), goalDate: byId('goalDate'),
  addGoalBtn: byId('addGoalBtn'), goalsList: byId('goalsList'), dateTitle: byId('dateTitle'), dateValue: byId('dateValue'),
  addDateBtn: byId('addDateBtn'), datesList: byId('datesList'), calendarTitle: byId('calendarTitle'), calendarGrid: byId('calendarGrid'),
  letterTitle: byId('letterTitle'), letterBody: byId('letterBody'), letterLockType: byId('letterLockType'), letterLockValue: byId('letterLockValue'),
  addLetterBtn: byId('addLetterBtn'), lettersList: byId('lettersList'), annivInput: byId('annivInput'), partnerNameInput: byId('partnerNameInput'),
  saveSettingsBtn: byId('saveSettingsBtn'), requestNotifBtn: byId('requestNotifBtn'), focusToggle: byId('focusToggle'), hapticToggle: byId('hapticToggle'),
  soundToggle: byId('soundToggle'), blurInput: byId('blurInput'), motionInput: byId('motionInput'), radiusInput: byId('radiusInput'),
  scaleInput: byId('scaleInput'), adminCodeInput: byId('adminCodeInput'), adminOpenBtn: byId('adminOpenBtn'), adminPanel: byId('adminPanel'),
  newPairCode: byId('newPairCode'), genPairCodeBtn: byId('genPairCodeBtn'), newAdminCode: byId('newAdminCode'), saveAdminCodeBtn: byId('saveAdminCodeBtn'),
  themeOverride: byId('themeOverride'), applyThemeBtn: byId('applyThemeBtn'), firebaseConfigInput: byId('firebaseConfigInput'),
  saveFirebaseBtn: byId('saveFirebaseBtn'), connectRealtimeBtn: byId('connectRealtimeBtn'), syncStatusText: byId('syncStatusText'),
  monitorList: byId('monitorList'), resetConfirmInput: byId('resetConfirmInput'), hardResetBtn: byId('hardResetBtn'), logoutBtn: byId('logoutBtn'), toastHost: byId('toastHost'), signalOverlay: byId('signalOverlay'),
  signalTitle: byId('signalTitle'), signalBody: byId('signalBody'), closeSignalBtn: byId('closeSignalBtn'), miniGame: byId('miniGame'),
  startGameBtn: byId('startGameBtn'), pauseGameBtn: byId('pauseGameBtn'), myBestScore: byId('myBestScore'),
  runScore: byId('runScore'), gameLevel: byId('gameLevel'), gameLives: byId('gameLives'), scoreBoard: byId('scoreBoard')
};

setupPWA();
bindAuth();
bindMain();
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

  els.energySlider.addEventListener('input', saveMoodFromUI);
  els.affectionSlider.addEventListener('input', saveMoodFromUI);
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

  els.addLetterBtn.addEventListener('click', () => {
    const title = els.letterTitle.value.trim();
    const body = els.letterBody.value.trim();
    if (!title || !body) return;
    state.letters.unshift({ id: uid(), title, body, lockType: els.letterLockType.value, lockValue: els.letterLockValue.value.trim(), opened: false });
    els.letterTitle.value = '';
    els.letterBody.value = '';
    els.letterLockValue.value = '';
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
    saveState(false);
    paintFromState();
  });

  if (els.startGameBtn) els.startGameBtn.addEventListener('click', startMiniGame);
  if (els.pauseGameBtn) els.pauseGameBtn.addEventListener('click', togglePauseGame);
  bindGameInput();
}
function paintFromState() {
  if (!state.auth.loggedIn) {
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

  els.annivInput.value = state.settings.anniversary || '';
  els.partnerNameInput.value = state.auth.partnerName || '';
  els.dailyPrompt.value = state.dailyNote || '';
  els.energySlider.value = String(state.mood.energy ?? 50);
  els.affectionSlider.value = String(state.mood.affection ?? 70);
  els.themeOverride.value = state.settings.themeOverride || 'auto';
  els.focusToggle.checked = !!state.preferences.focusMode;
  els.hapticToggle.checked = !!state.preferences.haptics;
  els.soundToggle.checked = !!state.preferences.soundCue;
  els.blurInput.value = String(state.preferences.blur || 18);
  els.motionInput.value = String(state.preferences.motion ?? 1);
  els.radiusInput.value = String(state.preferences.radius || 24);
  els.scaleInput.value = String(state.preferences.scale || 1);
  els.firebaseConfigInput.value = state.sync.firebaseConfig || JSON.stringify(FIREBASE_DEFAULT_CONFIG, null, 2);

  renderHomeBits();
  renderSongs();
  renderGoals();
  renderDates();
  renderLetters();
  renderPulse();
  renderMonitoring();
  renderScoreBoard();
  updateSyncUI();
  showScreen(activeScreen);
  setDrawerOpen(drawerOpen, true);
}

function paintHeader() {
  const n = state.auth.name || 'You';
  const p = state.auth.partnerName || 'Partner';
  els.brandTitle.textContent = `${n} + ${p}`;
  els.partnerAvatar.textContent = p[0]?.toUpperCase() || 'P';
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
  let dragging = false;

  const onPointerMove = (ev) => {
    if (!dragging) return;
    const currentY = ev.clientY ?? (ev.touches?.[0]?.clientY ?? dragStartY);
    const dy = currentY - dragStartY;
    if (Math.abs(dy) < 8) return;
    els.homeDrawer.classList.toggle('peek', dy > 0);
  };

  const onPointerUp = (ev) => {
    if (!dragging) return;
    dragging = false;
    els.homeDrawer.classList.remove('peek');
    const endY = ev.clientY ?? (ev.changedTouches?.[0]?.clientY ?? dragStartY);
    const dy = endY - dragStartY;
    if (dy > 32) setDrawerOpen(false);
    else if (dy < -32) setDrawerOpen(true);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  };

  els.homeDrawerHandle.addEventListener('pointerdown', (ev) => {
    dragStartY = ev.clientY;
    dragging = true;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });
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

function applyPreferences() {
  document.body.classList.toggle('focus', !!state.preferences.focusMode);
  document.documentElement.style.setProperty('--blur', `${state.preferences.blur || 18}px`);
  document.documentElement.style.setProperty('--motion', String(state.preferences.motion ?? 1));
  document.documentElement.style.setProperty('--radius', `${state.preferences.radius || 24}px`);
  document.documentElement.style.setProperty('--scale', String(state.preferences.scale ?? 1));
}

function applyTheme() {
  const role = (state.settings.themeOverride && state.settings.themeOverride !== 'auto') ? state.settings.themeOverride : state.auth.role;
  if (role === 'girl') {
    setVars({ '--bg1': '#230d19', '--bg2': '#41172d', '--glass': 'rgba(77, 31, 53, .50)', '--accent': '#ff97c5', '--accent2': '#ffd7e9', '--muted': '#ffd7e8', '--glow': 'rgba(255, 151, 197, .58)' });
  } else {
    setVars({ '--bg1': '#060d1f', '--bg2': '#10274d', '--glass': 'rgba(18, 34, 62, .48)', '--accent': '#61b2ff', '--accent2': '#9bd8ff', '--muted': '#a6bbdd', '--glow': 'rgba(97, 178, 255, .55)' });
  }
}

function setVars(vars) { Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)); }

function moodProfile(m) {
  const e = Number(m.energy || 0);
  const a = Number(m.affection || 0);
  if (e < 30 && a < 45) return { label: 'Low', text: 'Low energy and emotionally quiet', ring: '#ffb476' };
  if (e < 35 && a >= 45) return { label: 'Tired', text: 'Low energy but still affectionate', ring: '#ffd28c' };
  if (e >= 35 && e <= 70 && a >= 40 && a <= 75) return { label: 'Balanced', text: 'Balanced and warm', ring: '#7fd7c0' };
  if (e > 70 && a >= 60) return { label: 'Sparked', text: 'High energy and high affection', ring: '#7dc4ff' };
  if (e > 70 && a < 50) return { label: 'Restless', text: 'High energy, low affection bandwidth', ring: '#b1b8ff' };
  return { label: 'Soft', text: 'Calm and caring', ring: '#a3d9ff' };
}

function saveMoodFromUI() {
  state.mood.energy = Number(els.energySlider.value || 50);
  state.mood.affection = Number(els.affectionSlider.value || 70);
  saveState();
  renderMood();
  emitEvent('mood_update', { mood: state.mood });
}

function renderMood() {
  const m = moodProfile(state.mood);
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

function renderLetters() {
  els.lettersList.innerHTML = '';
  state.letters.forEach((l) => {
    const unlocked = isLetterUnlocked(l);
    const lockInfo = l.lockType === 'time' ? `Unlock at ${l.lockValue || 'not set'}` : `Unlock when mood is ${l.lockValue || 'calm'}`;
    const row = document.createElement('div');
    row.className = 'pill';
    row.innerHTML = `<span>${escapeHtml(l.title)}<br><small>${lockInfo}</small></span><span>${unlocked ? `<button data-open="${l.id}" class="btn primary">Open</button>` : '<small>Locked</small>'} <button data-del="${l.id}" class="btn ghost">X</button></span>`;
    els.lettersList.appendChild(row);
  });
  els.lettersList.querySelectorAll('button[data-open]').forEach((b) => b.addEventListener('click', (ev) => {
    const l = state.letters.find((x) => x.id === ev.target.dataset.open);
    if (!l) return;
    alert(`${l.title}\n\n${l.body}`);
    l.opened = true;
    saveState(false);
  }));
  bindDelete(els.lettersList, state.letters, renderLetters, 'letter_delete', 'Delete this letter?');
}

function isLetterUnlocked(letter) {
  if (letter.lockType === 'time') return letter.lockValue ? Date.now() >= new Date(letter.lockValue).getTime() : false;
  const mood = moodProfile(state.mood).label.toLowerCase();
  const gate = (letter.lockValue || '').toLowerCase();
  if (!gate) return false;
  if (gate.includes('calm') || gate.includes('low')) return mood === 'low' || mood === 'tired' || mood === 'soft';
  if (gate.includes('high') || gate.includes('spark')) return mood === 'sparked' || mood === 'restless';
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
    `UID: ${syncRuntime.authUid || 'n/a'}`
  ];
  items.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'pill';
    row.textContent = t;
    els.monitorList.appendChild(row);
  });
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
  const w = gameRuntime.width = c.width;
  const h = gameRuntime.height = c.height;
  gameRuntime.running = true;
  gameRuntime.paused = false;
  gameRuntime.score = 0;
  gameRuntime.level = 1;
  gameRuntime.lives = 3;
  gameRuntime.playerX = w / 2 - gameRuntime.playerW / 2;
  gameRuntime.targetX = gameRuntime.playerX;
  gameRuntime.ballX = w / 2;
  gameRuntime.ballY = h * 0.42;
  gameRuntime.vx = (Math.random() > 0.5 ? 1 : -1) * 170;
  gameRuntime.vy = 190;
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
    gameRuntime.playerX += (gameRuntime.targetX - gameRuntime.playerX) * Math.min(1, dt * 16);
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
      gameRuntime.vy = -(Math.abs(gameRuntime.vy) + 14);
      gameRuntime.vx += offset * 58;
      gameRuntime.score += 1;
      gameRuntime.level = 1 + Math.floor(gameRuntime.score / 6);
      const cap = 190 + gameRuntime.level * 18;
      gameRuntime.vx = Math.max(-cap, Math.min(cap, gameRuntime.vx));
      gameRuntime.vy = Math.max(-cap, gameRuntime.vy);
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
      gameRuntime.vx = (Math.random() > 0.5 ? 1 : -1) * (160 + gameRuntime.level * 10);
      gameRuntime.vy = 190 + gameRuntime.level * 12;
      maybeVibrate([35, 25, 35]);
      renderScoreBoard();
    }

    ctx.clearRect(0, 0, w, h);
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(138,190,255,0.16)');
    grd.addColorStop(1, 'rgba(11,20,44,0.75)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 8) * i + 4);
      ctx.lineTo(w, (h / 8) * i + 4);
      ctx.stroke();
    }

    ctx.fillStyle = '#e9f4ff';
    ctx.fillRect(gameRuntime.playerX, paddleY, gameRuntime.playerW, gameRuntime.playerH);
    const ballGrad = ctx.createRadialGradient(gameRuntime.ballX - 3, gameRuntime.ballY - 4, 2, gameRuntime.ballX, gameRuntime.ballY, gameRuntime.ballR + 2);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(1, '#ff7fa7');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(gameRuntime.ballX, gameRuntime.ballY, gameRuntime.ballR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ecf4ff';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Score ${gameRuntime.score}`, 14, 24);
    ctx.fillText(`Lives ${gameRuntime.lives}`, 14, 46);

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
  c.addEventListener('pointerdown', (e) => move(e.clientX));
  c.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.buttons) move(e.clientX); });
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
      letters: state.letters,
      letterTombstones: state.letterTombstones,
      mood: state.mood,
      dailyNote: state.dailyNote,
      missLog: state.missLog,
      game: state.game,
      settings: { anniversary: state.settings.anniversary },
      auth: { partnerName: state.auth.partnerName }
    }
  };
  syncRuntime.roomRef.child('state').set(payload).catch(() => {});
}

function emitEvent(type, payload = {}) {
  pulse(`${state.auth.name} ${type.replace('_', ' ')}`);
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

    syncRuntime.connected = true;
    state.sync.connected = true;
    saveState(false);
    updateSyncUI();
    renderMonitoring();
    toast('Realtime connected');
    pulse('Realtime connected');
    publishPresence();
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
  state.letterTombstones = deepMerge(state.letterTombstones || {}, data.letterTombstones || {});
  state.songs = data.songs || state.songs;
  state.goals = data.goals || state.goals;
  state.dates = data.dates || state.dates;
  state.letters = (data.letters || state.letters).filter((l) => !state.letterTombstones[l.id]);
  state.mood = data.mood || state.mood;
  state.dailyNote = data.dailyNote ?? state.dailyNote;
  state.missLog = data.missLog || state.missLog;
  state.game = data.game || state.game;
  state.settings.anniversary = data.settings?.anniversary ?? state.settings.anniversary;
  state.auth.partnerName = data.auth?.partnerName ?? state.auth.partnerName;

  saveState(false);

  renderHomeBits();
  if (document.activeElement !== els.dailyPrompt) els.dailyPrompt.value = state.dailyNote || '';
  renderSongs();
  renderGoals();
  renderDates();
  renderLetters();
  renderScoreBoard();
  renderMonitoring();
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
  syncRuntime.eventListener = null;
  syncRuntime.stateListener = null;
}

function disconnectRealtime() {
  disconnectRealtimeListeners();
  syncRuntime.connected = false;
  state.sync.connected = false;
  stopHeartbeat();
  updateSyncUI();
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


































