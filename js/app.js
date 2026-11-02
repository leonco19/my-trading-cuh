/* My Trading Cuh – main app (profiles, lessons, teaching methods, ratings & Lab, review, coach, news, progress) */
(function () {
  'use strict';
  const CFG = window.TQ_CONFIG, COURSE = window.TQ_COURSE, M = window.TQ_Methods, V = window.TQ_Voice, C = window.TQ_Cloud;
  const KEY = id => 'mtb:v1:' + id;
  const ACCTKEY = 'mtb:v1:accounts', SESSKEY = 'mtb:v1:session';
  const LABKEY = 'mtb:v1:lab';

  /* ───────── utils ───────── */
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = (d) => (d || new Date()).toLocaleDateString('en-CA');
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const fmt$ = v => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtR = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  function md(s) {
    return esc(s)
      .replace(/\[\[lesson:(\w+)\|([^\]]+)\]\]/g, '<a href="#" class="lesson-link" data-act="open-lesson" data-id="$1">📘 $2</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1<i>$2</i>')
      .replace(/\n/g, '<br>');
  }
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));

  /* ───────── course index ───────── */
  const LESSONS = [];
  COURSE.forEach((u, ui) => u.lessons.forEach((l, li) => LESSONS.push(Object.assign(l, { unit: u, ui, li, n: LESSONS.length }))));
  const LBYID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
  const isQ = c => c.t !== 'learn';
  const UBYID = Object.fromEntries(COURSE.map(u => [u.id, u]));
  const TRACKS = (window.TQ_TRACKS || [{ id: 'all', name: 'Everything', icon: '📚', color: '#4c8dff', desc: 'The whole course', units: COURSE.map(u => u.id) }])
    .map(t => Object.assign(t, { units: t.units.filter(id => UBYID[id]) }));
  const TBYID = Object.fromEntries(TRACKS.map(t => [t.id, t]));
  const trackUnits = tid => (TBYID[tid] || TRACKS[0]).units.map(id => UBYID[id]);
  const trackSeq = tid => [].concat(...trackUnits(tid).map(u => u.lessons));

  /* ───────── state ───────── */
  let S = null; // current profile state
  /* Accounts live on this device: email + password (stored only as a salted PBKDF2 hash). */
  const AVATARS = ['🦁', '🐺', '🦊', '🐯', '🐻', '🦅', '🐬', '🦈', '🐉', '🦄', '🐼', '🐸'];
  const COLORS = ['#4c8dff', '#9b6bff', '#00d68f', '#ff8a3d', '#ff4d6d', '#22d3ee', '#ffb627', '#ff86d0'];
  function accounts() { try { return JSON.parse(storeGet(ACCTKEY) || '[]') || []; } catch (e) { return []; } }
  function saveAccounts(list) { storeSet(ACCTKEY, JSON.stringify(list)); }
  const acctOf = id => accounts().find(a => a.id === id);
  const legacyOf = id => (CFG.profiles || []).find(x => x.id === id);
  const profileOf = id => acctOf(id) || legacyOf(id) || { id, name: 'Trader', avatar: '🙂', color: '#4c8dff' };
  const isOwnerId = id => { const a = acctOf(id); return id === CFG.owner || !!(a && CFG.ownerEmailHash && a.emailHash === CFG.ownerEmailHash); };
  // The boss = the owner's email AND the boss PIN entered once on this device.
  const BOSSKEY = id => 'mtb:v1:boss:' + id;
  const bossPinOK = id => !CFG.bossPinHash || storeGet(BOSSKEY(id)) === CFG.bossPinHash;
  const isOwnerEmail = () => !!S && isOwnerId(S.id);
  const isOwner = () => isOwnerEmail() && bossPinOK(S.id);
  const ownerName = () => { const a = accounts().find(x => isOwnerId(x.id)); return (a && a.name) || (legacyOf(CFG.owner) || {}).name || 'the boss'; };
  const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  async function sha256(t) {
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
    let h = 0x811c9dc5, g = 0x9e3779b9; for (let i = 0; i < t.length; i++) { h = Math.imul(h ^ t.charCodeAt(i), 16777619); g = Math.imul(g ^ h, 2246822519); } return 'x' + (h >>> 0).toString(16) + (g >>> 0).toString(16);
  }
  async function hashPw(pw, salt) {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
      return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256));
    }
    let x = salt + pw; for (let i = 0; i < 500; i++) x = await sha256(x + pw); return x;
  }
  const normEmail = e => String(e || '').trim().toLowerCase();
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  function fresh(p) {
    return {
      v: 1, id: p.id, name: p.name, age: null, email: '', onboarded: false, createdAt: Date.now(),
      xp: 0, dailyXp: {}, streak: { count: 0, last: null, best: 0 }, dailyGoal: CFG.defaultDailyGoal,
      lessons: {}, cards: {}, quizLog: [], reviews: 0,
      tracks: null, track: null, voice: { name: '', rate: 1 }, coachVoice: false,
      method: CFG.defaultMethod, ratings: [], myRequest: null, rejected: [], notice: null,
      arena: { balance: CFG.arena.startBalance, start: CFG.arena.startBalance, days: 0, trades: [], equity: [CFG.arena.startBalance], seed: Math.floor(Math.random() * 1e6) },
      chat: [], badges: {}, friends: {},
    };
  }
  function load(id) {
    const p = profileOf(id);
    let st = null; try { st = JSON.parse(storeGet(KEY(id)) || 'null'); } catch (e) { st = null; }
    const out = Object.assign(fresh(p), st || {});
    if (!M.METHODS[out.method]) out.method = CFG.defaultMethod;
    return out;
  }
  function save() {
    if (!S) return;
    S.updatedAt = Date.now();
    storeSet(KEY(S.id), JSON.stringify(S));
    const a = acctOf(S.id);
    if (a && a.cloud) C.save(S.id, S, { email: a.email, name: a.name, avatar: a.avatar, color: a.color, emailHash: a.emailHash });
  }
  // Keep a local copy of a cloud account (for the quick-pick buttons and offline use).
  function upsertAccount(acct) { const list = accounts().filter(x => x.id !== acct.id && x.email !== acct.email); list.push(acct); saveAccounts(list); }
  // Use whichever copy of the progress is newer: this device's or the cloud's.
  function mergeCloudState(uid, cloudData) {
    let local = null; try { local = JSON.parse(storeGet(KEY(uid)) || 'null'); } catch (e) { local = null; }
    const remote = cloudData && cloudData.state;
    const pick = !local ? remote : !remote ? local : ((remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local);
    if (pick) { pick.id = uid; storeSet(KEY(uid), JSON.stringify(pick)); }
  }
  async function moveOnline(la, pw) {
    let st = null; try { st = JSON.parse(storeGet(KEY(la.id)) || 'null'); } catch (e) { st = null; }
    const profile = { email: la.email, name: la.name, avatar: la.avatar, color: la.color, emailHash: la.emailHash || await sha256(la.email) };
    const state = Object.assign(fresh(profile), st || {}, { name: la.name, email: la.email, onboarded: true, updatedAt: Date.now() });
    const uid = await C.signUp(la.email, pw, profile, Object.assign({}, state, { id: '' }));
    state.id = uid; storeSet(KEY(uid), JSON.stringify(state));
    saveAccounts(accounts().filter(x => x.id !== la.id));
    upsertAccount(Object.assign({ id: uid, cloud: true, createdAt: la.createdAt || Date.now() }, profile));
    const L = lab(); L.requests.forEach(r => { if (r.learner === la.id) r.learner = uid; }); saveLab(L);
    toast('☁️ Your account is now online: sign in on any device', 'badge');
    return uid;
  }
  const localAcct = email => accounts().find(x => x.email === email && !x.cloud);
  function busy(f, on, label) { const b = f.querySelector('button[type=submit]'); if (!b) return; if (on) { b.dataset.l = b.textContent; b.textContent = label || 'One sec…'; b.disabled = true; } else { b.textContent = b.dataset.l || b.textContent; b.disabled = false; } }
  function saveOther(st) { if (S && st.id === S.id) { S = st; save(); } else storeSet(KEY(st.id), JSON.stringify(st)); }
  function lab() { try { return Object.assign({ requests: [] }, JSON.parse(storeGet(LABKEY) || 'null') || {}); } catch (e) { return { requests: [] }; } }
  function saveLab(L) { storeSet(LABKEY, JSON.stringify(L)); }
  const pendingCount = () => lab().requests.filter(r => r.status === 'pending').length;

  /* ───────── XP, rank, green days ───────── */
  const RANKS = ['Intern', 'Analyst', 'Junior Trader', 'Trader', 'Senior Trader', 'Desk Head', 'Portfolio Manager', 'Market Wizard'];
  const level = xp => Math.floor(Math.sqrt(xp / 25)) + 1;
  const levelXp = lv => 25 * (lv - 1) * (lv - 1);
  const title = lv => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 2))];
  function touchStreak() {
    const d = today(); const st = S.streak;
    if (st.last === d) return;
    st.count = st.last && daysBetween(st.last, d) === 1 ? st.count + 1 : 1;
    st.last = d; st.best = Math.max(st.best, st.count);
  }
  const liveStreakOf = st => st.streak.last && daysBetween(st.streak.last, today()) <= 1 ? st.streak.count : 0;
  const liveStreak = () => liveStreakOf(S);
  function addXP(n, why) {
    if (n <= 0) return;
    const before = level(S.xp);
    S.xp += n; S.dailyXp[today()] = (S.dailyXp[today()] || 0) + n;
    touchStreak(); checkBadges(); save(); renderTop();
    toast(`⚡ +${n} XP${why ? ' · ' + why : ''}`, 'xp');
    const lvNow = level(S.xp);
    if (lvNow > before) setTimeout(() => toast(`🚀 Promoted! You're now ${title(lvNow)} (Lv ${lvNow})`, 'level'), 600);
  }
  /* ───────── grading, mastery & spaced repetition ───────── */
  const DAY = 86400000, BOX_DAYS = [0, 1, 3, 7, 16, 35];
  function lessonDone(id) { return !!(S.lessons[id] && S.lessons[id].completedAt); }
  // Each track is an ordered path. A lesson opens when the lesson before it IN THAT TRACK is done.
  // Shared seasons (e.g. Risk Management) count everywhere: finish a lesson once and it's done in every track.
  const myTracks = () => (S.tracks && S.tracks.length ? S.tracks : TRACKS.map(t => t.id)).filter(id => TBYID[id]);
  const activeTrack = () => (myTracks().includes(S.track) ? S.track : myTracks()[0]);
  function unlockedIn(l, tid) { const seq = trackSeq(tid), i = seq.indexOf(l); return i === 0 || (i > 0 && lessonDone(seq[i - 1].id)); }
  function unlocked(l) {
    if (lessonDone(l.id)) return true;
    const mine = myTracks().filter(t => trackSeq(t).includes(l));
    return (mine.length ? mine : TRACKS.map(t => t.id)).some(t => unlockedIn(l, t));
  }
  function nextLesson(tid) { const l = trackSeq(tid || activeTrack()).find(x => !lessonDone(x.id)); return l ? l.id : null; }
  const myLessons = () => [...new Set([].concat(...myTracks().map(trackSeq)))];
  const myUnits = () => [...new Set([].concat(...myTracks().map(trackUnits)))];
  function stars(score) { return score >= 100 ? 3 : score >= 80 ? 2 : 1; }
  const letter = g => g >= 97 ? 'A+' : g >= 90 ? 'A' : g >= 80 ? 'B' : g >= 70 ? 'C' : g >= 60 ? 'D' : 'F';
  function weakLessons() {
    return LESSONS.filter(l => S.lessons[l.id] && S.lessons[l.id].last != null && (S.lessons[l.id].last < 80 || missedIn(l.id) > 0))
      .map(l => ({ id: l.id, title: l.title, unit: l.unit.title, score: S.lessons[l.id].last, missed: missedIn(l.id) }))
      .sort((a, b) => a.score - b.score);
  }
  function missedIn(lessonId) { return Object.entries(S.cards).filter(([k, v]) => k.startsWith(lessonId + ':') && v.last === false).length; }
  const dueAt = v => v.due != null ? v.due : (v.at || 0) + DAY;
  function dueCards() {
    const now = Date.now();
    return Object.entries(S.cards).filter(([k, v]) => v.last !== false && dueAt(v) <= now && lessonDone(k.split(':')[0])).sort((a, b) => dueAt(a[1]) - dueAt(b[1])).map(([k]) => k);
  }
  function unitMastery(u) {
    const ls = u.lessons.filter(l => S.lessons[l.id] && S.lessons[l.id].last != null);
    if (!ls.length) return null;
    return Math.round(ls.reduce((s, l) => s + S.lessons[l.id].last, 0) / u.lessons.length);
  }
  function avgGrade() {
    const g = Object.values(S.lessons).filter(x => x.last != null).map(x => x.last);
    return g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : 0;
  }
  function arenaStats(st) {
    const tr = (st || S).arena.trades;
    const wins = tr.filter(t => t.r > 0), losses = tr.filter(t => t.r <= 0);
    const avgW = wins.length ? wins.reduce((s, t) => s + t.r, 0) / wins.length : 0;
    const avgL = losses.length ? losses.reduce((s, t) => s + t.r, 0) / losses.length : 0;
    const totalR = tr.reduce((s, t) => s + t.r, 0);
    return { trades: tr.length, winRate: tr.length ? Math.round(wins.length / tr.length * 100) : 0, avgW, avgL, totalR, expectancy: tr.length ? totalR / tr.length : 0 };
  }
  function coachCtx() {
    const a = arenaStats();
    return {
      name: S.name, age: S.age, level: level(S.xp), xp: S.xp, streak: liveStreak(),
      done: LESSONS.filter(l => lessonDone(l.id)).length, total: myLessons().length, avgGrade: avgGrade(),
      weak: weakLessons(), next: nextLesson(), arena: a,
      strong: LESSONS.filter(l => S.lessons[l.id] && S.lessons[l.id].last >= 90).map(l => l.title),
    };
  }

  /* ───────── badges ───────── */
  const BADGES = [
    { id: 'first_lesson', icon: '👣', name: 'First Steps', desc: 'Complete your first lesson', test: () => LESSONS.some(l => lessonDone(l.id)) },
    { id: 'perfect', icon: '💯', name: 'Perfectionist', desc: 'Score 100% on a lesson', test: () => Object.values(S.lessons).some(x => x.best === 100) },
    { id: 'unit', icon: '🏅', name: 'Season Cleared', desc: 'Finish a whole season', test: () => COURSE.some(u => u.lessons.every(l => lessonDone(l.id))) },
    { id: 'risk', icon: '🛡️', name: 'Risk Manager', desc: 'Finish Risk Management with 90%+ mastery', test: () => { const u = COURSE.find(x => x.id === 'u4'); return u.lessons.every(l => lessonDone(l.id)) && unitMastery(u) >= 90; } },
    { id: 'streak3', icon: '🟢', name: 'Green Week Start', desc: '3 green days in a row', test: () => S.streak.best >= 3 },
    { id: 'streak7', icon: '📈', name: 'Bull Run', desc: '7 green days in a row', test: () => S.streak.best >= 7 },
    { id: 'combo5', icon: '🔥', name: 'Hot Hand', desc: '5 correct in a row in one session', test: () => !!S.badges._combo5 },
    { id: 'review3', icon: '🔁', name: 'Fixer', desc: 'Finish 3 review sessions', test: () => S.reviews >= 3 },
    { id: 'feedback', icon: '🗳️', name: 'Co-Designer', desc: 'Help shape the app with feedback', test: () => (S.ratings || []).some(r => r.reason) },
    { id: 'trade1', icon: '🎯', name: 'First Trade', desc: 'Take a trade in the Arena', test: () => S.arena.trades.length >= 1 },
    { id: 'journal10', icon: '📓', name: 'Journal Keeper', desc: 'Journal 10 Arena trades', test: () => S.arena.trades.filter(t => t.setup).length >= 10 },
    { id: 'disciplined', icon: '🧘', name: 'Disciplined Day', desc: 'Finish an Arena day with trades and zero rule breaks', test: () => !!S.badges._discDay },
    { id: 'trades50', icon: '🏋️', name: 'Grinder', desc: '50 Arena trades', test: () => S.arena.trades.length >= 50 },
    { id: 'edge', icon: '🧠', name: 'Edge Found', desc: 'Positive expectancy over 30+ trades', test: () => S.arena.trades.length >= 30 && arenaStats().expectancy > 0 },
    { id: 'grad', icon: '🎓', name: 'Graduate', desc: 'Pass the final exam (80%+)', test: () => (S.lessons.u8l3 || {}).best >= 80 },
  ];
  function checkBadges() {
    for (const b of BADGES) if (!S.badges[b.id] && b.test()) { S.badges[b.id] = Date.now(); setTimeout(() => toast(`${b.icon} Badge unlocked: ${b.name}`, 'badge'), 900); }
  }

  /* ───────── toast & modal ───────── */
  function toast(text, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2800); setTimeout(() => t.remove(), 3300);
  }
  function confirmBox(text, okLabel) {
    return new Promise(res => {
      const m = $('#modal');
      m.innerHTML = `<div class="modal-card"><p>${esc(text)}</p><div class="row end"><button class="btn ghost" data-r="0">Cancel</button><button class="btn danger" data-r="1">${esc(okLabel || 'Yes')}</button></div></div>`;
      m.hidden = false;
      m.onclick = e => { const b = e.target.closest('[data-r]'); if (!b && e.target !== m) return; m.hidden = true; m.onclick = null; res(b && b.dataset.r === '1'); };
    });
  }
  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch (e) { const m = $('#modal'); m.innerHTML = `<div class="modal-card"><p>Copy this:</p><textarea readonly class="codebox">${esc(text)}</textarea><div class="row end"><button class="btn primary" data-r="0">Done</button></div></div>`; m.hidden = false; m.onclick = ev => { if (ev.target.closest('[data-r]')) { m.hidden = true; m.onclick = null; } }; m.querySelector('textarea').select(); }
  }
  async function sendMsg(text) {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  const methodChip = id => { const m = M.METHODS[id]; return `<span class="mchip">${m.icon} ${esc(m.name)}</span>`; };

  /* ───────── routing ───────── */
  const VIEWS = ['learn', 'arena', 'review', 'coach', 'news', 'progress', 'lab'];
  let view = 'learn';
  function go(v) { V.stop(); coachTalk = false; view = VIEWS.includes(v) ? v : 'learn'; if (view === 'lab' && !isOwnerEmail()) view = 'learn'; if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); render(); }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S && S.onboarded && h !== view && VIEWS.includes(h)) go(h); });

  /* ───────── sign in / create account ───────── */
  let authMode = null, authEmail = '';
  // Invite-only testing: online copies ask for the invite code once per device. Your own PC (localhost) skips it.
  const INVKEY = 'mtb:v1:invite';
  const isLocal = () => location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const needInvite = () => !!CFG.inviteHash && !isLocal() && storeGet(INVKEY) !== CFG.inviteHash;
  function renderInvite() {
    document.body.classList.add('no-shell');
    $('#app').innerHTML = `<div class="picker welcome"><div class="logo-big"><span class="logo-mark">◢</span> ${esc(CFG.appName)}</div><div class="w-hero">🔐</div><h1>Invite only (for now)</h1>
      <p class="muted">This app is still being tested. Enter the invite code you got from ${esc(ownerName())}.</p>
      <form class="onboard" id="invform" novalidate><label>Invite code<input name="code" autocomplete="off" autocapitalize="characters" placeholder="XXXX-0000"></label>
      <div class="err" id="inv-err"></div><button class="btn primary big" type="submit">Let me in</button></form></div>`;
    const f = $('#invform'); f.elements.code.focus();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const code = f.elements.code.value.trim().toUpperCase().replace(/\s+/g, '');
      if (code && await sha256(code) === CFG.inviteHash) { storeSet(INVKEY, CFG.inviteHash); renderAuth('welcome'); }
      else { $('#inv-err').textContent = 'That code isn\'t right. Ask ' + ownerName() + ' for it.'; f.elements.code.select(); }
    });
  }
  function renderAuth(mode) {
    if (needInvite()) return renderInvite();
    document.body.classList.add('no-shell');
    authMode = mode || authMode || 'welcome';
    const list = accounts();
    const logo = `<div class="logo-big"><span class="logo-mark">◢</span> ${esc(CFG.appName)}</div>`;
    if (authMode === 'welcome') {
      $('#app').innerHTML = `<div class="picker welcome">${logo}<div class="w-hero">📈</div><h1>Learn to trade. For real.</h1>
        <p class="muted">Lessons, a trading simulator, and Cuh, your coach. All with virtual money.</p>
        <div class="w-btns"><button class="btn primary big" data-act="auth-mode" data-m="signin">Sign in</button>
        <button class="btn ghost big" data-act="auth-mode" data-m="signup">Create account</button></div></div>`;
      return;
    }
    const back = '<button type="button" class="btn ghost" data-act="auth-mode" data-m="welcome">← Back</button>';
    if (authMode === 'signin') {
      $('#app').innerHTML = `<div class="picker">${logo}<h1>Welcome back</h1>
        ${list.length ? `<div class="quick">${list.map(x => `<button class="qacct" data-act="quick-acct" data-email="${esc(x.email)}" style="--pc:${x.color}"><span class="avatar sm">${x.avatar}</span>${esc(x.name)}</button>`).join('')}</div>` : ''}
        <form class="onboard" id="authform" novalidate>
          <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(authEmail)}" placeholder="you@example.com"></label>
          <label>Password<span class="pw"><input name="password" type="password" autocomplete="current-password" required><button type="button" class="eye" data-act="toggle-pw" title="Show password">👁️</button></span></label>
          <label class="check"><input type="checkbox" name="stay" checked> Stay signed in on this device</label>
          <div class="err" id="ob-err"></div>
          <button class="btn primary big" type="submit">Sign in</button>
          <p class="muted small center-t">New here? <a href="#" data-act="auth-mode" data-m="signup">Create an account</a></p>
          ${back}
          <p class="muted small center-t">${C.enabled() ? 'Forgot your password? <a href="#" data-act="forgot-pw">Email me a reset link</a>' : `Forgot your password? ${esc(ownerName())} can reset it in the 🧪 Lab on this device.`}</p>
        </form></div>`;
    } else {
      const legacy = (CFG.profiles || []).map(p => ({ p, st: (() => { try { return JSON.parse(storeGet(KEY(p.id)) || 'null'); } catch (e) { return null; } })() }))
        .filter(x => x.st && x.st.onboarded && !acctOf(x.p.id) && !storeGet(KEY(x.p.id) + ':claimed'));
      $('#app').innerHTML = `<div class="picker">${logo}<h1>Create your account</h1><p class="muted">You sign in with your email and password.</p>
        <form class="onboard" id="authform" novalidate>
          <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(authEmail)}" placeholder="you@example.com"><span class="field-msg" id="email-msg"></span></label>
          <label>Password<span class="pw"><input name="password" type="password" autocomplete="new-password" required><button type="button" class="eye" data-act="toggle-pw" title="Show password">👁️</button></span></label>
          <label>What should Cuh call you?<input name="name" required maxlength="30" placeholder="Your name"></label>
          <label>Age<input name="age" type="number" min="10" max="99" required placeholder="e.g. 17"></label>
          <div class="lbl">Pick your avatar</div><div class="avatars">${AVATARS.map((av, i) => `<label class="av-opt"><input type="radio" name="avatar" value="${i}" ${i === list.length % AVATARS.length ? 'checked' : ''}><span>${av}</span></label>`).join('')}</div>
          ${legacy.length ? `<label>Bring over saved progress?<select name="legacy"><option value="">No, start fresh</option>${legacy.map(x => `<option value="${x.p.id}">${x.p.avatar} ${esc(x.st.name)} · Lv ${level(x.st.xp || 0)} · ${x.st.xp || 0} XP</option>`).join('')}</select></label>` : ''}
          <label class="check"><input type="checkbox" name="stay" checked> Stay signed in on this device</label>
          <p class="muted small">🔒 Saved only on this device. Your password is stored scrambled, never as plain text.</p>
          <div class="err" id="ob-err"></div>
          <button class="btn primary big" type="submit">Create account 🚀</button>
          <p class="muted small center-t">Already have an account? <a href="#" data-act="auth-mode" data-m="signin">Sign in</a></p>
          ${back}
        </form></div>`;
    }
    const f = $('#authform');
    if (authMode === 'signup') {
      const em = f.elements.email, msg = $('#email-msg');
      const checkEmail = () => {
        const taken = accounts().some(x => x.email === normEmail(em.value));
        msg.innerHTML = taken ? '⚠️ This email has an account already. <a href="#" data-act="auth-mode" data-m="signin">Sign in instead</a>' : '';
        em.classList.toggle('bad-in', taken);
      };
      em.addEventListener('input', checkEmail); checkEmail();
    }
    f.addEventListener('submit', e => { e.preventDefault(); authMode === 'signin' ? doSignIn(f) : doSignUp(f); });
    const first = f.querySelector(authEmail ? 'input[name=password]' : 'input[name=email]'); if (first) first.focus();
  }
  function startSession(id, stay) {
    try { sessionStorage.setItem(SESSKEY, id); } catch (e) { }
    storeSet(SESSKEY, stay ? id : '');
    authEmail = '';
    enter(id);
  }
  async function doSignIn(f) {
    const err = $('#ob-err'); const email = normEmail(f.email.value), pw = f.password.value;
    if (!validEmail(email)) { err.textContent = 'Please enter your email.'; return; }
    if (!pw) { err.textContent = 'Please enter your password.'; return; }
    if (C.enabled()) {
      err.textContent = ''; busy(f, true, 'Signing in…');
      try {
        const uid = await C.signIn(email, pw);
        const d = await C.load(uid);
        const pr = (d && d.profile) || {};
        upsertAccount({ id: uid, email, name: pr.name || email.split('@')[0], avatar: pr.avatar || AVATARS[0], color: pr.color || COLORS[0], emailHash: pr.emailHash || await sha256(email), cloud: true });
        mergeCloudState(uid, d);
        busy(f, false); return startSession(uid, f.stay.checked);
      } catch (e2) {
        const la = localAcct(email);
        if (la && /credential|user-not-found|wrong-password/.test(e2.code || '') && await hashPw(pw, la.salt) === la.hash) {
          try { busy(f, true, 'Moving your account online…'); const uid = await moveOnline(la, pw); busy(f, false); return startSession(uid, f.stay.checked); }
          catch (e3) { busy(f, false); err.textContent = C.friendly(e3); return; }
        }
        busy(f, false); err.textContent = C.friendly(e2); return;
      }
    }
    const a = accounts().find(x => x.email === email);
    if (!a) { err.innerHTML = `No account with this email on this device. <a href="#" data-act="auth-mode" data-m="signup">Create one?</a>`; authEmail = email; return; }
    err.textContent = '';
    if (await hashPw(pw, a.salt) !== a.hash) { err.textContent = 'Wrong password. Try again.'; f.password.select(); return; }
    startSession(a.id, f.stay.checked);
  }
  async function doSignUp(f) {
    const err = $('#ob-err'); const E = f.elements; const email = normEmail(E.email.value), pw = E.password.value, name = E.namedItem('name').value.trim(), age = +E.age.value;
    const la0 = C.enabled() ? localAcct(email) : null;
    if (la0 && pw && await hashPw(pw, la0.salt) === la0.hash) {
      busy(f, true, 'Moving your account online…');
      try { const uid = await moveOnline(la0, pw); busy(f, false); return startSession(uid, E.stay.checked); }
      catch (e3) { busy(f, false); err.textContent = C.friendly(e3); return; }
    }
    const e = !validEmail(email) ? 'Please enter a valid email.' : accounts().some(x => x.email === email && (!C.enabled() || x.cloud)) ? 'This email has an account already. Sign in instead.' : la0 ? 'This email already has an account on this device. Use the same password to move it online, or sign in.' : !pw ? 'Please choose a password (anything you like).' : !name ? 'Tell Cuh what to call you.' : !(age >= 10 && age <= 99) ? 'Please enter a valid age.' : '';
    if (e) { err.textContent = e; return; }
    err.textContent = '';
    const legacyId = E.legacy ? E.legacy.value : '';
    if (C.enabled()) {
      const ai2 = +((f.querySelector('input[name=avatar]:checked') || {}).value || 0);
      const profile = { email, name, avatar: AVATARS[ai2], color: COLORS[accounts().length % COLORS.length], emailHash: await sha256(email) };
      // Bring old progress from this device if they picked it, otherwise start fresh.
      let st0 = null; if (legacyId) { try { st0 = JSON.parse(storeGet(KEY(legacyId)) || 'null'); } catch (x) { st0 = null; } }
      busy(f, true, 'Creating your account…');
      try {
        const base = Object.assign(fresh(profile), st0 || {}, { name, email, age, onboarded: true, updatedAt: Date.now() });
        const uid = await C.signUp(email, pw, profile, Object.assign({}, base, { id: '' }));
        base.id = uid; storeSet(KEY(uid), JSON.stringify(base));
        if (legacyId) storeSet(KEY(legacyId) + ':claimed', uid);
        upsertAccount(Object.assign({ id: uid, cloud: true, createdAt: Date.now() }, profile));
        busy(f, false);
        if (age < 18) setTimeout(() => toast('🎮 Simulator mode: practice now, real money at 18', 'level'), 600);
        return startSession(uid, E.stay.checked);
      } catch (e2) { busy(f, false); err.textContent = C.friendly(e2); return; }
    }
    const id = legacyId || 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ai = +((f.querySelector('input[name=avatar]:checked') || {}).value || 0);
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const acct = { id, email, name, avatar: AVATARS[ai], color: COLORS[accounts().length % COLORS.length], salt, hash: await hashPw(pw, salt), emailHash: await sha256(email), createdAt: Date.now() };
    saveAccounts(accounts().concat([acct]));
    const st = load(id); Object.assign(st, { name, email, age, onboarded: true }); storeSet(KEY(id), JSON.stringify(st));
    if (age < 18) setTimeout(() => toast('🎮 Simulator mode: practice now, real money at 18', 'level'), 600);
    startSession(id, E.stay.checked);
  }
  function enter(id) {
    const a = acctOf(id); if (!a) { S = null; return renderAuth('signin'); }
    S = load(id); V.set(S.voice);
    Object.assign(S, { name: a.name, email: a.email, onboarded: true }); save();
    syncRequest();
    document.body.classList.remove('no-shell');
    go(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'learn');
    const n = isOwner() ? pendingCount() : 0;
    if (n) setTimeout(() => toast(`🧪 ${n} teaching-method request${n > 1 ? 's' : ''} waiting in your Lab`, 'level'), 500);
  }
  function signOut() {
    if (C.enabled()) C.signOut();
    try { sessionStorage.removeItem(SESSKEY); } catch (e) { }
    storeSet(SESSKEY, '');
    if (S) authEmail = S.email || '';
    S = null; P = null; $('#overlay').hidden = true;
    history.replaceState(null, '', location.pathname + location.search);
    renderAuth('welcome');
  }
  async function resetPassword(id) {
    const a = acctOf(id); if (!a) return;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-card"><h3>New password for ${esc(a.name)}</h3><p class="muted small">${esc(a.email)}</p><input id="newpw" type="text" placeholder="New password" style="width:100%"><div class="err" id="pwerr"></div>
      <div class="row end"><button class="btn ghost" data-r="0">Cancel</button><button class="btn primary" data-r="1">Save</button></div></div>`;
    m.hidden = false; $('#newpw').focus();
    m.onclick = async e => {
      const b = e.target.closest('[data-r]'); if (!b && e.target !== m) return;
      if (b && b.dataset.r === '1') {
        const pw = $('#newpw').value; if (!pw) { $('#pwerr').textContent = 'Type a new password.'; return; }
        const list = accounts(); const x = list.find(y => y.id === id); x.salt = hex(crypto.getRandomValues(new Uint8Array(16))); x.hash = await hashPw(pw, x.salt); saveAccounts(list);
        toast(`🔑 New password saved for ${a.name}`, 'badge');
      }
      m.hidden = true; m.onclick = null;
    };
  }

  /* ───────── track picker ───────── */
  function renderTrackPicker() {
    document.body.classList.add('no-shell');
    const sel = new Set(S._pickTracks || S.tracks || []);
    $('#app').innerHTML = `<div class="picker"><h1>What do you want to learn?</h1><p class="muted">Pick one or more. You can change this any time in Stats.</p>
      <div class="tracks">${TRACKS.map(t => { const n = trackSeq(t.id).length; return `<button class="track-card ${sel.has(t.id) ? 'on' : ''}" data-act="toggle-track" data-id="${t.id}" style="--tc:${t.color}">
        <span class="tc-check">${sel.has(t.id) ? '✓' : ''}</span><span class="tc-icon">${t.icon}</span><b>${esc(t.name)}</b><span class="muted small">${esc(t.desc)}</span><span class="tc-n">${t.units.length} seasons · ${n} lessons</span></button>`; }).join('')}</div>
      <button class="btn primary big" data-act="save-tracks" ${sel.size ? '' : 'disabled'}>Let's go 🚀</button>
      ${S.tracks && S.tracks.length ? '<button class="btn ghost" data-act="cancel-tracks" style="margin-top:8px">Cancel</button>' : ''}</div>`;
  }

  /* ───────── shell ───────── */
  function renderShell() {
    const want = isOwnerEmail() ? 'owner' : 'learner';
    if ($('#shell') && $('#shell').dataset.kind === want) return;
    const nav = [['learn', '🏠', 'Desk'], ['arena', '🕹️', 'Arena'], ['review', '🔁', 'Review'], ['coach', '😎', 'Cuh'], ['news', '📰', 'News'], ['progress', '📊', 'Stats']];
    if (isOwnerEmail()) nav.push(['lab', '🧪', 'Lab']);
    $('#app').innerHTML = `<div id="shell" data-kind="${want}">
      <nav class="side"><div class="logo"><span class="logo-mark">◢</span> <span>${esc(CFG.appName)}</span></div>${nav.map(([v, i, t]) => `<a href="#${v}" class="nav-${v}" data-act="go" data-v="${v}"><span class="ni">${i}</span><span class="nt">${t}</span>${v === 'lab' ? '<span class="dot" id="labdot" hidden></span>' : ''}</a>`).join('')}
        <a href="#" class="switch" data-act="check-updates"><span class="ni">🔄</span><span class="nt">Check for updates</span></a>
        <a href="#" class="switch2" data-act="switch"><span class="ni">🚪</span><span class="nt">Sign out</span></a></nav>
      <div class="col"><header class="top" id="top"></header><main id="main"></main></div></div>`;
  }
  function renderTop() {
    const t = $('#top'); if (!t || !S) return;
    const lv = level(S.xp);
    const dx = S.dailyXp[today()] || 0, pct = Math.min(100, Math.round(dx / S.dailyGoal * 100));
    const p = profileOf(S.id);
    t.innerHTML = `<div class="who" data-act="go" data-v="progress" title="Your stats"><span class="avatar sm" style="--pc:${p.color}">${p.avatar}</span><div><b>${esc(S.name)}</b><div class="muted small">${title(lv)} · Lv ${lv}</div></div></div>
      <div class="chips"><span class="chip tick" title="Total XP">⚡ ${S.xp}${dx ? ` <em>+${dx}</em>` : ''}</span><span class="chip fire" title="Green days in a row">🟢 ${liveStreak()}</span>
      <span class="chip goal" title="Today's target">${ring(pct)} ${dx}/${S.dailyGoal}</span></div>`;
    const dot = $('#labdot'); if (dot) { const n = pendingCount(); dot.hidden = !n; dot.textContent = n; }
  }
  function ring(p) { const r = 9, c = 2 * Math.PI * r; return `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="${r}" fill="none" stroke="#263052" stroke-width="3"/><circle cx="11" cy="11" r="${r}" fill="none" stroke="#00d68f" stroke-width="3" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 11 11)" stroke-linecap="round"/></svg>`; }

  function render() {
    if (!S) return renderAuth();
    if (!S.tracks || !S.tracks.length) return renderTrackPicker();
    renderShell(); renderTop();
    document.querySelectorAll('nav.side a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
    const m = $('#main'); m.scrollTop = 0;
    if (window.TQ_Arena && view !== 'arena') window.TQ_Arena.pause();
    ({ learn: renderLearn, arena: () => window.TQ_Arena.render(m), review: renderReview, coach: renderCoach, news: renderNews, progress: renderProgress, lab: renderLab })[view](m);
  }

  /* ───────── method-change requests (learner side) ───────── */
  // Same device: pick up Leon's decision from the shared Lab store.
  function syncRequest() {
    const r = S.myRequest; if (!r) return;
    const l = lab().requests.find(x => x.id === r.id);
    if (l && l.status === 'approved') { if (S.method !== l.decidedTo) applyMethodTo(S, l.decidedTo, 'approved'); else { S.myRequest = null; save(); } }
    else if (l && l.status === 'declined') { S.rejected = [...new Set((S.rejected || []).concat(r.to))]; S.myRequest = null; S.notice = { type: 'declined', to: r.to }; save(); }
  }
  function applyMethodTo(st, to, how) {
    st.method = to; st.myRequest = null; st.notice = { type: how, to, at: Date.now() };
    saveOther(st);
  }
  function requestBanner() {
    let h = '';
    const n = S.notice;
    if (n) {
      const mm = M.METHODS[n.to];
      h += n.type === 'declined'
        ? `<div class="banner"><b>${esc(ownerName())} kept your current style</b> for now (${methodChip(S.method)}). Keep rating lessons, it still counts. <button class="btn ghost sm" data-act="dismiss-notice">OK</button></div>`
        : `<div class="banner good">✅ <b>${n.type === 'approved' && !isOwner() ? esc(ownerName()) + ' approved it!' : 'Done!'}</b> You now learn with ${methodChip(n.to)}: ${esc(mm.tagline)} <button class="btn ghost sm" data-act="dismiss-notice">Nice</button></div>`;
    }
    const r = S.myRequest;
    if (r && !isOwner()) h += `<div class="banner warn">⏳ <b>Waiting for ${esc(ownerName())}</b> to OK switching you to ${methodChip(r.to)}.
      <div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="tell-owner">📲 Message ${esc(ownerName())}</button><input id="apprcode" placeholder="Approval code" maxlength="8" style="width:140px"><button class="btn ghost sm" data-act="use-code">Use code</button></div></div>`;
    return h;
  }
  function requestMessage(r) {
    return `Hey ${ownerName()}! ${r.name} rated "${M.METHODS[r.from].name}" ${r.stars}★ after "${r.lesson}".\nReason: ${r.reasonLabel}${r.text ? ' – "' + r.text + '"' : ''}\nThe app suggests switching ${r.name} to ${M.METHODS[r.to].icon} ${M.METHODS[r.to].name}.\n\nOpen ${CFG.appName} → 🧪 Lab → paste this code:\nMTBR.${b64e(r)}`;
  }

  /* ───────── LEARN (the desk) ───────── */
  function renderLearn(m) {
    syncRequest();
    const tid = activeTrack(), tr = TBYID[tid], units = trackUnits(tid);
    const nx = nextLesson(tid), nl = nx && LBYID[nx];
    const p = profileOf(S.id);
    const dx = S.dailyXp[today()] || 0;
    const lv = level(S.xp), cur = S.xp - levelXp(lv), need = levelXp(lv + 1) - levelXp(lv);
    const due = dueCards().length, missed = Object.values(S.cards).filter(v => v.last === false).length;
    let html = `<section class="stock-card" style="--pc:${p.color}">
        <div class="sc-left"><div class="sc-tick">${esc(S.name)}'s desk</div>
          <div class="sc-price">${title(lv)} <span class="muted">Lv ${lv}</span></div>
          <div class="sc-promo"><div class="bar"><div style="width:${Math.round(cur / need * 100)}%"></div></div><span class="muted small">${need - cur} XP to your next promotion</span></div>
          <div class="sc-meta"><span>⚡ <b>${S.xp}</b> XP</span><span>🟢 <b>${liveStreak()}</b> green day${liveStreak() === 1 ? '' : 's'}</span><span>🎯 <b>${dx}/${S.dailyGoal}</b> today</span><span>${methodChip(S.method)}</span></div></div></section>`;
    const myAcct = acctOf(S.id);
    if (C.enabled() && myAcct && !myAcct.cloud) html += `<div class="banner sim" id="move-banner">☁️ <b>Your account is only saved on this device.</b> Move it online so it works on your phone <i>and</i> PC, with all your progress. Just type your password:
      <form class="row" id="moveform" style="margin-top:8px"><input type="password" name="pw" placeholder="Your password" autocomplete="current-password" style="flex:1;min-width:140px"><button class="btn primary sm" type="submit">Move online</button></form><div class="err" id="move-err"></div></div>`;
    html += requestBanner();
    if (S.age && S.age < 18) html += `<div class="banner sim">🎮 <b>Simulator mode.</b> Everything here uses virtual money. Build the skill now, so you're ready for real markets at 18.</div>`;
    if (missed + due) html += `<div class="banner warn">🔁 <b>${missed + due} card${missed + due > 1 ? 's' : ''} ready to review</b>${missed ? ` (${missed} you missed${due ? `, ${due} due so you don't forget` : ''})` : ' (due so you don\'t forget)'}. <a href="#review" data-act="go" data-v="review">Review now →</a></div>`;
    if (myTracks().length > 1) html += `<div class="track-tabs">${myTracks().map(t => { const T = TBYID[t], seq = trackSeq(t), d = seq.filter(x => lessonDone(x.id)).length; return `<button class="ttab ${t === tid ? 'on' : ''}" data-act="set-track" data-id="${t}" style="--tc:${T.color}">${T.icon} ${esc(T.name)} <small>${d}/${seq.length}</small></button>`; }).join('')}</div>`;
    if (nl) html += `<section class="next-card" style="--uc:${nl.unit.color}"><div class="nc-icon">${nl.icon}</div><div class="nc-body"><div class="nc-kicker">NEXT UP · ${esc(tr.name.toUpperCase())} · SEASON ${units.indexOf(nl.unit) + 1}</div><h2>${esc(nl.title)}</h2>
        <div class="muted small">${methodChip(S.method)} ${esc(M.METHODS[S.method].tagline)}</div></div><div class="nc-btns"><button class="btn primary big" data-act="open-lesson" data-id="${nl.id}">Start ▶</button>${S.method !== 'voice' && V.canSpeak ? `<button class="btn ghost" data-act="open-voice" data-id="${nl.id}" title="Try this lesson with the Voice Teacher">🎧 Listen instead</button>` : ''}</div></section>`;
    else html += `<div class="banner good">🎓 <b>You finished the ${esc(tr.name)} track!</b> Keep it sharp in Review${myTracks().length < TRACKS.length ? ', or add another track in Stats' : ''}.</div>`;
    units.forEach((u, ui) => {
      const open = u.lessons.some(l => unlocked(l)), done = u.lessons.filter(l => lessonDone(l.id)).length, mast = unitMastery(u);
      html += `<section class="season ${open ? '' : 'locked'}" style="--uc:${u.color}"><header class="season-head"><span class="season-num">S${ui + 1}</span><div><h2>${u.icon} ${esc(u.title)}</h2><div class="muted small">${esc(u.subtitle)}</div></div>
        <div class="season-prog"><b>${done}/${u.lessons.length}</b>${mast != null ? `<span class="muted small">${letter(mast)} avg</span>` : ''}</div></header><div class="season-bar"><div style="width:${done / u.lessons.length * 100}%"></div></div><div class="lrows">`;
      u.lessons.forEach(l => {
        const st = S.lessons[l.id], isDone = lessonDone(l.id), ok = unlocked(l), isCur = l.id === nx;
        const right = isDone ? `<span class="gbadge ${st.last < 80 ? 'low' : ''}">${letter(st.last)}<small>${st.last}%</small></span>` : isCur ? '<span class="tag-next">NEXT</span>' : ok ? '' : '<span class="lock">🔒</span>';
        html += `<button class="lrow ${isDone ? 'done' : ''} ${isCur ? 'cur' : ''}" ${ok ? `data-act="open-lesson" data-id="${l.id}"` : 'disabled'}><span class="licon">${l.icon}</span><span class="ltitle">${esc(l.title)}<small>${l.cards.filter(isQ).length} questions · +${l.xp} XP</small></span>${right}</button>`;
      });
      html += `</div></section>`;
    });
    m.innerHTML = `<div class="learn">${html}</div>`;
    const mf = $('#moveform');
    if (mf) mf.addEventListener('submit', async e => {
      e.preventDefault();
      const la = acctOf(S.id), pw = mf.elements.pw.value, er = $('#move-err'), b = mf.querySelector('button');
      if (!pw) { er.textContent = 'Type your password first.'; return; }
      if (await hashPw(pw, la.salt) !== la.hash) { er.textContent = 'That\'s not this account\'s password.'; return; }
      b.disabled = true; b.textContent = 'Moving…'; er.textContent = '';
      try {
        save();
        const uid = await moveOnline(la, pw);
        try { sessionStorage.setItem(SESSKEY, uid); } catch (x) { }
        if (storeGet(SESSKEY)) storeSet(SESSKEY, uid);
        enter(uid);
      } catch (x) {
        b.disabled = false; b.textContent = 'Move online';
        er.textContent = (x && x.code === 'auth/email-already-in-use') ? 'This email is already online. Sign out, then sign in with the password you used for the online account.' : C.friendly(x);
      }
    });
  }

  /* ───────── LESSON / QUIZ PLAYER ───────── */
  let P = null; // player state
  const REPLIES = ['Got it 👍', 'Makes sense', 'Ok, and?', 'Go on…', 'Sick 🔥', 'Next one', 'Easy 😎', 'Say less'];
  const RUSH_SECS = { mcq: 25, tf: 15, num: 45 };
  function openLesson(id, methodOverride) {
    const l = LBYID[id]; if (!l || !unlocked(l)) return;
    V.stop();
    const method = methodOverride || S.method;
    const steps = M.buildSteps(l, method).map(s => Object.assign(s, s.ci != null ? { c: l.cards[s.ci], key: l.id + ':' + s.ci } : {}));
    P = { kind: 'lesson', lesson: l, method, steps, queue: steps.map((_, i) => i), pos: 0, first: {}, marks: [], mistakes: [], predicts: {}, combo: 0, bestCombo: 0, bub: 1 };
    renderPlayer();
  }
  function openReview() {
    const missed = Object.entries(S.cards).filter(([, v]) => v.last === false).sort((a, b) => a[1].at - b[1].at).map(([k]) => k);
    let keys = missed.slice(0, 10);
    keys = keys.concat(dueCards().filter(k => !keys.includes(k)).slice(0, 10 - keys.length));
    if (keys.length < 6) {
      const pool = [];
      LESSONS.filter(l => lessonDone(l.id)).forEach(l => l.cards.forEach((c, i) => { const k = l.id + ':' + i; if (isQ(c) && !keys.includes(k)) pool.push({ k, w: (S.cards[k] || {}).wrong || 0 }); }));
      pool.sort((a, b) => b.w - a.w || Math.random() - 0.5);
      keys = keys.concat(pool.slice(0, 8 - keys.length).map(x => x.k));
    }
    if (!keys.length) { toast('Finish a lesson first, then come back to review!'); return; }
    keys.sort(() => Math.random() - 0.5); // interleave topics
    const steps = keys.map(k => { const [lid, i] = k.split(':'); return { k: 'q', ci: +i, c: LBYID[lid].cards[+i], key: k, from: LBYID[lid] }; });
    P = { kind: 'review', lesson: { title: 'Review: mixed & due', icon: '🔁', xp: 0 }, method: 'review', steps, queue: steps.map((_, i) => i), pos: 0, first: {}, marks: [], mistakes: [], predicts: {}, combo: 0, bestCombo: 0, bub: 1 };
    renderPlayer();
  }
  function stopTimer() { if (P && P.timer) { clearInterval(P.timer); P.timer = null; } }
  function closePlayer() { stopTimer(); V.stop(); P = null; $('#overlay').hidden = true; $('#overlay').innerHTML = ''; render(); }
  const curStep = () => { const i = P.queue[P.pos]; return { i, s: P.steps[i] }; };

  function candles() {
    return `<div class="cprog">${P.queue.map((si, j) => { const k = P.steps[si].k; const cls = j < P.pos ? (P.marks[j] || 'seen') : j === P.pos ? 'now' : ''; return `<i class="${cls} ${k === 'q' ? 'q' : ''}"></i>`; }).join('')}</div>`;
  }
  function questionHTML(c, s) {
    let h = `<h2 class="q">${esc(c.q)}</h2>${c.chart ? '<canvas class="lesson-chart"></canvas>' : ''}`;
    if (c.t === 'mcq') h += `<div class="opts">${c.opts.map((op, i) => `<button class="opt" data-act="sel" data-i="${i}"><span class="k">${'ABCD'[i]}</span>${esc(op)}</button>`).join('')}</div>`;
    if (c.t === 'tf') h += `<div class="opts tf"><button class="opt bull" data-act="sel" data-i="1">🐂 <span>True</span></button><button class="opt bear" data-act="sel" data-i="0">🐻 <span>False</span></button></div>`;
    if (c.t === 'num') h += `<div class="num-in"><input id="numans" type="number" step="any" inputmode="decimal" placeholder="Your answer"><span>${esc(c.suffix || '')}</span></div>`;
    return h;
  }
  const bro = (txt) => `<div class="bro-line"><span class="bro-av">😎</span><span>${txt}</span></div>`;

  function renderPlayer() {
    stopTimer();
    const o = $('#overlay'); o.hidden = false;
    const { i, s } = curStep(); const c = s.c;
    const mm = M.METHODS[P.method];
    let body = '', btn = { act: 'next', label: 'Continue', disabled: false };
    if (s.k === 'learn') {
      body = `<h2>${esc(c.title)}</h2>${c.chart ? '<canvas class="lesson-chart"></canvas>' : ''}<div class="learn-html">${c.html}</div>`;
    } else if (s.k === 'chat') {
      const bs = M.bubbles(c.html); s.n = bs.length;
      const shown = bs.slice(0, P.bub);
      body = `<div class="chat-lesson"><div class="chat-topic">💬 ${esc(c.title)}</div>${shown.map((b, j) => `<div class="cb ${j === shown.length - 1 ? 'new' : ''}"><span class="bro-av">😎</span><div class="cb-body learn-html">${b}</div></div>${j === 0 && c.chart ? '<div class="cb chart-b"><span class="bro-av">😎</span><div class="cb-body"><canvas class="lesson-chart"></canvas></div></div>' : ''}`).join('')}</div>`;
      if (P.bub < bs.length) btn = { act: 'more', label: pickOne(REPLIES), disabled: false, reply: true };
    } else if (s.k === 'sheet') {
      body = `<div class="sheet-head">⚡ <b>Cheat sheet</b><span class="muted small">Skim it. A timed rush comes next, with combos for streaks.</span></div>
        <div class="sheet">${s.cis.map(ci => { const lc = P.lesson.cards[ci]; return `<section class="sheet-card"><h3>${esc(lc.title)}</h3><div class="learn-html">${lc.html}</div></section>`; }).join('')}</div>`;
      btn = { act: 'next', label: 'Start the rush ⚡', disabled: false };
    } else if (s.k === 'predict') {
      body = `<div class="predict-tag">🎯 CALL IT FIRST · no penalty, just your best guess</div>${questionHTML(c, s)}`;
      btn = { act: 'lock', label: 'Lock it in 🔒', disabled: c.t !== 'tf' && c.t !== 'mcq' ? false : true };
    } else {
      const retry = P.first[i] === false;
      const called = P.predicts[s.ci];
      body = `${retry ? '<div class="retry-tag">🔁 Second chance</div>' : ''}${s.from ? `<div class="muted small">From: ${esc(s.from.unit.title)} → ${esc(s.from.title)}</div>` : ''}
        ${called != null && !retry ? `<div class="called">You called: <b>${esc(c.t === 'tf' ? (called === 1 ? 'True' : 'False') : c.opts[called])}</b>. Let's see…</div>` : ''}
        ${P.method === 'chat' && P.kind === 'lesson' ? bro(pickOne(['Quick check:', 'Your turn:', 'Prove it:', 'Ok, quiz time:'])) : ''}${questionHTML(c, s)}`;
      if (P.method === 'rush') body = `<div class="timer"><div id="tbar"></div></div>` + body;
      btn = { act: 'check', label: 'Check', disabled: true };
    }
    V.stop();
    const vbtn = P.method === 'voice' ? `<button class="x spk" data-act="voice-pause" title="${P.vPaused ? 'Play' : 'Pause'}">${P.vPaused ? '▶️' : '⏸️'}</button>` : V.canSpeak ? '<button class="x spk" data-act="read-aloud" title="Read this out loud">🔊</button>' : '';
    if (P.method === 'voice') body = `<div class="vstat" id="vstat">${P.vPaused ? '⏸️ Paused. Tap ▶️ to continue.' : '🎧 Cuh is talking…'}</div>` + body;
    o.innerHTML = `<div class="player m-${P.method}"><div class="ptop"><button class="x" data-act="quit" title="Quit">✕</button>${candles()}${vbtn}
        ${P.combo >= 2 ? `<span class="combo">🔥 x${P.combo}</span>` : ''}<span class="ptitle">${P.lesson.icon} ${esc(P.lesson.title)}${mm ? ` · ${mm.icon} ${esc(mm.name)}` : ''}</span></div>
      <div class="pbody">${body}<div id="fb"></div></div>
      <div class="pfoot"><button class="btn ${btn.reply ? 'reply' : 'primary'} big" id="pbtn" data-act="${btn.act}" ${btn.disabled ? 'disabled' : ''}>${btn.label}</button></div></div>`;
    P.sel = null; P.checked = false;
    if (c && c.chart) requestAnimationFrame(() => { const cv = o.querySelector('.lesson-chart'); if (!cv) return; const spec = window.TQ_Charts.PATTERNS[c.chart.pattern](c.chart.seed); window.TQ_Charts.draw(cv, spec, { vwap: !spec.noVwap }); });
    const ni = $('#numans'); if (ni) { ni.focus(); ni.addEventListener('input', () => { $('#pbtn').disabled = ni.value === ''; }); ni.addEventListener('keydown', e => { if (e.key === 'Enter' && ni.value !== '') $('#pbtn').click(); }); }
    if (s.k === 'chat') { const last = o.querySelector('.cb.new'); if (last && P.bub > 1) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (s.k === 'q' && P.method === 'rush') {
      const total = (RUSH_SECS[c.t] || 25) * (P.first[i] === false ? 1.5 : 1), t0 = Date.now();
      P.timer = setInterval(() => {
        const left = 1 - (Date.now() - t0) / 1000 / total; const b = $('#tbar');
        if (b) { b.style.width = Math.max(0, left * 100) + '%'; b.classList.toggle('hurry', left < 0.3); }
        if (left <= 0) { stopTimer(); check(true); }
      }, 100);
    }
    if (P.method === 'voice' && !P.vPaused) { const st = s; setTimeout(() => { if (P && !P.done && curStep().s === st) voiceStep(); }, 300); }
  }

  /* ───────── 🎧 Voice Teacher ───────── */
  let coachTalk = false;
  const vstat = html => { const el = $('#vstat'); if (el) el.innerHTML = html; };
  const noEmoji = t => V.clean(String(t || '').replace(/<[^>]+>/g, ' '));
  const answerText = c => c.t === 'mcq' ? `${'ABCD'[c.a]}, ${c.opts[c.a]}` : c.t === 'tf' ? (c.a ? 'true' : 'false') : `${c.a} ${c.suffix || ''}`;
  const hintFor = c => c.t === 'mcq' ? 'Say A, B, C or D.' : c.t === 'tf' ? 'Say true or false.' : 'Say the number.';
  function voiceStep() {
    if (!P || P.done || P.method !== 'voice' || P.vPaused) return;
    const { i, s } = curStep(); const c = s.c;
    const still = () => P && !P.done && !P.vPaused && curStep().s === s;
    if (s.k === 'chat') {
      const bs = M.bubbles(c.html);
      vstat('🎧 Cuh is talking… <span class="muted small">(tap the reply button to skip ahead)</span>');
      V.speak((P.bub === 1 ? c.title + '. ' : '') + V.toSpeech(bs[P.bub - 1]), { onend: () => setTimeout(() => { if (!still()) return; if (P.bub < bs.length) moreBubble(); else next(); }, 450) });
    } else if (s.k === 'q') {
      if (P.checked) return;
      const opts = c.t === 'mcq' ? ' ' + c.opts.map((o, k) => `${'ABCD'[k]}: ${o}.`).join(' ') : c.t === 'tf' ? ' True or false?' : '';
      const lead = P.first[i] === false ? 'Second chance.' : pickOne(['Quick check.', 'Your turn.', 'Question for you.', 'Okay, quiz time.']);
      vstat('🎧 Cuh is asking…');
      V.speak(`${lead} ${c.q}${opts}`, { onend: () => { if (still()) voiceListen(s, 0); } });
    } else {
      V.speak((c && c.title ? c.title + '. ' : '') + V.toSpeech(c ? c.html : ''), { onend: () => setTimeout(() => { if (still()) next(); }, 450) });
    }
  }
  function voiceListen(s, tries) {
    if (!P || P.checked || curStep().s !== s) return;
    const c = s.c;
    if (!V.canListen || P.noMic) { vstat('👆 Tap your answer. <span class="muted small">(Voice answers need Edge or Chrome with a microphone.)</span>'); return; }
    vstat(`🎤 <b>Listening…</b> ${hintFor(c)} <span class="muted small">You can also say "repeat", or just tap.</span>`);
    let handled = false;
    V.listen({
      interim: true,
      oninterim: t => vstat(`🎤 “${esc(t)}”`),
      onresult: (t, alts) => {
        handled = true;
        if (!P || P.checked || curStep().s !== s) return;
        const a = V.parseAnswer(c, alts);
        if (a && a.i != null) { vstat(`🎤 You said: “${esc(t)}”`); selOpt(a.i); check(false); }
        else if (a && a.n != null) { vstat(`🎤 You said: “${esc(t)}”`); const ni = $('#numans'); if (ni) ni.value = a.n; check(false); }
        else if (a && a.cmd === 'repeat') voiceStep();
        else if (a && a.cmd === 'dunno') { P.gaveUp = true; check(true); }
        else if (a && a.cmd === 'pause') togglePause();
        else if (tries < 2) { vstat(`🎤 Heard “${esc(t)}”…`); V.speak(`Sorry, I didn't catch that. ${hintFor(c)}`, { onend: () => voiceListen(s, tries + 1) }); }
        else vstat(`👆 Didn't get that. Tap your answer, or <button class="btn ghost sm" data-act="voice-listen">🎤 Try again</button>`);
      },
      onerror: err => {
        if (err === 'not-allowed' || err === 'service-not-allowed') { P.noMic = true; vstat('🎤 The microphone is blocked. Tap your answer, or allow the mic in the browser (the icon in the address bar).'); }
        else if (err === 'network') { P.noMic = true; vstat('🌐 Voice answers need internet. Tap your answer.'); }
      },
      onend: got => {
        if (got || handled || !P || P.checked || P.noMic || curStep().s !== s) return;
        if (tries < 2) voiceListen(s, tries + 1);
        else vstat(`👆 Tap your answer, or <button class="btn ghost sm" data-act="voice-listen">🎤 Talk</button>`);
      },
    });
  }
  function voiceFeedback(ok, head, c) {
    const s = curStep().s;
    const text = `${noEmoji(head)}. ${ok ? '' : `The answer is ${answerText(c)}. `}${c.why || ''}`;
    vstat(ok ? '✅ Nice. Moving on…' : '🔁 Listen to why…');
    V.speak(text, { onend: () => setTimeout(() => { if (P && !P.done && !P.vPaused && curStep().s === s && P.checked) next(); }, 700) });
  }
  function togglePause() {
    if (!P) return;
    P.vPaused = !P.vPaused;
    if (P.vPaused) { V.stop(); const b = $('[data-act=voice-pause]'); if (b) { b.textContent = '▶️'; b.title = 'Play'; } vstat('⏸️ Paused. Tap ▶️ to continue.'); }
    else { const b = $('[data-act=voice-pause]'); if (b) { b.textContent = '⏸️'; b.title = 'Pause'; } if (P.checked) next(); else voiceStep(); }
  }
  function readAloud() {
    if (V.speaking()) { V.stop(); return; }
    const { s } = curStep(); const c = s.c;
    let t = '';
    if (s.k === 'learn') t = c.title + '. ' + V.toSpeech(c.html);
    else if (s.k === 'chat') t = c.title + '. ' + M.bubbles(c.html).slice(0, P.bub).map(V.toSpeech).join(' ');
    else if (s.k === 'sheet') t = s.cis.map(ci => P.lesson.cards[ci].title + '. ' + V.toSpeech(P.lesson.cards[ci].html)).join(' ');
    else t = c.q + (c.t === 'mcq' ? ' ' + c.opts.map((o, k) => `${'ABCD'[k]}: ${o}.`).join(' ') : c.t === 'tf' ? ' True or false?' : '');
    const fb = $('#fb .fbx'); if (fb && P.checked) t = noEmoji(fb.textContent);
    V.speak(t);
  }
  function voiceRating() {
    if (!P || !P.done) return;
    const mm = M.METHODS[P.method];
    const msg = `Session closed. You got ${P.done.right} out of ${P.done.total} on the first try. ${noEmoji(P.done.verdict)} How did you like learning with the ${mm.name}? Say a number from one to five, or tap the stars.`;
    const ask = tries => {
      if (!P || !P.done || P.rated || P.stars) return;
      V.listen({ onresult: (t, alts) => { const n = V.parseStars(alts); if (n) rate(n); else if (tries < 1) V.speak('Just say a number from one to five.', { onend: () => ask(tries + 1) }); } , onend: got => { if (!got && tries < 1 && P && !P.stars) ask(tries + 1); } });
    };
    V.speak(msg, { onend: () => { if (V.canListen) ask(0); } });
  }
  function voiceReason() {
    if (!V.canListen) return;
    V.speak("Sorry to hear that. What didn't work for you? Tell me in a sentence, or tap a reason.", { onend: () => {
      V.listen({ interim: true, oninterim: t => { const ta = $('#reason-text'); if (ta) ta.value = t; }, onresult: t => {
        const ta = $('#reason-text'); if (!ta || P.rated) return; ta.value = t; if (!P.reason) pickReason('other');
        V.speak('Got it. Tap send if that is right.');
      } });
    } });
  }
  function moreBubble() { P.bub++; renderPlayer(); }
  function selOpt(i) {
    if (P.checked) return; P.sel = +i;
    document.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', b.dataset.i === String(i)));
    $('#pbtn').disabled = false;
  }
  function lockPredict() {
    const { s } = curStep(); P.predicts[s.ci] = P.sel; P.checked = true;
    document.querySelectorAll('.opt').forEach(b => { b.disabled = true; });
    $('#fb').innerHTML = `<div class="fbx neutral">${bro(pickOne(['Locked in. Now let\'s see if you\'re right 👀', 'Bold call. The next card will tell you.', 'Noted. Remember this guess!']))}</div>`;
    const btn = $('#pbtn'); btn.textContent = 'Find out →'; btn.dataset.act = 'next'; btn.focus();
  }
  function check(timedOut) {
    if (P.checked) return; stopTimer();
    const { i, s } = curStep(); const c = s.c, key = s.key;
    let ok;
    if (timedOut) ok = false;
    else if (c.t === 'mcq') ok = P.sel === c.a;
    else if (c.t === 'tf') ok = (P.sel === 1) === c.a;
    else { const v = parseFloat($('#numans').value); ok = Math.abs(v - c.a) <= (c.tol || 0.001) + 1e-9; }
    P.checked = true;
    const firstTime = !(i in P.first);
    if (firstTime) {
      P.first[i] = ok;
      const rec = S.cards[key] || { seen: 0, right: 0, wrong: 0, box: 0 };
      rec.seen++; ok ? rec.right++ : rec.wrong++;
      // Spaced repetition: right answers move the card to a longer interval, misses reset it.
      if (ok) rec.box = P.kind === 'review' ? Math.min(5, (rec.box || 0) + 1) : Math.max(rec.box || 0, 1); else rec.box = 0;
      rec.last = ok; rec.at = Date.now(); rec.due = Date.now() + BOX_DAYS[rec.box] * DAY; S.cards[key] = rec;
      if (!ok) { P.mistakes.push({ q: c.q, why: c.why }); P.queue.push(i); }
      if (P.kind === 'review' && ok) P.reviewRight = (P.reviewRight || 0) + 1;
      if (ok) { P.combo++; P.bestCombo = Math.max(P.bestCombo, P.combo); if (P.combo >= 5) S.badges._combo5 = S.badges._combo5 || Date.now(); } else P.combo = 0;
      save();
    }
    P.marks[P.pos] = ok ? 'ok' : 'bad';
    if (c.t !== 'num') document.querySelectorAll('.opt').forEach(b => {
      const bi = +b.dataset.i; const correct = c.t === 'mcq' ? bi === c.a : (bi === 1) === c.a;
      if (correct) b.classList.add('right'); else if (bi === P.sel) b.classList.add('wrong');
      b.disabled = true;
    });
    const answer = c.t === 'num' ? `Answer: <b>${c.a}${c.suffix ? ' ' + esc(c.suffix) : ''}</b>. ` : '';
    const called = P.predicts[s.ci];
    const callNote = called != null && firstTime ? (((c.t === 'mcq' ? called === c.a : (called === 1) === c.a)) ? '<div class="callres good">🎯 Your first call was right too!</div>' : '<div class="callres">Your first call was off, and that\'s the point: now it sticks.</div>') : '';
    const head = P.gaveUp ? 'No worries 🤝' : timedOut ? '⏰ Time\'s up' : ok ? pickOne(['Clean entry ✅', 'Profit taken 💰', 'Sharp read 🧠', 'In the money 📈', 'Textbook 🎯']) : pickOne(['Stopped out 🛑', 'Not this time', 'Missed the move']);
    $('#fb').innerHTML = `<div class="fbx ${ok ? 'ok' : 'bad'}"><div class="fb-title">${head}${ok && P.combo >= 2 ? ` <span class="combo sm">🔥 x${P.combo}</span>` : ''}</div><div class="fb-why">${ok ? '' : answer}${esc(c.why || '')}</div>${callNote}${!ok && firstTime ? '<div class="muted small">It comes back at the end of this session, and in Review.</div>' : ''}</div>`;
    const t = $('.ptop .combo'); if (t) t.textContent = P.combo >= 2 ? '🔥 x' + P.combo : '';
    const btn = $('#pbtn'); btn.textContent = 'Continue'; btn.dataset.act = 'next'; btn.disabled = false; btn.focus();
    $('#fb').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    P.gaveUp = false;
    if (P.method === 'voice') voiceFeedback(ok, head, c);
  }
  function next() {
    const { s } = curStep();
    if (s.k !== 'q') P.marks[P.pos] = 'seen';
    P.pos++; P.bub = 1;
    if (P.pos >= P.queue.length) finish(); else renderPlayer();
  }

  function finish() {
    stopTimer();
    const qIdx = P.steps.map((x, i) => i).filter(i => P.steps[i].k === 'q');
    const right = qIdx.filter(i => P.first[i]).length;
    const score = qIdx.length ? Math.round(right / qIdx.length * 100) : 100;
    let xp = 0;
    if (P.kind === 'lesson') {
      const l = P.lesson; const prev = S.lessons[l.id] || { attempts: 0, best: 0 };
      const firstClear = !prev.completedAt;
      xp = Math.round(l.xp * (firstClear ? 1 : 0.4) * (score >= 60 ? 1 : 0.5)) + (score === 100 ? 5 : 0) + Math.min(10, P.bestCombo * (P.method === 'rush' ? 2 : 1));
      S.lessons[l.id] = { attempts: prev.attempts + 1, best: Math.max(prev.best || 0, score), last: score, stars: Math.max(prev.stars || 0, stars(score)), completedAt: prev.completedAt || Date.now(), lastAt: Date.now() };
    } else { xp = (P.reviewRight || 0) * 3 + 5; S.reviews++; }
    S.quizLog.unshift({ at: Date.now(), kind: P.kind, id: P.lesson.id || 'review', title: P.lesson.title, score, right, total: qIdx.length, method: P.method });
    S.quizLog = S.quizLog.slice(0, 200);
    save(); addXP(xp, P.kind === 'lesson' ? 'Lesson closed' : 'Review');
    const verdict = score >= 90 ? 'Mastered. 🏆' : score >= 80 ? 'Solid session 💪' : score >= 60 ? 'Getting there: the misses are in Review' : 'Rough one. Run it back!';
    const mm = M.METHODS[P.method];
    P.done = { score, right, total: qIdx.length, verdict };
    $('#overlay').innerHTML = `<div class="player"><div class="result">
      <div class="sticket"><div class="t-head"><span>🔔 SESSION CLOSED</span><span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        <h1>${P.lesson.icon} ${esc(P.lesson.title)}</h1>
        <div class="t-grade ${score >= 80 ? 'up' : 'low'}">${letter(score)}<small>${score}%</small></div>
        <div class="res-stats"><div class="rs"><b>${right}/${qIdx.length}</b><span>First try</span></div><div class="rs"><b>🔥 ${P.bestCombo}</b><span>Best combo</span></div><div class="rs"><b class="up">+${xp}</b><span>XP earned</span></div></div>
        <p class="verdict">${verdict}</p></div>
      ${P.mistakes.length ? `<div class="mistakes"><h3>📝 Remember these</h3>${P.mistakes.map(x => `<div class="mist"><b>${esc(x.q)}</b><div>${esc(x.why)}</div></div>`).join('')}<p class="muted small">Saved to your <b>Review</b> list.</p></div>` : ''}
      ${P.kind === 'lesson' ? `<div class="rate" id="rate"><h3>How did you like learning with ${mm.icon} ${esc(mm.name)}?</h3>
        <div class="stars-in">${[1, 2, 3, 4, 5].map(n => `<button class="star" data-act="rate" data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div><div id="rate-more"></div></div>` : ''}
      <div class="row center">${P.kind === 'lesson' && score < 80 ? `<button class="btn ghost big" data-act="open-lesson" data-id="${P.lesson.id}" id="retrybtn" ${P.kind === 'lesson' ? 'disabled' : ''}>Run it back</button>` : ''}<button class="btn primary big" data-act="done" id="donebtn" ${P.kind === 'lesson' ? 'disabled' : ''}>Continue</button></div>
      ${P.kind === 'lesson' ? '<p class="muted small" id="rate-hint">Rate the lesson style to continue. Your rating shapes how the app teaches you.</p>' : ''}</div></div>`;
    if (P.method === 'voice' && P.kind === 'lesson') setTimeout(voiceRating, 400);
  }

  /* ───────── rating → reason → change request ───────── */
  function unlockFinish() { ['#donebtn', '#retrybtn'].forEach(s => { const b = $(s); if (b) b.disabled = false; }); const h = $('#rate-hint'); if (h) h.remove(); }
  function rate(n) {
    if (!P || !P.done || P.rated) return;
    if (P.method === 'voice') V.stop();
    document.querySelectorAll('.star').forEach(b => b.classList.toggle('on', +b.dataset.n <= n));
    P.stars = n;
    const box = $('#rate-more');
    if (n >= CFG.expectedRating) {
      P.rated = true; logRating(n);
      box.innerHTML = `<p class="good"><b>${n === 5 ? 'Love that 🙌' : 'Thanks! 👍'}</b> Noted for ${esc(M.METHODS[P.method].name)}.</p>`;
      if (P.method !== S.method && P.kind === 'lesson') box.innerHTML += `<div class="row center"><button class="btn ghost sm" data-act="want-method" data-m="${P.method}">Make ${M.METHODS[P.method].icon} ${esc(M.METHODS[P.method].name)} my main style</button></div>`;
      document.querySelectorAll('.star').forEach(b => { b.disabled = true; });
      if (P.method === 'voice') V.speak(n === 5 ? 'Love that!' : 'Thanks!');
      return unlockFinish();
    }
    if (P.method !== S.method) {
      // A one-off try of another style: just remember it, don't ask to change the main style.
      P.rated = true; logRating(n, { trial: true });
      box.innerHTML = `<p class="muted">Got it, saved. You'll stay on ${methodChip(S.method)}.</p>`;
      document.querySelectorAll('.star').forEach(b => { b.disabled = true; });
      return unlockFinish();
    }
    P.tries = P.tries || 0;
    box.innerHTML = `<p><b>Lower than we hoped.</b> What didn't work for you?</p>
      <div class="reasons">${M.REASONS.map(r => `<button class="chip-btn" data-act="reason" data-r="${r.id}">${r.label}</button>`).join('')}</div>
      <textarea id="reason-text" maxlength="300" placeholder="Tell me more (optional, unless you picked “Something else”)"></textarea>
      <div class="err" id="reason-err"></div><div class="row end"><button class="btn primary" data-act="send-reason" id="sendreason" disabled>Send</button></div>`;
    if (P.method === 'voice') voiceReason();
  }
  function pickReason(id) {
    P.reason = id;
    document.querySelectorAll('.reasons .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.r === id));
    $('#sendreason').disabled = false;
    if (id === 'other') $('#reason-text').focus();
  }
  function logRating(stars, extra) {
    S.ratings = (S.ratings || []).concat([Object.assign({ at: Date.now(), lesson: P.lesson.id, title: P.lesson.title, method: P.method, stars, score: P.done.score }, extra || {})]).slice(-300);
    checkBadges(); save();
  }
  function sendReason() {
    const text = $('#reason-text').value;
    const res = M.evaluate(P.reason, text, S.method, S.rejected);
    if (!res.ok) {
      P.tries++;
      if (P.tries < 2) { $('#reason-err').textContent = res.msg; return; }
      // Second unclear answer: save it, but don't ask for a change.
      logRating(P.stars, { reason: P.reason, text: text.trim(), actionable: false });
      P.rated = true;
      $('#rate-more').innerHTML = `<p class="muted">Got it, saved. If you think of a clearer reason, tell me after the next lesson. 🙏</p>`;
      return unlockFinish();
    }
    const rl = M.REASONS.find(r => r.id === P.reason);
    logRating(P.stars, { reason: P.reason, text: res.text, actionable: true });
    P.rated = true;
    $('#rate-more').innerHTML = requestSentHTML(makeRequest({ to: res.to, stars: P.stars, reason: res.reasonId, reasonLabel: rl.label, text: res.text, why: res.why }), 'Makes sense.', 'Fair point.');
    if (P.method === 'voice') V.speak(`Fair point. I'll ask to switch you to ${M.METHODS[res.to].name}.`);
    unlockFinish();
  }
  function makeRequest(o) {
    const r = Object.assign({ id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), learner: S.id, name: S.name, from: S.method, lesson: P ? P.lesson.title : '', at: Date.now(), status: 'pending' }, o);
    // One open request per learner: a newer one replaces the older one.
    const L = lab(); L.requests = L.requests.filter(x => !(x.learner === S.id && x.status === 'pending')); L.requests.unshift(r); L.requests = L.requests.slice(0, 100); saveLab(L);
    S.myRequest = r; save();
    return r;
  }
  function requestSentHTML(r, ownerHead, learnerHead) {
    return isOwner()
      ? `<div class="banner good">🧪 <b>${ownerHead}</b> I'd switch you to ${methodChip(r.to)} because ${esc(r.why)}. It's waiting in your <b>Lab</b> for your OK.
        <div class="row" style="margin-top:8px"><button class="btn primary sm" data-act="lab-now">Open Lab</button></div></div>`
      : `<div class="banner good">📨 <b>${learnerHead}</b> I want to switch you to ${methodChip(r.to)} because ${esc(r.why)}. ${esc(ownerName())} has to OK it first.
        <div class="row" style="margin-top:8px"><button class="btn primary sm" data-act="tell-owner">📲 Message ${esc(ownerName())}</button></div>
        <div class="muted small">On the same device? ${esc(ownerName())} will see it in the Lab automatically.</div></div>`;
  }

  /* ───────── LAB (owner only): approve method changes ───────── */
  function approve(id, to) {
    const L = lab(); const r = L.requests.find(x => x.id === id); if (!r) return;
    r.status = 'approved'; r.decidedTo = to || r.to; r.decidedAt = Date.now(); saveLab(L);
    const st = r.learner === S.id ? S : load(r.learner);
    if (st.onboarded || r.learner === S.id) applyMethodTo(st, r.decidedTo, r.learner === S.id ? 'self' : 'approved');
    toast(`✅ ${r.name} now learns with ${M.METHODS[r.decidedTo].name}`, 'badge');
    renderLab($('#main')); renderTop();
    if (r.remote) showCode(r.id); // they're on their own phone: give Leon the code to send back
  }
  function decline(id) {
    const L = lab(); const r = L.requests.find(x => x.id === id); if (!r) return;
    r.status = 'declined'; r.decidedAt = Date.now(); saveLab(L);
    if (r.learner === S.id) { S.myRequest = null; S.rejected = [...new Set((S.rejected || []).concat(r.to))]; save(); }
    toast('Kept the current method');
    renderLab($('#main')); renderTop();
  }
  function ratingStats(st) {
    const g = {};
    (st.ratings || []).forEach(r => { (g[r.method] = g[r.method] || []).push(r.stars); });
    return M.ORDER.map(m => ({ m, n: (g[m] || []).length, avg: g[m] && g[m].length ? g[m].reduce((a, b) => a + b, 0) / g[m].length : null }));
  }
  function claudeReport() {
    const lines = [`${CFG.appName} – feedback report (${today()})`, ''];
    accounts().map(a => load(a.id)).filter(st => st.onboarded).forEach(st => {
      lines.push(`## ${st.name} – current method: ${M.METHODS[st.method].name}`);
      ratingStats(st).filter(x => x.n).forEach(x => lines.push(`- ${M.METHODS[x.m].name}: ${x.avg.toFixed(1)}★ avg over ${x.n} lessons`));
      (st.ratings || []).filter(r => r.reason).slice(-10).forEach(r => lines.push(`- ${r.stars}★ "${r.title}" (${M.METHODS[r.method].name}): ${(M.REASONS.find(x => x.id === r.reason) || {}).label || r.reason}${r.text ? ' – "' + r.text + '"' : ''}`));
      lines.push('');
    });
    lines.push('Requests:'); lab().requests.slice(0, 20).forEach(r => lines.push(`- ${new Date(r.at).toLocaleDateString('en-GB')} ${r.name}: ${M.METHODS[r.from].name} → ${M.METHODS[r.to].name} [${r.status}${r.decidedTo && r.decidedTo !== r.to ? ' → ' + M.METHODS[r.decidedTo].name : ''}]`));
    return lines.join('\n');
  }
  function renderLab(m) {
    if (!isOwnerEmail()) return go('learn');
    if (!bossPinOK(S.id)) {
      m.innerHTML = `<div class="page"><div class="picker" style="min-height:auto;padding-top:30px"><div class="w-hero">🔑</div><h1>Boss PIN</h1><p class="muted">Enter your boss PIN once on this device to open the Lab.</p>
        <form class="onboard" id="pinform" novalidate><input name="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="font-size:1.4rem;text-align:center;letter-spacing:.3em">
        <div class="err" id="pin-err"></div><button class="btn primary big" type="submit">Unlock the Lab</button></form></div></div>`;
      const pf = $('#pinform'); pf.elements.pin.focus();
      pf.addEventListener('submit', async e => {
        e.preventDefault();
        const pin = pf.elements.pin.value.trim();
        if (pin && await sha256('boss:' + pin) === CFG.bossPinHash) { storeSet(BOSSKEY(S.id), CFG.bossPinHash); toast('🔓 Lab unlocked on this device', 'badge'); renderTop(); renderLab($('#main')); const n = pendingCount(); if (n) toast(`🧪 ${n} request${n > 1 ? 's' : ''} waiting`, 'level'); }
        else { $('#pin-err').textContent = 'Wrong PIN.'; pf.elements.pin.select(); }
      });
      return;
    }
    const L = lab(), pend = L.requests.filter(r => r.status === 'pending'), old = L.requests.filter(r => r.status !== 'pending').slice(0, 8);
    const learners = accounts().map(a => (a.id === S.id ? S : load(a.id))).filter(st => st.onboarded);
    const opts = sel => M.ORDER.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${M.METHODS[k].icon} ${M.METHODS[k].name}</option>`).join('');
    const reqCard = r => `<div class="lreq"><div class="lreq-head"><b>${esc(r.name)}</b> rated ${methodChip(r.from)} <span class="stars-sm">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span><span class="muted small">${new Date(r.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })} · "${esc(r.lesson)}"</span></div>
      <div class="lreq-reason">${esc(r.reasonLabel)}${r.text ? ` <q>${esc(r.text)}</q>` : ''}</div>
      <div class="lreq-sug">💡 I want to switch ${esc(r.name)} to ${methodChip(r.to)} because ${esc(r.why)}.</div>
      <div class="row"><select id="to-${r.id}">${opts(r.to)}</select><button class="btn primary sm" data-act="approve" data-id="${r.id}">✅ Approve</button><button class="btn ghost sm" data-act="decline" data-id="${r.id}">Decline</button></div></div>`;
    m.innerHTML = `<div class="page"><h1>🧪 The Lab</h1><p class="muted">After every lesson, each trader rates the teaching style. When a rating is low and the reason makes sense, a change request lands here. Nothing changes until you approve it.</p>
      <h2>📥 Waiting for you ${pend.length ? `<span class="count">${pend.length}</span>` : ''}</h2>
      ${pend.length ? pend.map(reqCard).join('') : '<p class="muted">No requests right now. Everyone\'s vibing 😎</p>'}
      <div class="share"><div><b>Got a request code on WhatsApp?</b> Paste it here (it starts with <code>MTBR.</code>).</div><div class="row"><input id="reqcode" placeholder="MTBR.…"><button class="btn ghost sm" data-act="add-req">Add request</button></div></div>
      ${old.length ? `<h2>🗂️ Decided</h2><table class="tbl"><tr><th>When</th><th>Who</th><th>Change</th><th>Result</th><th></th></tr>${old.map(r => `<tr><td>${new Date(r.decidedAt || r.at).toLocaleDateString('en-GB')}</td><td>${esc(r.name)}</td><td>${M.METHODS[r.from].icon} → ${M.METHODS[r.decidedTo || r.to].icon} ${esc(M.METHODS[r.decidedTo || r.to].name)}</td><td class="${r.status === 'approved' ? 'good' : 'muted'}">${r.status}</td><td>${r.status === 'approved' && r.learner !== S.id ? `<button class="btn ghost sm" data-act="show-code" data-id="${r.id}">Code</button>` : ''}</td></tr>`).join('')}</table>` : ''}
      <h2>🎛️ Teaching style per trader</h2><p class="muted small">You're the boss: you can also switch anyone directly.</p>
      <div class="lab-grid">${learners.map(st => `<div class="lab-card"><div class="row"><span class="avatar sm" style="--pc:${profileOf(st.id).color}">${profileOf(st.id).avatar}</span><b>${esc(st.name)}</b><select data-set-method="${st.id}">${opts(st.method)}</select></div><div class="muted small">${esc(st.email || '')} ${(acctOf(st.id) || {}).cloud ? '' : `<button class="btn ghost sm" data-act="reset-pw" data-id="${st.id}">🔑 Reset password</button>`}</div>
        <div class="mstats">${ratingStats(st).map(x => `<div class="${x.m === st.method ? 'cur' : ''}"><span>${M.METHODS[x.m].icon} ${esc(M.METHODS[x.m].name)}</span><b>${x.avg == null ? '–' : x.avg.toFixed(1) + '★'}</b><small>${x.n} rating${x.n === 1 ? '' : 's'}</small></div>`).join('')}</div></div>`).join('')}</div>
      <h2>📚 The methods</h2><div class="methods">${M.ORDER.map(k => { const x = M.METHODS[k]; return `<div class="method"><h3>${x.icon} ${esc(x.name)}</h3><p>${esc(x.tagline)}</p><p class="muted small">🔬 ${esc(x.science)}</p></div>`; }).join('')}</div>
      <h2>🤖 Bigger changes</h2><p class="muted">Want the lessons themselves rewritten? Copy this report and paste it to Claude.</p><button class="btn ghost" data-act="claude-report">📋 Copy feedback report</button></div>`;
    m.querySelectorAll('[data-set-method]').forEach(sel => sel.addEventListener('change', () => {
      const id = sel.dataset.setMethod; const st = id === S.id ? S : load(id);
      const L2 = lab(); L2.requests.filter(r => r.learner === id && r.status === 'pending').forEach(r => { r.status = 'approved'; r.decidedTo = sel.value; r.decidedAt = Date.now(); }); saveLab(L2);
      applyMethodTo(st, sel.value, id === S.id ? 'self' : 'approved');
      toast(`${st.name} → ${M.METHODS[sel.value].name}`, 'badge'); renderLab($('#main')); renderTop();
    }));
  }
  function showCode(id) {
    const r = lab().requests.find(x => x.id === id); if (!r) return;
    const code = M.approvalCode(r.id, r.decidedTo || r.to);
    const msg = `Approved ✅ You're switching to ${M.METHODS[r.decidedTo || r.to].name}. Open ${CFG.appName} → Desk and enter this code: ${code}`;
    const mo = $('#modal');
    mo.innerHTML = `<div class="modal-card"><h3>Approval code for ${esc(r.name)}</h3><p class="muted small">If ${esc(r.name)} uses their own phone, send this code. They enter it on their Desk.</p><div class="bigcode">${code}</div>
      <div class="row end"><button class="btn ghost" data-r="0">Close</button><button class="btn primary" data-r="send">📲 Send</button></div></div>`;
    mo.hidden = false;
    mo.onclick = e => { const b = e.target.closest('[data-r]'); if (!b && e.target !== mo) return; mo.hidden = true; mo.onclick = null; if (b && b.dataset.r === 'send') sendMsg(msg); };
  }

  /* ───────── REVIEW ───────── */
  function renderReview(m) {
    const missed = Object.entries(S.cards).filter(([, v]) => v.last === false);
    const due = dueCards();
    const weak = weakLessons();
    m.innerHTML = `<div class="page"><h1>🔁 Review</h1>
      <p class="muted">Spaced repetition: every card you get right comes back later (1 day, 3 days, a week, 2 weeks…), right before you'd forget it. Cards you miss come back first. Topics get shuffled together, which makes your memory work harder and stick better.</p>
      <div class="review-hero"><div class="rh-nums"><div><div class="big-num bad">${missed.length}</div><div class="small">missed</div></div><div><div class="big-num">${due.length}</div><div class="small">due today</div></div></div>
      <button class="btn primary big" data-act="start-review">${missed.length + due.length ? 'Start review' : 'Practice mixed questions'}</button></div>
      <h2>Topics by grade</h2>${weak.length ? '' : '<p class="muted">No weak topics right now. Keep going! 💪</p>'}
      <div class="weak-list">${weak.map(w => `<div class="weak"><div><b>${esc(w.title)}</b><div class="muted small">${esc(w.unit)} · ${w.missed} open mistake${w.missed === 1 ? '' : 's'}</div></div><div class="bar"><div style="width:${w.score}%;background:${w.score < 60 ? '#ff4d6d' : '#ff8a3d'}"></div></div><b>${letter(w.score)}</b><button class="btn ghost sm" data-act="open-lesson" data-id="${w.id}">Redo</button></div>`).join('')}</div></div>`;
  }

  /* ───────── COACH ───────── */
  let coachBusy = false;
  function renderCoach(m) {
    const ai = !!CFG.aiEndpoint;
    const msgs = S.chat.length ? S.chat : [{ role: 'assistant', content: `Yo ${S.name}! I'm Cuh 😎, your trading coach. I know your grades and Arena stats. Ask me about any term, a calculation, the market hours, or "what should I work on?"` }];
    m.innerHTML = `<div class="page coach"><div class="coach-head"><h1>😎 Ask Cuh</h1><span class="pill ${ai ? 'ai' : ''}">${ai ? 'AI mode' : 'Offline coach'}</span>${S.chat.length ? '<button class="btn ghost sm" data-act="clear-chat">Clear chat</button>' : ''}</div>
      <div class="chat" id="chat">${msgs.map(x => `<div class="msg ${x.role}">${md(x.content)}</div>`).join('')}</div>
      <div class="suggest">${['What should I work on?', 'Is the market open?', 'What is VWAP?', 'position size 25000 1% entry 40 stop 39.5', 'My stats'].map(s => `<button class="chip-btn" data-act="ask" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="chat-in" id="chatform">${V.canListen ? `<button type="button" class="btn ${coachTalk ? 'primary' : 'ghost'} mic" data-act="coach-mic" title="Talk to Cuh">🎤</button>` : ''}<input id="chatq" autocomplete="off" placeholder="${V.canListen ? 'Ask Cuh, or tap 🎤 and just talk…' : 'Ask Cuh…'}" maxlength="500"><button class="btn primary" type="submit">Send</button></form>
      <div class="row" style="margin-top:8px">${V.canSpeak ? `<button class="chip-btn ${S.coachVoice ? 'on' : ''}" data-act="coach-voice">${S.coachVoice ? '🔊 Cuh talks out loud: ON' : '🔇 Cuh talks out loud: OFF'}</button>` : ''}<span class="muted small" id="coachstat"></span></div>
      <p class="muted small">Education only, not financial advice. Cuh never recommends specific stocks to buy.</p></div>`;
    const chat = $('#chat'); chat.scrollTop = chat.scrollHeight;
    $('#chatform').addEventListener('submit', e => { e.preventDefault(); const q = $('#chatq').value.trim(); if (q) askCoach(q); });
  }
  async function askCoach(q) {
    if (coachBusy) return; coachBusy = true;
    S.chat.push({ role: 'user', content: q }); S.chat = S.chat.slice(-30); save();
    renderCoach($('#main'));
    const chat = $('#chat'); const pending = document.createElement('div'); pending.className = 'msg assistant typing'; pending.textContent = '…'; chat.appendChild(pending); chat.scrollTop = chat.scrollHeight;
    const res = await window.TQ_Coach.ask(S.chat, coachCtx());
    S.chat.push({ role: 'assistant', content: res.text }); save(); coachBusy = false;
    if (view === 'coach') renderCoach($('#main'));
    if (view === 'coach' && S.coachVoice) {
      const st = $('#coachstat'); if (st) st.textContent = '😎 Cuh is talking… (tap 🎤 to stop)';
      V.speak(res.text, { onend: () => { const st2 = $('#coachstat'); if (st2) st2.textContent = ''; if (coachTalk && view === 'coach') coachListen(); } });
    }
  }
  function coachListen() {
    const st = $('#coachstat'), inp = $('#chatq');
    if (st) st.textContent = '🎤 Listening… (say "stop" to end)';
    V.listen({
      interim: true,
      oninterim: t => { if (inp) inp.value = t; },
      onresult: t => {
        if (/^(stop|bye|goodbye|that'?s all|thanks bro|thanks cuh|thanks cuz|thank you)\b/i.test(t.trim())) { coachTalk = false; if (st) st.textContent = ''; V.speak('Anytime. Later, ' + S.name + '!'); renderCoach($('#main')); return; }
        askCoach(t);
      },
      onerror: err => { coachTalk = false; if (st) st.textContent = err === 'not-allowed' ? '🎤 The microphone is blocked. Allow it in the browser to talk to Cuh.' : err === 'network' ? '🌐 Talking needs internet.' : ''; },
      onend: got => { if (!got) { coachTalk = false; const b = $('[data-act=coach-mic]'); if (b) b.className = 'btn ghost mic'; if (st && /Listening/.test(st.textContent)) st.textContent = ''; } },
    });
  }

  /* ───────── NEWS ───────── */
  let newsFilter = 'all';
  function renderNews(m) {
    const N = window.TQ_NEWS;
    const items = N.items.filter(i => newsFilter === 'all' || i.region === newsFilter || i.cat === newsFilter).sort((a, b) => b.date.localeCompare(a.date));
    const cats = [...new Set(N.items.map(i => i.cat))];
    m.innerHTML = `<div class="page"><h1>📰 Market news: World & Israel</h1>
      <p class="muted">Updated ${esc(N.updated)} · Every story includes <b>why it matters for traders</b>. Headlines are summarized from the linked sources, so read the original before relying on any detail.</p>
      <div class="filters">${[['all', '🌍🇮🇱 All'], ['world', '🌍 World'], ['israel', '🇮🇱 Israel']].map(([k, t]) => `<button class="chip-btn ${newsFilter === k ? 'on' : ''}" data-act="nf" data-f="${k}">${t}</button>`).join('')}
        ${cats.map(c => `<button class="chip-btn ${newsFilter === c ? 'on' : ''}" data-act="nf" data-f="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="news">${items.map(i => `<article class="news-card"><div class="news-meta"><span class="flag">${i.region === 'israel' ? '🇮🇱' : '🌍'}</span><span class="cat cat-${esc(i.cat.split(' ')[0].toLowerCase())}">${esc(i.cat)}</span><span class="muted small">${esc(i.date)}</span></div>
        <h3>${esc(i.title)}</h3><p>${esc(i.summary)}</p><div class="why">💡 <b>Why it matters for traders:</b> ${esc(i.why)}</div>
        <div class="row"><a class="src" href="${esc(i.url)}" target="_blank" rel="noopener">Source: ${esc(i.source)} ↗</a>${i.lesson ? `<a href="#" class="lesson-link" data-act="open-lesson" data-id="${i.lesson}">📘 Related lesson</a>` : ''}<button class="btn ghost sm" data-act="ask-news" data-t="${esc(i.title)}">Ask Cuh</button></div></article>`).join('')}</div>
      <h2>🔴 Live sources (check daily)</h2><div class="sources">${N.liveSources.map(s => `<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></a>`).join('')}</div></div>`;
  }

  /* ───────── PROGRESS / STATS ───────── */
  function profileSummary(st) {
    const a = arenaStats(st);
    const done = LESSONS.filter(l => st.lessons[l.id] && st.lessons[l.id].completedAt).length;
    const g = Object.values(st.lessons).filter(x => x.last != null).map(x => x.last);
    return { name: st.name, xp: st.xp, level: level(st.xp), streak: liveStreakOf(st), done, avg: g.length ? Math.round(g.reduce((x, y) => x + y, 0) / g.length) : 0, trades: a.trades, exp: +a.expectancy.toFixed(2), totalR: +a.totalR.toFixed(1), at: today() };
  }
  function renderProgress(m) {
    const me = profileSummary(S);
    const others = accounts().filter(a => a.id !== S.id).map(a => load(a.id)).filter(st => st.onboarded).map(profileSummary);
    const imported = Object.values(S.friends || {});
    const board = [Object.assign({ me: true }, me)].concat(others, imported.filter(f => !others.some(o => o.name === f.name))).sort((a, b) => b.xp - a.xp);
    const a = arenaStats();
    const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = today(d); return { k, v: S.dailyXp[k] || 0, l: d.toLocaleDateString('en', { weekday: 'short' }) }; });
    const maxX = Math.max(S.dailyGoal, ...last7.map(x => x.v));
    const mm = M.METHODS[S.method];
    m.innerHTML = `<div class="page"><h1>📊 Stats: ${esc(S.name)}</h1>
      <div class="stat-grid">
        <div class="stat"><b>⚡ ${S.xp}</b><span>Total XP</span></div><div class="stat"><b>${title(me.level)}</b><span>Rank · Lv ${me.level}</span></div>
        <div class="stat"><b>🟢 ${me.streak}</b><span>Green days (best ${S.streak.best})</span></div><div class="stat"><b>${me.done}/${myLessons().length}</b><span>Lessons</span></div>
        <div class="stat"><b>${letter(me.avg)} · ${me.avg}%</b><span>Average grade</span></div><div class="stat"><b>${fmtR(a.expectancy)}</b><span>Arena expectancy (${a.trades} trades)</span></div></div>

      <h2>🛤️ Your tracks</h2><div class="banner">${myTracks().map(t => `${TBYID[t].icon} <b>${esc(TBYID[t].name)}</b>`).join(' · ')} <button class="btn ghost sm" data-act="change-tracks" style="margin-left:8px">Change</button></div>
      <h2>🧑‍🏫 Your learning style</h2><div class="banner"><b>${mm.icon} ${esc(mm.name)}</b>: ${esc(mm.tagline)}<div class="muted small">${isOwner() ? 'Change it any time in the 🧪 Lab.' : `Not feeling it? Give the lesson a low rating and tell me why. ${esc(ownerName())} approves changes.`}</div></div>

      <h2>📅 This week</h2><div class="week">${last7.map(x => `<div class="wd"><div class="wbar"><div style="height:${Math.round(x.v / maxX * 100)}%" class="${x.v >= S.dailyGoal ? 'hit' : ''}"></div></div><span>${x.l}</span><span class="muted small">${x.v}</span></div>`).join('')}</div>

      <h2>🧠 Mastery by season</h2><div class="mastery">${myUnits().map(u => { const mm2 = unitMastery(u); const d = u.lessons.filter(l => lessonDone(l.id)).length; return `<div class="mrow"><span>${u.icon} ${esc(u.title)}</span><div class="bar"><div style="width:${mm2 || 0}%;background:${u.color}"></div></div><span class="small">${mm2 == null ? '–' : mm2 + '%'} · ${d}/${u.lessons.length}</span></div>`; }).join('')}</div>

      <h2>🏁 Leaderboard</h2><table class="tbl board"><tr><th>#</th><th>Trader</th><th>XP</th><th>Rank</th><th>🟢</th><th>Lessons</th><th>Avg</th><th>Arena</th></tr>
        ${board.map((b, i) => `<tr class="${b.me ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td><b>${esc(b.name)}</b>${b.me ? ' (you)' : ''}${b.at && !b.me && imported.includes(b) ? ` <span class="muted small">synced ${esc(b.at)}</span>` : ''}</td><td class="mono">${b.xp}</td><td>${title(b.level)}</td><td>${b.streak}</td><td>${b.done}</td><td>${letter(b.avg)}</td><td>${fmtR(b.exp)} · ${b.trades}t</td></tr>`).join('')}</table>
      <div class="share"><div><b>Learning on different devices?</b> Send your friend your <i>share code</i>, and paste theirs here to update the board.</div>
        <div class="row"><button class="btn ghost sm" data-act="copy-share">📋 Copy my share code</button><input id="friendcode" placeholder="Paste friend's share code"><button class="btn ghost sm" data-act="add-friend">Add</button></div></div>

      <h2>🎖️ Badges</h2><div class="badges">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>

      <h2>📝 Recent sessions</h2>${S.quizLog.length ? `<table class="tbl"><tr><th>Date</th><th>Session</th><th>Style</th><th>Grade</th></tr>${S.quizLog.slice(0, 15).map(q => `<tr><td>${new Date(q.at).toLocaleDateString('en-GB')}</td><td>${esc(q.title)}</td><td>${q.method && M.METHODS[q.method] ? M.METHODS[q.method].icon : q.kind === 'review' ? '🔁' : ''}</td><td class="${q.score < 80 ? 'bad' : 'good'}">${letter(q.score)} · ${q.score}% (${q.right}/${q.total})</td></tr>`).join('')}</table>` : '<p class="muted">No sessions yet.</p>'}

      <h2>🎧 Cuh's voice</h2>${V.canSpeak ? `<div class="settings"><div class="row"><select id="vname"><option value="">Best available voice</option>${V.englishVoices().map(v => `<option value="${esc(v.name)}" ${v.name === (S.voice || {}).name ? 'selected' : ''}>${esc(v.name.replace(/^Microsoft /, '').replace(/ - English.*$/, ''))} (${esc(v.lang)})</option>`).join('')}</select>
        <select id="vrate">${[[0.85, 'Slow'], [1, 'Normal'], [1.15, 'Fast'], [1.3, 'Very fast']].map(([r, t]) => `<option value="${r}" ${r === ((S.voice || {}).rate || 1) ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn ghost sm" data-act="voice-test">▶ Hear Cuh</button></div>
        <div class="muted small">${V.canListen ? 'Talking back to Cuh uses your microphone and needs internet.' : 'This browser can speak but can\'t listen. Use Edge or Chrome to answer by voice.'} The most natural voices are in Microsoft Edge.</div></div>` : '<p class="muted">This browser has no voices. Try Microsoft Edge.</p>'}

      <h2>⚙️ Settings</h2><div class="settings">
        <label>Daily XP target <select id="goal">${[10, 20, 30, 50, 80].map(g => `<option ${g === S.dailyGoal ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <div class="muted small">Signed in as <b>${esc(S.email)}</b> · ${esc(S.name)} · age ${esc(S.age)}</div>
        <div class="row"><button class="btn ghost sm" data-act="backup">💾 Copy backup code</button><button class="btn ghost sm" data-act="restore">📥 Restore from backup</button><button class="btn ghost sm" data-act="check-updates">🔄 Check for updates</button><span class="muted small" id="appver"></span><button class="btn ghost sm" data-act="switch">🚪 Sign out</button><button class="btn danger sm" data-act="reset">Reset my progress</button></div>
        <textarea id="restorebox" hidden placeholder="Paste backup code and press Restore again"></textarea></div></div>`;
    $('#goal').addEventListener('change', e => { S.dailyGoal = +e.target.value; save(); renderTop(); });
    showVersion();
    const vn = $('#vname'), vr = $('#vrate');
    const setV = () => { S.voice = { name: vn.value, rate: +vr.value }; V.set(S.voice); save(); };
    if (vn) { vn.addEventListener('change', () => { setV(); V.speak(`Yo ${S.name}, this is my new voice.`); }); vr.addEventListener('change', () => { setV(); V.speak('This is how fast I talk now.'); }); }
  }

  /* ───────── check for updates ───────── */
  const vnum = v => (String(v || '').match(/(\d+)$/) || [])[1] || '?';
  async function currentVersion() {
    try { const v = (await caches.keys()).find(k => /^mtb-v\d+$/.test(k)); if (v) return v; } catch (e) { }
    return null;
  }
  async function latestVersion() {
    const txt = await (await fetch('sw.js?check=' + Date.now(), { cache: 'no-store' })).text();
    return (txt.match(/VERSION = '([^']+)'/) || [])[1] || null;
  }
  async function showVersion() { const el = $('#appver'); if (el) { const v = await currentVersion(); el.textContent = v ? 'Version ' + vnum(v) : ''; } }
  function restartApp() {
    try { save(); C.flushAll(); } catch (e) { }
    setTimeout(() => location.reload(), 600);
  }
  async function checkUpdates(btn) {
    const label = btn.textContent; btn.disabled = true; btn.textContent = '🔄 Checking…';
    const done = msg => { btn.disabled = false; btn.textContent = label; if (msg) toast(msg); };
    let latest;
    try { latest = await latestVersion(); } catch (e) { return done('📡 Can\'t check right now. Are you online?'); }
    const cur = await currentVersion();
    if (latest && cur === latest) return done(`✅ You have the newest version (${vnum(latest)})`);
    btn.textContent = '⬇️ Updating…';
    toast(`⬇️ Getting version ${vnum(latest)}…`, 'level');
    const swc = navigator.serviceWorker;
    const reg = swc && await swc.getRegistration().catch(() => null);
    if (!reg) return restartApp();
    let restarted = false;
    const go2 = () => { if (restarted) return; restarted = true; toast('✨ Updated! Restarting…', 'badge'); restartApp(); };
    swc.addEventListener('controllerchange', go2, { once: true });
    try { await reg.update(); } catch (e) { }
    // If the new version installs without taking over (or there's no SW change), restart anyway after a moment.
    const nw = reg.installing || reg.waiting;
    if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'activated') go2(); });
    setTimeout(go2, 6000);
  }

  /* ───────── events ───────── */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === 'A') e.preventDefault();
    switch (act) {
      case 'auth-mode': { const f = $('#authform'); if (f && f.email) authEmail = f.email.value; return renderAuth(el.dataset.m); }
      case 'quick-acct': { authEmail = el.dataset.email; const f = $('#authform'); if (f) { f.email.value = authEmail; f.password.focus(); } return; }
      case 'toggle-pw': { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; return; }
      case 'reset-pw': return resetPassword(el.dataset.id);
      case 'check-updates': return checkUpdates(el);
      case 'forgot-pw': {
        const f = $('#authform'); const email = normEmail(f.email.value); const err = $('#ob-err');
        if (!validEmail(email)) { err.textContent = 'Type your email first, then tap the reset link.'; return; }
        try { await C.resetEmail(email); err.innerHTML = '<span class="good">📧 Sent! Check your email (and spam). Pick a new password there (it needs 6+ characters), then sign in with it.</span>'; }
        catch (e2) { err.textContent = C.friendly(e2); } return;
      }
      case 'toggle-track': { const set = new Set(S._pickTracks || S.tracks || []); set.has(el.dataset.id) ? set.delete(el.dataset.id) : set.add(el.dataset.id); S._pickTracks = [...set]; return renderTrackPicker(); }
      case 'save-tracks': { const list = TRACKS.map(t => t.id).filter(id => (S._pickTracks || S.tracks || []).includes(id)); if (!list.length) return; delete S._pickTracks; S.tracks = list; if (!list.includes(S.track)) S.track = list[0]; save(); document.body.classList.remove('no-shell'); return go('learn'); }
      case 'cancel-tracks': delete S._pickTracks; document.body.classList.remove('no-shell'); return go('progress');
      case 'change-tracks': S._pickTracks = (S.tracks || []).slice(); return renderTrackPicker();
      case 'set-track': S.track = el.dataset.id; save(); return renderLearn($('#main'));
      case 'switch': if (window.TQ_Arena) window.TQ_Arena.pause(); stopTimer(); V.stop(); return signOut();
      case 'go': return go(el.dataset.v);
      case 'open-lesson': if (!LBYID[el.dataset.id] || !unlocked(LBYID[el.dataset.id])) return toast('🔒 Finish the earlier lessons first'); return openLesson(el.dataset.id);
      case 'start-review': return openReview();
      case 'sel': return selOpt(el.dataset.i);
      case 'check': return check(false);
      case 'lock': return lockPredict();
      case 'more': return moreBubble();
      case 'open-voice': if (!LBYID[el.dataset.id] || !unlocked(LBYID[el.dataset.id])) return; return openLesson(el.dataset.id, 'voice');
      case 'voice-pause': return togglePause();
      case 'voice-listen': { const st = curStep().s; return voiceListen(st, 1); }
      case 'read-aloud': return readAloud();
      case 'voice-test': return V.speak(`Yo ${S.name}! I'm Cuh, your trading teacher. Let's make some smart moves today.`);
      case 'coach-voice': S.coachVoice = !S.coachVoice; save(); if (!S.coachVoice) V.stop(); return renderCoach($('#main'));
      case 'coach-mic': {
        if (coachTalk) { coachTalk = false; V.stop(); return renderCoach($('#main')); }
        coachTalk = true; V.stop(); if (!S.coachVoice) { S.coachVoice = true; save(); }
        renderCoach($('#main')); return coachListen();
      }
      case 'want-method': {
        const to = el.dataset.m; if (!M.METHODS[to]) return;
        if (isOwner()) { applyMethodTo(S, to, 'self'); $('#rate-more').innerHTML = `<p class="good"><b>Done!</b> ${methodChip(to)} is now your main style.</p>`; return; }
        const r = makeRequest({ to, stars: P ? P.stars : 5, reason: 'liked', reasonLabel: '👍 Loved trying it', text: '', why: M.METHODS[to].pitch });
        $('#rate-more').innerHTML = requestSentHTML(r, 'Nice.', 'Nice.'); return;
      }
      case 'next': return next();
      case 'done': return closePlayer();
      case 'quit': if (P && P.pos > 0 && !P.done && !(await confirmBox('Quit this lesson? Progress in this lesson will be lost.', 'Quit'))) return; return closePlayer();
      case 'rate': return rate(+el.dataset.n);
      case 'reason': return pickReason(el.dataset.r);
      case 'send-reason': return sendReason();
      case 'lab-now': closePlayer(); return go('lab');
      case 'tell-owner': { const r = S.myRequest; if (r) sendMsg(requestMessage(r)); return; }
      case 'use-code': {
        const r = S.myRequest; const to = r && M.checkApproval(r.id, $('#apprcode').value);
        if (!to) return toast('That code doesn\'t match this request.');
        const L = lab(); const lr = L.requests.find(x => x.id === r.id); if (lr) { lr.status = 'approved'; lr.decidedTo = to; saveLab(L); }
        applyMethodTo(S, to, 'approved'); return render();
      }
      case 'dismiss-notice': S.notice = null; save(); return render();
      case 'approve': return approve(el.dataset.id, ($('#to-' + el.dataset.id) || {}).value);
      case 'decline': return decline(el.dataset.id);
      case 'show-code': return showCode(el.dataset.id);
      case 'add-req': {
        try {
          const r = b64d($('#reqcode').value.trim().replace(/^MTBR\./, '')); if (!r.id || !M.METHODS[r.to] || !M.METHODS[r.from]) throw 0;
          const L = lab(); if (L.requests.some(x => x.id === r.id)) return toast('Already in your Lab');
          r.status = 'pending'; r.remote = true; L.requests.unshift(r); saveLab(L); toast('📥 Request added'); renderLab($('#main')); renderTop();
        } catch (err) { toast('That code doesn\'t look right.'); } return;
      }
      case 'claude-report': return copy(claudeReport(), '📋 Report copied. Paste it to Claude.');
      case 'ask': return askCoach(el.dataset.q);
      case 'ask-news': go('coach'); return askCoach('Explain this news for a trader: ' + el.dataset.t);
      case 'clear-chat': S.chat = []; save(); return renderCoach($('#main'));
      case 'nf': newsFilter = el.dataset.f; return renderNews($('#main'));
      case 'copy-share': return copy('MTB1.' + b64e(profileSummary(S)), '📋 Share code copied! Send it to your friend.');
      case 'add-friend': {
        try { const v = $('#friendcode').value.trim(); const f = b64d(v.replace(/^MTB1\./, '')); if (!f.name || typeof f.xp !== 'number') throw 0; if (f.name === S.name) return toast('That\'s your own code 😄'); S.friends[f.name] = f; save(); toast(`✅ ${f.name} added to the board`); renderProgress($('#main')); }
        catch (err) { toast('That code doesn\'t look right.'); } return;
      }
      case 'backup': return copy('MTBK.' + b64e(S), '💾 Backup code copied. Keep it somewhere safe.');
      case 'restore': {
        const box = $('#restorebox'); if (box.hidden) { box.hidden = false; box.focus(); return; }
        try { const st = b64d(box.value.replace(/^MTBK\./, '')); if (st.id !== S.id) { if (!(await confirmBox(`This backup belongs to "${st.name}". Load it into ${S.name}'s profile anyway?`, 'Load'))) return; st.id = S.id; } S = Object.assign(fresh(profileOf(S.id)), st); save(); toast('✅ Progress restored'); render(); }
        catch (err) { toast('Backup code is invalid.'); } return;
      }
      case 'reset': if (await confirmBox(`Erase ALL of ${S.name}'s progress (lessons, grades, Arena, XP)? Your account stays. This can't be undone.`, 'Erase')) { const keep = { name: S.name, email: S.email, age: S.age }; S = Object.assign(fresh(profileOf(S.id)), keep, { onboarded: true }); save(); render(); } return;
    }
  });
  document.addEventListener('keydown', e => {
    if (!P || $('#overlay').hidden || P.done) return;
    if (e.key === 'Enter' && document.activeElement && document.activeElement.id !== 'numans' && document.activeElement.tagName !== 'TEXTAREA') { const b = $('#pbtn'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
    const k = e.key.toUpperCase(); const map = { A: 0, B: 1, C: 2, D: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    if (k in map && !P.checked && document.activeElement.id !== 'numans') { const opts = document.querySelectorAll('.opt'); const o = opts[map[k]]; if (o) selOpt(o.dataset.i); }
  });
  window.addEventListener('resize', () => { if (view === 'arena' && window.TQ_Arena) window.TQ_Arena.redraw(); });

  /* ───────── public API for arena.js ───────── */
  window.TQ_App = { get S() { return S; }, checkUpdates, currentVersion, save, addXP, toast, confirmBox, esc, fmt$, fmtR, md, checkBadges, arenaStats, go, askCoach: (q) => { go('coach'); askCoach(q); } };

  document.title = CFG.appName;
  // Open straight into the signed-in account (if "stay signed in"), otherwise show sign in / create account.
  history.replaceState(null, '', location.pathname + location.search);
  let sid = ''; try { sid = sessionStorage.getItem(SESSKEY) || ''; } catch (e) { }
  sid = sid || storeGet(SESSKEY) || '';
  if (C.enabled()) {
    $('#app').innerHTML = `<div class="picker"><div class="logo-big"><span class="logo-mark">◢</span> ${esc(CFG.appName)}</div><p class="muted">Loading…</p></div>`;
    C.init().then(async user => {
      if (user && (!sid || sid === user.uid)) {
        try { const d = await C.load(user.uid); mergeCloudState(user.uid, d); const pr = (d && d.profile) || {}; if (pr.email) upsertAccount(Object.assign({ id: user.uid, cloud: true }, pr)); } catch (e) { }
        if (acctOf(user.uid)) return enter(user.uid);
      }
      if (sid && acctOf(sid) && !(acctOf(sid) || {}).cloud) return enter(sid);
      renderAuth();
    }).catch(() => { if (sid && acctOf(sid)) enter(sid); else renderAuth(); }); // offline: use this device's copy
  } else if (sid && acctOf(sid)) enter(sid); else renderAuth();
})();
