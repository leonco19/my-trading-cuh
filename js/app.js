/* My Trading Bro – main app (profiles, lessons, grading & mastery, review, coach, news, progress) */
(function () {
  'use strict';
  const CFG = window.TQ_CONFIG, COURSE = window.TQ_COURSE;
  const KEY = id => 'mtb:v1:' + id;
  const LAST = 'mtb:v1:lastProfile';

  /* ───────── utils ───────── */
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = (d) => (d || new Date()).toLocaleDateString('en-CA');
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
  const fmt$ = v => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtR = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
  function md(s) {
    return esc(s)
      .replace(/\[\[lesson:(\w+)\|([^\]]+)\]\]/g, '<a href="#" class="lesson-link" data-act="open-lesson" data-id="$1">📘 $2</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1<i>$2</i>')
      .replace(/\n/g, '<br>');
  }
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  /* ───────── course index ───────── */
  const LESSONS = [];
  COURSE.forEach((u, ui) => u.lessons.forEach((l, li) => LESSONS.push(Object.assign(l, { unit: u, ui, li, n: LESSONS.length }))));
  const LBYID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
  const isQ = c => c.t !== 'learn';
  const qCount = l => l.cards.filter(isQ).length;

  /* ───────── state ───────── */
  let S = null; // current profile state
  function fresh(p) {
    return {
      v: 1, id: p.id, name: p.name, age: null, email: '', onboarded: false, createdAt: Date.now(),
      xp: 0, dailyXp: {}, streak: { count: 0, last: null, best: 0 }, dailyGoal: CFG.defaultDailyGoal,
      lessons: {}, cards: {}, quizLog: [], reviews: 0,
      arena: { balance: CFG.arena.startBalance, start: CFG.arena.startBalance, days: 0, trades: [], equity: [CFG.arena.startBalance], seed: Math.floor(Math.random() * 1e6) },
      chat: [], badges: {}, friends: {},
    };
  }
  function load(id) {
    const p = CFG.profiles.find(x => x.id === id);
    let st = null; try { st = JSON.parse(storeGet(KEY(id)) || 'null'); } catch (e) { st = null; }
    return Object.assign(fresh(p), st || {});
  }
  function save() { if (S) storeSet(KEY(S.id), JSON.stringify(S)); }

  /* ───────── XP, streak, level ───────── */
  const TITLES = ['Rookie', 'Chart Reader', 'Level Hunter', 'Risk Manager', 'Setup Sniper', 'Disciplined Trader', 'Pro Trader', 'Market Wizard'];
  const level = xp => Math.floor(Math.sqrt(xp / 25)) + 1;
  const levelXp = lv => 25 * (lv - 1) * (lv - 1);
  const title = lv => TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 2))];
  function touchStreak() {
    const d = today(); const st = S.streak;
    if (st.last === d) return;
    st.count = st.last && daysBetween(st.last, d) === 1 ? st.count + 1 : 1;
    st.last = d; st.best = Math.max(st.best, st.count);
  }
  function liveStreak() { return S.streak.last && daysBetween(S.streak.last, today()) <= 1 ? S.streak.count : 0; }
  function addXP(n, why) {
    if (n <= 0) return;
    const before = level(S.xp);
    S.xp += n; S.dailyXp[today()] = (S.dailyXp[today()] || 0) + n;
    touchStreak(); checkBadges(); save(); renderTop();
    toast(`+${n} XP${why ? ' · ' + why : ''}`, 'xp');
    if (level(S.xp) > before) setTimeout(() => toast(`🎉 Level ${level(S.xp)}: ${title(level(S.xp))}!`, 'level'), 600);
  }

  /* ───────── grading & mastery ───────── */
  function lessonDone(id) { return !!(S.lessons[id] && S.lessons[id].completedAt); }
  function unlocked(l) { return l.n === 0 || lessonDone(LESSONS[l.n - 1].id) || lessonDone(l.id); }
  function nextLesson() { const l = LESSONS.find(x => !lessonDone(x.id)); return l ? l.id : null; }
  function stars(score) { return score >= 100 ? 3 : score >= 80 ? 2 : 1; }
  function weakLessons() {
    return LESSONS.filter(l => S.lessons[l.id] && S.lessons[l.id].last != null && (S.lessons[l.id].last < 80 || missedIn(l.id) > 0))
      .map(l => ({ id: l.id, title: l.title, unit: l.unit.title, score: S.lessons[l.id].last, missed: missedIn(l.id) }))
      .sort((a, b) => a.score - b.score);
  }
  function missedIn(lessonId) { return Object.entries(S.cards).filter(([k, v]) => k.startsWith(lessonId + ':') && v.last === false).length; }
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
      done: LESSONS.filter(l => lessonDone(l.id)).length, total: LESSONS.length, avgGrade: avgGrade(),
      weak: weakLessons(), next: nextLesson(), arena: a,
      strong: LESSONS.filter(l => S.lessons[l.id] && S.lessons[l.id].last >= 90).map(l => l.title),
    };
  }

  /* ───────── badges ───────── */
  const BADGES = [
    { id: 'first_lesson', icon: '👣', name: 'First Steps', desc: 'Complete your first lesson', test: () => LESSONS.some(l => lessonDone(l.id)) },
    { id: 'perfect', icon: '💯', name: 'Perfectionist', desc: 'Score 100% on a lesson', test: () => Object.values(S.lessons).some(x => x.best === 100) },
    { id: 'unit', icon: '🏅', name: 'Unit Cleared', desc: 'Finish a whole unit', test: () => COURSE.some(u => u.lessons.every(l => lessonDone(l.id))) },
    { id: 'risk', icon: '🛡️', name: 'Risk Manager', desc: 'Finish Risk Management with 90%+ mastery', test: () => { const u = COURSE.find(x => x.id === 'u4'); return u.lessons.every(l => lessonDone(l.id)) && unitMastery(u) >= 90; } },
    { id: 'streak3', icon: '🔥', name: 'On Fire', desc: '3-day streak', test: () => S.streak.best >= 3 },
    { id: 'streak7', icon: '⚡', name: 'Unstoppable', desc: '7-day streak', test: () => S.streak.best >= 7 },
    { id: 'review3', icon: '🔁', name: 'Fixer', desc: 'Finish 3 review sessions', test: () => S.reviews >= 3 },
    { id: 'trade1', icon: '🎯', name: 'First Trade', desc: 'Take a trade in the Arena', test: () => S.arena.trades.length >= 1 },
    { id: 'journal10', icon: '📓', name: 'Journal Keeper', desc: 'Journal 10 Arena trades', test: () => S.arena.trades.filter(t => t.setup).length >= 10 },
    { id: 'disciplined', icon: '🧘', name: 'Disciplined Day', desc: 'Finish an Arena day with trades and zero rule breaks', test: () => !!S.badges._discDay },
    { id: 'trades50', icon: '📈', name: 'Grinder', desc: '50 Arena trades', test: () => S.arena.trades.length >= 50 },
    { id: 'edge', icon: '🧠', name: 'Edge Found', desc: 'Positive expectancy over 30+ trades', test: () => S.arena.trades.length >= 30 && arenaStats().expectancy > 0 },
    { id: 'grad', icon: '🎓', name: 'Graduate', desc: 'Pass the final exam (80%+)', test: () => (S.lessons.u8l3 || {}).best >= 80 },
  ];
  function checkBadges() {
    for (const b of BADGES) if (!S.badges[b.id] && b.test()) { S.badges[b.id] = Date.now(); setTimeout(() => toast(`${b.icon} Badge unlocked: ${b.name}`, 'badge'), 900); }
  }

  /* ───────── toast & modal ───────── */
  function toast(text, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = text;
    $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
  }
  function confirmBox(text, okLabel) {
    return new Promise(res => {
      const m = $('#modal');
      m.innerHTML = `<div class="modal-card"><p>${esc(text)}</p><div class="row end"><button class="btn ghost" data-r="0">Cancel</button><button class="btn danger" data-r="1">${esc(okLabel || 'Yes')}</button></div></div>`;
      m.hidden = false;
      m.onclick = e => { const b = e.target.closest('[data-r]'); if (!b && e.target !== m) return; m.hidden = true; m.onclick = null; res(b && b.dataset.r === '1'); };
    });
  }

  /* ───────── routing ───────── */
  const VIEWS = ['learn', 'arena', 'review', 'coach', 'news', 'progress'];
  let view = 'learn';
  function go(v) { view = VIEWS.includes(v) ? v : 'learn'; if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view); render(); }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S && S.onboarded && h !== view && VIEWS.includes(h)) { view = h; render(); } });

  /* ───────── profile picker & onboarding ───────── */
  function renderPicker() {
    document.body.classList.add('no-shell');
    const cards = CFG.profiles.map(p => {
      const st = load(p.id);
      const sub = st.onboarded ? `Level ${level(st.xp)} · ${st.xp} XP · 🔥 ${st.streak.last && daysBetween(st.streak.last, today()) <= 1 ? st.streak.count : 0}` : 'New learner: tap to start';
      return `<button class="profile-card" data-act="pick" data-id="${p.id}" style="--pc:${p.color}"><span class="avatar">${p.avatar}</span><span class="pname">${esc(st.onboarded ? st.name : p.name)}</span><span class="psub">${esc(sub)}</span></button>`;
    }).join('');
    $('#app').innerHTML = `<div class="picker"><div class="logo-big">📈 ${esc(CFG.appName)}</div><h1>Who's learning today?</h1><div class="profiles">${cards}</div>
      <p class="muted small">Progress is saved in this browser. Use <b>Progress → Backup code</b> to move it to another device.</p></div>`;
  }
  function renderOnboarding() {
    document.body.classList.add('no-shell');
    const p = CFG.profiles.find(x => x.id === S.id);
    $('#app').innerHTML = `<div class="picker"><div class="avatar xl" style="--pc:${p.color}">${p.avatar}</div><h1>Welcome! Let's set you up</h1>
      <form class="onboard" id="onboard" novalidate>
        <label>Your name<input name="name" required maxlength="30" value="${esc(S.name)}"></label>
        <label>Age<input name="age" type="number" min="10" max="99" required placeholder="e.g. 17"></label>
        <label>Email<input name="email" type="email" required placeholder="you@example.com"></label>
        <p class="muted small">🔒 Stored only in this browser on this device. It isn't sent anywhere.</p>
        <div class="err" id="ob-err"></div>
        <button class="btn primary big" type="submit">Let's go 🚀</button>
        <button class="btn ghost" type="button" data-act="switch">← Back</button>
      </form></div>`;
    $('#onboard').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target); const name = String(f.get('name')).trim(); const age = +f.get('age'); const email = String(f.get('email')).trim();
      const err = !name ? 'Please enter your name.' : !(age >= 10 && age <= 99) ? 'Please enter a valid age.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email.' : '';
      if (err) { $('#ob-err').textContent = err; return; }
      Object.assign(S, { name, age, email, onboarded: true }); save();
      document.body.classList.remove('no-shell');
      if (age < 18) toast('🎮 Simulator mode: practice now, real money at 18', 'level');
      go('learn');
    });
  }
  function pick(id) {
    S = load(id); storeSet(LAST, id);
    if (!S.onboarded) return renderOnboarding();
    document.body.classList.remove('no-shell');
    go(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'learn');
  }

  /* ───────── shell ───────── */
  function renderShell() {
    if ($('#shell')) return;
    const nav = [['learn', '🗺️', 'Learn'], ['arena', '🕹️', 'Arena'], ['review', '🔁', 'Review'], ['coach', '🤖', 'Coach'], ['news', '📰', 'News'], ['progress', '🏆', 'Progress']];
    $('#app').innerHTML = `<div id="shell">
      <nav class="side"><div class="logo">📈 <span>${esc(CFG.appName)}</span></div>${nav.map(([v, i, t]) => `<a href="#${v}" class="nav-${v}" data-act="go" data-v="${v}"><span class="ni">${i}</span><span class="nt">${t}</span></a>`).join('')}
        <a href="#" class="switch" data-act="switch"><span class="ni">👥</span><span class="nt">Switch learner</span></a></nav>
      <div class="col"><header class="top" id="top"></header><main id="main"></main></div></div>`;
  }
  function renderTop() {
    const t = $('#top'); if (!t || !S) return;
    const lv = level(S.xp), cur = S.xp - levelXp(lv), need = levelXp(lv + 1) - levelXp(lv);
    const dx = S.dailyXp[today()] || 0, pct = Math.min(100, Math.round(dx / S.dailyGoal * 100));
    const p = CFG.profiles.find(x => x.id === S.id);
    t.innerHTML = `<div class="who" data-act="switch" title="Switch learner"><span class="avatar sm" style="--pc:${p.color}">${p.avatar}</span><div><b>${esc(S.name)}</b><div class="muted small">Lv ${lv} · ${title(lv)}</div></div></div>
      <div class="lvbar" title="${cur}/${need} XP to next level"><div style="width:${Math.round(cur / need * 100)}%"></div></div>
      <div class="chips"><span class="chip fire" title="Day streak">🔥 ${liveStreak()}</span><span class="chip xp" title="Total XP">⚡ ${S.xp}</span>
      <span class="chip goal" title="Daily goal">${ring(pct)} ${dx}/${S.dailyGoal}</span></div>`;
  }
  function ring(p) { const r = 9, c = 2 * Math.PI * r; return `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="${r}" fill="none" stroke="#37464f" stroke-width="3"/><circle cx="11" cy="11" r="${r}" fill="none" stroke="#ffc800" stroke-width="3" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 11 11)" stroke-linecap="round"/></svg>`; }

  function render() {
    if (!S) return renderPicker();
    if (!S.onboarded) return renderOnboarding();
    renderShell(); renderTop();
    document.querySelectorAll('nav.side a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
    const m = $('#main'); m.scrollTop = 0;
    if (window.TQ_Arena && view !== 'arena') window.TQ_Arena.pause();
    ({ learn: renderLearn, arena: () => window.TQ_Arena.render(m), review: renderReview, coach: renderCoach, news: renderNews, progress: renderProgress })[view](m);
  }

  /* ───────── LEARN (path) ───────── */
  function renderLearn(m) {
    const nx = nextLesson();
    let html = '';
    if (S.age && S.age < 18) html += `<div class="banner sim">🎮 <b>Simulator mode.</b> Everything here uses virtual money. Build your skills now, and you'll be ready for real markets at 18.</div>`;
    const weak = weakLessons();
    if (weak.length) html += `<div class="banner warn">🎯 <b>${weak.length} topic${weak.length > 1 ? 's' : ''} need${weak.length > 1 ? '' : 's'} more work:</b> ${weak.slice(0, 3).map(w => esc(w.title) + ` (${w.score}%)`).join(', ')}. <a href="#review" data-act="go" data-v="review">Review now →</a></div>`;
    COURSE.forEach((u, ui) => {
      const unitOpen = u.lessons.some(l => unlocked(l));
      const mast = unitMastery(u);
      html += `<section class="unit ${unitOpen ? '' : 'locked'}" style="--uc:${u.color}"><div class="unit-head"><div><div class="unit-num">UNIT ${ui}</div><h2>${u.icon} ${esc(u.title)}</h2><div class="unit-sub">${esc(u.subtitle)}</div></div>${mast != null ? `<div class="mastery-pill">${mast}% mastery</div>` : ''}</div><div class="path">`;
      u.lessons.forEach((l, li) => {
        const st = S.lessons[l.id]; const done = lessonDone(l.id), open = unlocked(l), cur = l.id === nx;
        const off = [0, 60, 90, 60, 0, -60, -90, -60][li % 8];
        html += `<div class="node-wrap" style="transform:translateX(${off}px)">${cur ? '<div class="start-bubble">START</div>' : ''}
          <button class="node ${done ? 'done' : ''} ${open ? 'open' : 'locked'} ${cur ? 'current' : ''}" ${open ? `data-act="open-lesson" data-id="${l.id}"` : 'disabled'} title="${esc(l.title)}">${open ? l.icon : '🔒'}</button>
          <div class="node-label">${esc(l.title)}${done ? `<span class="stars">${'★'.repeat(st.stars)}${'☆'.repeat(3 - st.stars)}</span><span class="grade ${st.last < 80 ? 'bad' : ''}">${st.last}%</span>` : ''}</div></div>`;
      });
      html += `</div></section>`;
    });
    m.innerHTML = `<div class="learn">${html}</div>`;
    const curEl = m.querySelector('.node.current'); if (curEl) curEl.scrollIntoView({ block: 'center' });
  }

  /* ───────── LESSON / QUIZ PLAYER ───────── */
  let P = null; // player state
  function openLesson(id) {
    const l = LBYID[id]; if (!l || !unlocked(l)) return;
    P = { kind: 'lesson', lesson: l, cards: l.cards.map((c, i) => ({ c, key: l.id + ':' + i })), queue: l.cards.map((_, i) => i), pos: 0, first: {}, mistakes: [] };
    renderPlayer();
  }
  function openReview() {
    const missed = Object.entries(S.cards).filter(([, v]) => v.last === false).sort((a, b) => a[1].at - b[1].at).map(([k]) => k);
    let keys = missed.slice(0, 10);
    if (keys.length < 6) {
      const pool = [];
      LESSONS.filter(l => lessonDone(l.id)).forEach(l => l.cards.forEach((c, i) => { const k = l.id + ':' + i; if (isQ(c) && !keys.includes(k)) pool.push({ k, w: (S.cards[k] || {}).wrong || 0 }); }));
      pool.sort((a, b) => b.w - a.w || Math.random() - 0.5);
      keys = keys.concat(pool.slice(0, 8 - keys.length).map(x => x.k));
    }
    if (!keys.length) { toast('Finish a lesson first, then come back to review!'); return; }
    const cards = keys.map(k => { const [lid, i] = k.split(':'); return { c: LBYID[lid].cards[+i], key: k, from: LBYID[lid] }; });
    P = { kind: 'review', lesson: { title: 'Review: weak spots', icon: '🔁', xp: 0 }, cards, queue: cards.map((_, i) => i), pos: 0, first: {}, mistakes: [] };
    renderPlayer();
  }
  function closePlayer() { P = null; $('#overlay').hidden = true; $('#overlay').innerHTML = ''; render(); }

  function renderPlayer() {
    const o = $('#overlay'); o.hidden = false;
    const idx = P.queue[P.pos]; const { c, from } = P.cards[idx];
    const pct = Math.round(P.pos / P.queue.length * 100);
    let body = '';
    if (c.t === 'learn') body = `<h2>${esc(c.title)}</h2>${c.chart ? '<canvas class="lesson-chart"></canvas>' : ''}<div class="learn-html">${c.html}</div>`;
    else {
      body = `${P.first[idx] === false ? '<div class="retry-tag">🔁 Try again</div>' : ''}${from ? `<div class="muted small">From: ${esc(from.unit.title)} → ${esc(from.title)}</div>` : ''}<h2 class="q">${esc(c.q)}</h2>${c.chart ? '<canvas class="lesson-chart"></canvas>' : ''}`;
      if (c.t === 'mcq') body += `<div class="opts">${c.opts.map((op, i) => `<button class="opt" data-act="sel" data-i="${i}"><span class="k">${i + 1}</span>${esc(op)}</button>`).join('')}</div>`;
      if (c.t === 'tf') body += `<div class="opts tf"><button class="opt" data-act="sel" data-i="1">✅ True</button><button class="opt" data-act="sel" data-i="0">❌ False</button></div>`;
      if (c.t === 'num') body += `<div class="num-in"><input id="numans" type="number" step="any" inputmode="decimal" placeholder="Your answer"><span>${esc(c.suffix || '')}</span></div>`;
    }
    o.innerHTML = `<div class="player"><div class="ptop"><button class="x" data-act="quit">✕</button><div class="pbar"><div style="width:${pct}%"></div></div><span class="ptitle">${P.lesson.icon} ${esc(P.lesson.title)}</span></div>
      <div class="pbody">${body}</div>
      <div class="pfoot" id="pfoot"><div class="fb"></div><button class="btn primary big" id="pbtn" data-act="${c.t === 'learn' ? 'next' : 'check'}" ${c.t === 'learn' ? '' : 'disabled'}>${c.t === 'learn' ? 'Continue' : 'Check'}</button></div></div>`;
    P.sel = null; P.checked = false;
    if (c.chart) requestAnimationFrame(() => { const cv = o.querySelector('.lesson-chart'); const spec = window.TQ_Charts.PATTERNS[c.chart.pattern](c.chart.seed); window.TQ_Charts.draw(cv, spec, { vwap: !spec.noVwap }); });
    const ni = $('#numans'); if (ni) { ni.focus(); ni.addEventListener('input', () => { $('#pbtn').disabled = ni.value === ''; }); ni.addEventListener('keydown', e => { if (e.key === 'Enter' && ni.value !== '') $('#pbtn').click(); }); }
  }
  function selOpt(i) {
    if (P.checked) return; P.sel = +i;
    document.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', b.dataset.i === String(i)));
    $('#pbtn').disabled = false;
  }
  function check() {
    const idx = P.queue[P.pos]; const { c, key } = P.cards[idx];
    let ok;
    if (c.t === 'mcq') ok = P.sel === c.a;
    else if (c.t === 'tf') ok = (P.sel === 1) === c.a;
    else { const v = parseFloat($('#numans').value); ok = Math.abs(v - c.a) <= (c.tol || 0.001) + 1e-9; }
    P.checked = true;
    const firstTime = !(idx in P.first);
    if (firstTime) {
      P.first[idx] = ok;
      const rec = S.cards[key] || { seen: 0, right: 0, wrong: 0 };
      rec.seen++; ok ? rec.right++ : rec.wrong++;
      // In a lesson, a miss marks the card for review; in a review, a correct answer clears it.
      rec.last = ok; rec.at = Date.now(); S.cards[key] = rec;
      if (!ok) { P.mistakes.push({ q: c.q, why: c.why }); P.queue.push(idx); }
      if (P.kind === 'review' && ok) P.reviewRight = (P.reviewRight || 0) + 1;
      save();
    }
    if (c.t !== 'num') document.querySelectorAll('.opt').forEach(b => {
      const bi = +b.dataset.i; const correct = c.t === 'mcq' ? bi === c.a : (bi === 1) === c.a;
      if (correct) b.classList.add('right'); else if (bi === P.sel) b.classList.add('wrong');
      b.disabled = true;
    });
    const foot = $('#pfoot'); foot.className = 'pfoot ' + (ok ? 'ok' : 'bad');
    const answer = c.t === 'num' ? `Correct answer: <b>${c.a}${c.suffix ? ' ' + esc(c.suffix) : ''}</b>. ` : '';
    foot.querySelector('.fb').innerHTML = `<div class="fb-title">${ok ? pickPraise() : 'Not quite'}</div><div class="fb-why">${ok ? '' : answer}${esc(c.why || '')}</div>`;
    const btn = $('#pbtn'); btn.textContent = 'Continue'; btn.dataset.act = 'next'; btn.disabled = false; btn.focus();
  }
  const PRAISE = ['Nice! 🔥', 'Correct! ✅', 'You got it! 💪', 'Great job! 🎯', 'Sharp! 🧠'];
  const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
  function next() { P.pos++; if (P.pos >= P.queue.length) finish(); else renderPlayer(); }

  function finish() {
    const qIdx = P.cards.map((x, i) => i).filter(i => isQ(P.cards[i].c));
    const right = qIdx.filter(i => P.first[i]).length;
    const score = qIdx.length ? Math.round(right / qIdx.length * 100) : 100;
    let xp = 0;
    if (P.kind === 'lesson') {
      const l = P.lesson; const prev = S.lessons[l.id] || { attempts: 0, best: 0 };
      const firstClear = !prev.completedAt;
      xp = Math.round(l.xp * (firstClear ? 1 : 0.4) * (score >= 60 ? 1 : 0.5)) + (score === 100 ? 5 : 0);
      S.lessons[l.id] = { attempts: prev.attempts + 1, best: Math.max(prev.best || 0, score), last: score, stars: Math.max(prev.stars || 0, stars(score)), completedAt: prev.completedAt || Date.now(), lastAt: Date.now() };
    } else { xp = (P.reviewRight || 0) * 3 + 5; S.reviews++; }
    S.quizLog.unshift({ at: Date.now(), kind: P.kind, id: P.lesson.id || 'review', title: P.lesson.title, score, right, total: qIdx.length });
    S.quizLog = S.quizLog.slice(0, 200);
    save(); addXP(xp, P.kind === 'lesson' ? 'Lesson complete' : 'Review');
    const st = stars(score);
    const verdict = score >= 90 ? 'Mastered! 🏆' : score >= 80 ? 'Solid! 💪' : score >= 60 ? 'Getting there, review the misses' : 'Needs more work. Try again!';
    $('#overlay').innerHTML = `<div class="player"><div class="result">
      <div class="big-emoji">${score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪'}</div><h1>${P.kind === 'lesson' ? 'Lesson complete!' : 'Review complete!'}</h1>
      ${P.kind === 'lesson' ? `<div class="stars-big">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div>` : ''}
      <div class="res-stats"><div class="rs"><b>${score}%</b><span>Grade</span></div><div class="rs"><b>${right}/${qIdx.length}</b><span>First try</span></div><div class="rs"><b>+${xp}</b><span>XP</span></div></div>
      <p class="verdict">${verdict}</p>
      ${P.mistakes.length ? `<div class="mistakes"><h3>📝 What to remember</h3>${P.mistakes.map(x => `<div class="mist"><b>${esc(x.q)}</b><div>${esc(x.why)}</div></div>`).join('')}<p class="muted small">These questions are saved to your <b>Review</b> list.</p></div>` : ''}
      <div class="row center">${P.kind === 'lesson' && score < 80 ? `<button class="btn ghost big" data-act="open-lesson" data-id="${P.lesson.id}">Retry lesson</button>` : ''}<button class="btn primary big" data-act="done">Continue</button></div></div></div>`;
  }

  /* ───────── REVIEW ───────── */
  function renderReview(m) {
    const missed = Object.entries(S.cards).filter(([, v]) => v.last === false);
    const weak = weakLessons();
    m.innerHTML = `<div class="page"><h1>🔁 Review your weak spots</h1>
      <p class="muted">Every question you miss is saved here. Answer it correctly in review to clear it.</p>
      <div class="review-hero"><div><div class="big-num">${missed.length}</div><div>question${missed.length === 1 ? '' : 's'} to fix</div></div>
      <button class="btn primary big" data-act="start-review">${missed.length ? 'Start review' : 'Practice mixed questions'}</button></div>
      <h2>Topics by grade</h2>${weak.length ? '' : '<p class="muted">No weak topics right now. Keep going! 💪</p>'}
      <div class="weak-list">${weak.map(w => `<div class="weak"><div><b>${esc(w.title)}</b><div class="muted small">${esc(w.unit)} · ${w.missed} open mistake${w.missed === 1 ? '' : 's'}</div></div><div class="bar"><div style="width:${w.score}%;background:${w.score < 60 ? '#ff4b4b' : '#ff9600'}"></div></div><b>${w.score}%</b><button class="btn ghost sm" data-act="open-lesson" data-id="${w.id}">Redo</button></div>`).join('')}</div></div>`;
  }

  /* ───────── COACH ───────── */
  let coachBusy = false;
  function renderCoach(m) {
    const ai = !!CFG.aiEndpoint;
    const msgs = S.chat.length ? S.chat : [{ role: 'assistant', content: `Hey ${S.name}! I'm your trading coach 🤖. I know your grades and Arena stats. Ask me about any term, calculation, the market hours, or "what should I work on?"` }];
    m.innerHTML = `<div class="page coach"><div class="coach-head"><h1>🤖 Coach</h1><span class="pill ${ai ? 'ai' : ''}">${ai ? 'AI mode' : 'Offline coach'}</span>${S.chat.length ? '<button class="btn ghost sm" data-act="clear-chat">Clear chat</button>' : ''}</div>
      <div class="chat" id="chat">${msgs.map(x => `<div class="msg ${x.role}">${md(x.content)}</div>`).join('')}</div>
      <div class="suggest">${['What should I work on?', 'Is the market open?', 'What is VWAP?', 'position size 25000 1% entry 40 stop 39.5', 'My stats'].map(s => `<button class="chip-btn" data-act="ask" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="chat-in" id="chatform"><input id="chatq" autocomplete="off" placeholder="Ask your coach…" maxlength="500"><button class="btn primary" type="submit">Send</button></form>
      <p class="muted small">Education only, not financial advice. The coach never recommends specific stocks to buy.</p></div>`;
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
        <div class="row"><a class="src" href="${esc(i.url)}" target="_blank" rel="noopener">Source: ${esc(i.source)} ↗</a>${i.lesson ? `<a href="#" class="lesson-link" data-act="open-lesson" data-id="${i.lesson}">📘 Related lesson</a>` : ''}<button class="btn ghost sm" data-act="ask-news" data-t="${esc(i.title)}">Ask coach</button></div></article>`).join('')}</div>
      <h2>🔴 Live sources (check daily)</h2><div class="sources">${N.liveSources.map(s => `<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></a>`).join('')}</div></div>`;
  }

  /* ───────── PROGRESS ───────── */
  function profileSummary(st) {
    const a = arenaStats(st);
    const done = LESSONS.filter(l => st.lessons[l.id] && st.lessons[l.id].completedAt).length;
    const g = Object.values(st.lessons).filter(x => x.last != null).map(x => x.last);
    return { name: st.name, xp: st.xp, level: level(st.xp), streak: st.streak.last && daysBetween(st.streak.last, today()) <= 1 ? st.streak.count : 0, done, avg: g.length ? Math.round(g.reduce((x, y) => x + y, 0) / g.length) : 0, trades: a.trades, exp: +a.expectancy.toFixed(2), totalR: +a.totalR.toFixed(1), at: today() };
  }
  function renderProgress(m) {
    const me = profileSummary(S);
    const others = CFG.profiles.filter(p => p.id !== S.id).map(p => load(p.id)).filter(st => st.onboarded).map(profileSummary);
    const imported = Object.values(S.friends || {});
    const board = [Object.assign({ me: true }, me)].concat(others, imported.filter(f => !others.some(o => o.name === f.name))).sort((a, b) => b.xp - a.xp);
    const a = arenaStats();
    const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = today(d); return { k, v: S.dailyXp[k] || 0, l: d.toLocaleDateString('en', { weekday: 'short' }) }; });
    const maxX = Math.max(S.dailyGoal, ...last7.map(x => x.v));
    m.innerHTML = `<div class="page"><h1>🏆 Progress: ${esc(S.name)}</h1>
      <div class="stat-grid">
        <div class="stat"><b>${me.level}</b><span>Level · ${title(me.level)}</span></div><div class="stat"><b>${S.xp}</b><span>Total XP</span></div>
        <div class="stat"><b>🔥 ${me.streak}</b><span>Streak (best ${S.streak.best})</span></div><div class="stat"><b>${me.done}/${LESSONS.length}</b><span>Lessons</span></div>
        <div class="stat"><b>${me.avg}%</b><span>Average grade</span></div><div class="stat"><b>${fmtR(a.expectancy)}</b><span>Arena expectancy (${a.trades} trades)</span></div></div>

      <h2>📅 This week</h2><div class="week">${last7.map(x => `<div class="wd"><div class="wbar"><div style="height:${Math.round(x.v / maxX * 100)}%" class="${x.v >= S.dailyGoal ? 'hit' : ''}"></div></div><span>${x.l}</span><span class="muted small">${x.v}</span></div>`).join('')}</div>

      <h2>🧠 Mastery by unit</h2><div class="mastery">${COURSE.map(u => { const mm = unitMastery(u); const d = u.lessons.filter(l => lessonDone(l.id)).length; return `<div class="mrow"><span>${u.icon} ${esc(u.title)}</span><div class="bar"><div style="width:${mm || 0}%;background:${u.color}"></div></div><span class="small">${mm == null ? '–' : mm + '%'} · ${d}/${u.lessons.length}</span></div>`; }).join('')}</div>

      <h2>🏁 Leaderboard</h2><table class="tbl board"><tr><th>#</th><th>Learner</th><th>Level</th><th>XP</th><th>🔥</th><th>Lessons</th><th>Avg grade</th><th>Arena</th></tr>
        ${board.map((b, i) => `<tr class="${b.me ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(b.name)}${b.me ? ' (you)' : ''}${b.at && !b.me && imported.includes(b) ? ` <span class="muted small">synced ${esc(b.at)}</span>` : ''}</td><td>${b.level}</td><td>${b.xp}</td><td>${b.streak}</td><td>${b.done}</td><td>${b.avg}%</td><td>${fmtR(b.exp)} · ${b.trades}t</td></tr>`).join('')}</table>
      <div class="share"><div><b>Learning on different devices?</b> Send your friend your <i>share code</i>, and paste theirs here to update the leaderboard.</div>
        <div class="row"><button class="btn ghost sm" data-act="copy-share">📋 Copy my share code</button><input id="friendcode" placeholder="Paste friend's share code"><button class="btn ghost sm" data-act="add-friend">Add</button></div></div>

      <h2>🎖️ Badges</h2><div class="badges">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>

      <h2>📝 Recent quiz grades</h2>${S.quizLog.length ? `<table class="tbl"><tr><th>Date</th><th>Quiz</th><th>Grade</th></tr>${S.quizLog.slice(0, 15).map(q => `<tr><td>${new Date(q.at).toLocaleDateString('en-GB')}</td><td>${esc(q.title)}</td><td class="${q.score < 80 ? 'bad' : 'good'}">${q.score}% (${q.right}/${q.total})</td></tr>`).join('')}</table>` : '<p class="muted">No quizzes yet.</p>'}

      <h2>⚙️ Settings</h2><div class="settings">
        <label>Daily XP goal <select id="goal">${[10, 20, 30, 50, 80].map(g => `<option ${g === S.dailyGoal ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <div class="muted small">Profile: ${esc(S.name)} · age ${esc(S.age)} · ${esc(S.email)}</div>
        <div class="row"><button class="btn ghost sm" data-act="backup">💾 Copy backup code</button><button class="btn ghost sm" data-act="restore">📥 Restore from backup</button><button class="btn danger sm" data-act="reset">Reset my progress</button></div>
        <textarea id="restorebox" hidden placeholder="Paste backup code and press Restore again"></textarea></div></div>`;
    $('#goal').addEventListener('change', e => { S.dailyGoal = +e.target.value; save(); renderTop(); });
  }
  const b64e = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const b64d = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch (e) { const m = $('#modal'); m.innerHTML = `<div class="modal-card"><p>Copy this code:</p><textarea readonly class="codebox">${esc(text)}</textarea><div class="row end"><button class="btn primary" data-r="0">Done</button></div></div>`; m.hidden = false; m.onclick = ev => { if (ev.target.closest('[data-r]')) { m.hidden = true; m.onclick = null; } }; m.querySelector('textarea').select(); }
  }

  /* ───────── events ───────── */
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === 'A') e.preventDefault();
    switch (act) {
      case 'pick': return pick(el.dataset.id);
      case 'switch': if (window.TQ_Arena) window.TQ_Arena.pause(); S = null; P = null; $('#overlay').hidden = true; history.replaceState(null, '', location.pathname + location.search); return renderPicker();
      case 'go': return go(el.dataset.v);
      case 'open-lesson': if (!LBYID[el.dataset.id] || !unlocked(LBYID[el.dataset.id])) return toast('🔒 Finish the earlier lessons first'); return openLesson(el.dataset.id);
      case 'start-review': return openReview();
      case 'sel': return selOpt(el.dataset.i);
      case 'check': return check();
      case 'next': return next();
      case 'done': return closePlayer();
      case 'quit': if (P && P.pos > 0 && !(await confirmBox('Quit this lesson? Progress in this lesson will be lost.', 'Quit'))) return; return closePlayer();
      case 'ask': return askCoach(el.dataset.q);
      case 'ask-news': go('coach'); return askCoach('Explain this news for a trader: ' + el.dataset.t);
      case 'clear-chat': S.chat = []; save(); return renderCoach($('#main'));
      case 'nf': newsFilter = el.dataset.f; return renderNews($('#main'));
      case 'copy-share': return copy('MTB1.' + b64e(profileSummary(S)), '📋 Share code copied! Send it to your friend.');
      case 'add-friend': {
        try { const v = $('#friendcode').value.trim(); const f = b64d(v.replace(/^MTB1\./, '')); if (!f.name || typeof f.xp !== 'number') throw 0; if (f.name === S.name) return toast('That\'s your own code 😄'); S.friends[f.name] = f; save(); toast(`✅ ${f.name} added to the leaderboard`); renderProgress($('#main')); }
        catch (err) { toast('That code doesn\'t look right.'); } return;
      }
      case 'backup': return copy('MTBK.' + b64e(S), '💾 Backup code copied. Keep it somewhere safe.');
      case 'restore': {
        const box = $('#restorebox'); if (box.hidden) { box.hidden = false; box.focus(); return; }
        try { const st = b64d(box.value.replace(/^MTBK\./, '')); if (st.id !== S.id) { if (!(await confirmBox(`This backup belongs to "${st.name}". Load it into ${S.name}'s profile anyway?`, 'Load'))) return; st.id = S.id; } S = Object.assign(fresh(CFG.profiles.find(p => p.id === S.id)), st); save(); toast('✅ Progress restored'); render(); }
        catch (err) { toast('Backup code is invalid.'); } return;
      }
      case 'reset': if (await confirmBox(`Erase ALL of ${S.name}'s progress (lessons, grades, Arena, XP)? This can't be undone.`, 'Erase')) { const p = CFG.profiles.find(x => x.id === S.id); S = fresh(p); S.onboarded = false; save(); renderOnboarding(); } return;
    }
  });
  document.addEventListener('keydown', e => {
    if (!P || $('#overlay').hidden) return;
    if (e.key === 'Enter' && document.activeElement && document.activeElement.id !== 'numans') { const b = $('#pbtn'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
    if (/^[1-4]$/.test(e.key) && !P.checked) { const opts = document.querySelectorAll('.opt'); const o = opts[+e.key - 1]; if (o) selOpt(o.dataset.i); }
  });
  window.addEventListener('resize', () => { if (view === 'arena' && window.TQ_Arena) window.TQ_Arena.redraw(); });

  /* ───────── public API for arena.js ───────── */
  window.TQ_App = { get S() { return S; }, save, addXP, toast, confirmBox, esc, fmt$, fmtR, md, checkBadges, arenaStats, go, askCoach: (q) => { go('coach'); askCoach(q); } };

  document.title = CFG.appName;
  // Always ask "who's learning?" when the app opens; the chosen learner's saved progress is loaded.
  history.replaceState(null, '', location.pathname + location.search);
  renderPicker();
})();
