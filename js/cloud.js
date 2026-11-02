/* My Trading Cuh – cloud accounts + progress sync (Firebase Auth + Firestore).
 * Turned on by pasting a Firebase web config into TQ_CONFIG.cloud (see README). If it's empty, the app stays local-only.
 *
 * Passwords: users can pick ANY password (even 1 character). Firebase needs 6+ characters, so we never send the
 * raw password: we send a long SHA-256 of (email | password). Firebase only ever stores its own hash of that.
 *
 * Data: one document per user: users/{uid} = { profile: {...}, state: "<progress JSON>", updatedAt }
 * Security rules (paste in Firebase → Firestore → Rules):
 *   rules_version = '2';
 *   service cloud.firestore { match /databases/{db}/documents {
 *     match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
 *   } }
 */
(function () {
  'use strict';
  const CFG = window.TQ_CONFIG;
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  let fb = null, auth = null, db = null, ready = null;
  const timers = {};

  const enabled = () => !!(CFG.cloud && CFG.cloud.apiKey && CFG.cloud.projectId);

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
  }
  async function hex256(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const cloudPw = async (email, pw) => 'mtc1-' + await hex256(String(email).toLowerCase() + '|' + pw);

  // Load the SDK and wait until Firebase knows whether someone is already signed in.
  function init() {
    if (!enabled()) return Promise.resolve(null);
    if (ready) return ready;
    ready = (async () => {
      await loadScript(SDK + 'firebase-app-compat.js');
      await Promise.all([loadScript(SDK + 'firebase-auth-compat.js'), loadScript(SDK + 'firebase-firestore-compat.js')]);
      fb = window.firebase;
      if (!fb.apps.length) fb.initializeApp(CFG.cloud);
      auth = fb.auth(); db = fb.firestore();
      await auth.setPersistence(fb.auth.Auth.Persistence.LOCAL).catch(() => { });
      return new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    })();
    return ready;
  }

  function friendly(e) {
    const c = (e && e.code) || '';
    if (c === 'auth/email-already-in-use') return 'This email has an account already. Sign in instead.';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Wrong email or password.';
    if (c === 'auth/invalid-email') return 'Please enter a valid email.';
    if (c === 'auth/too-many-requests') return 'Too many tries. Wait a minute and try again.';
    if (c === 'auth/network-request-failed' || /load https/.test(e && e.message)) return 'Can\'t reach the server. Check your internet connection.';
    if (c === 'permission-denied') return 'The database blocked this. (Check the Firestore rules in the README.)';
    return 'Something went wrong (' + (c || (e && e.message) || 'unknown') + ').';
  }

  async function signUp(email, pw, profile, state) {
    await init();
    const cred = await auth.createUserWithEmailAndPassword(email, await cloudPw(email, pw));
    const uid = cred.user.uid;
    await db.collection('users').doc(uid).set({ profile, state: JSON.stringify(state), updatedAt: Date.now() });
    return uid;
  }
  async function signIn(email, pw) {
    await init();
    try { return (await auth.signInWithEmailAndPassword(email, await cloudPw(email, pw))).user.uid; }
    catch (e) {
      // After a "forgot password" email reset, Firebase holds the raw new password: accept it once, then switch it over.
      if (pw.length >= 6 && /credential|password|user-not-found/.test(e.code || '')) {
        const u = (await auth.signInWithEmailAndPassword(email, pw)).user;
        await u.updatePassword(await cloudPw(email, pw)).catch(() => { });
        return u.uid;
      }
      throw e;
    }
  }
  async function load(uid) {
    await init();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data(); let state = null;
    try { state = JSON.parse(d.state || 'null'); } catch (e) { state = null; }
    return { profile: d.profile || {}, state, updatedAt: d.updatedAt || 0 };
  }
  // Debounced: lots of small saves become one write every couple of seconds.
  function save(uid, state, profile) {
    if (!enabled() || !auth || !auth.currentUser || auth.currentUser.uid !== uid) return;
    clearTimeout(timers[uid]);
    timers[uid] = setTimeout(() => flush(uid, state, profile), 2000);
    timers['_' + uid] = () => flush(uid, state, profile);
  }
  function flush(uid, state, profile) {
    clearTimeout(timers[uid]); delete timers['_' + uid];
    const data = { state: JSON.stringify(state), updatedAt: state.updatedAt || Date.now() };
    if (profile) data.profile = profile;
    return db.collection('users').doc(uid).set(data, { merge: true }).catch(e => console.warn('cloud save failed', e));
  }
  function flushAll() { Object.keys(timers).filter(k => k[0] === '_').forEach(k => timers[k]()); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
  window.addEventListener('pagehide', flushAll);

  async function signOut() { flushAll(); if (auth) await auth.signOut().catch(() => { }); }
  async function resetEmail(email) { await init(); await auth.sendPasswordResetEmail(email); }
  const currentUid = () => (auth && auth.currentUser ? auth.currentUser.uid : null);

  window.TQ_Cloud = { enabled, init, signUp, signIn, signOut, load, save, flushAll, resetEmail, currentUid, friendly };
})();
