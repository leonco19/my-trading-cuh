/* My Trading Cuh – Arena: a replay simulator for realistic 5-minute trading days (virtual money). */
(function () {
  'use strict';
  const A = () => window.TQ_App;
  const CH = window.TQ_Charts;
  const CFG = window.TQ_CONFIG.arena;
  const SPEEDS = { 1: 1100, 2: 550, 4: 250 };
  const SETUPS = ['ORB', 'VWAP pullback', 'Breakout', 'Reversal', 'Trend continuation', 'No setup (impulse)'];
  const EMOTIONS = ['😌 Calm', '😱 FOMO', '😨 Fear', '😡 Revenge', '😎 Overconfident', '🥱 Bored'];
  const commission = sh => Math.max(1, sh * 0.005); // per side, typical low-cost broker

  let G = null;     // current day session
  let timer = null;
  let el = null;    // container
  let map = null;   // chart coordinate mapping
  let hoverY = null;

  const r2 = x => Math.round(x * 100) / 100;

  function newDay() {
    const S = A().S;
    S.arena.seed = (S.arena.seed || 1) + 1; A().save();
    const day = CH.genDay(S.arena.seed * 7919 % 2147483647);
    G = { day, i: 0, phase: 'brief', playing: false, speed: 1, pos: null, trades: [], ticket: { dir: 1, stop: '', target: '', risk: 1 }, pick: null, ema: false, inPlayAnswered: null, notes: [] };
    draw();
  }

  function stats() { return A().arenaStats(); }
  function dayR() { return G.trades.reduce((s, t) => s + t.r, 0) + (G.pos ? 0 : 0); }
  function lockedReason() {
    if (dayR() <= -CFG.maxDailyLossR) return `Daily max loss hit (${CFG.maxDailyLossR}R). You're done for today, like a pro.`;
    if (G.trades.length >= CFG.maxTradesPerDay) return `Max ${CFG.maxTradesPerDay} trades per day reached.`;
    if (G.i >= G.day.candles.length - 1) return 'Market closed.';
    return '';
  }

  /* ───────── order logic ───────── */
  function ticketCalc() {
    const t = G.ticket; const c = G.day.candles[G.i];
    const entry = r2(c.c * (1 + t.dir * CFG.slippagePct));
    const stop = parseFloat(t.stop); const target = t.target === '' ? null : parseFloat(t.target);
    const S = A().S; const riskUsd = S.arena.balance * t.risk / 100;
    let err = '';
    if (isNaN(stop)) err = 'Set a stop-loss first (type it, or click 🎯 then click the chart).';
    else if (t.dir > 0 && stop >= entry) err = 'For a LONG, the stop must be BELOW the entry price.';
    else if (t.dir < 0 && stop <= entry) err = 'For a SHORT, the stop must be ABOVE the entry price.';
    else if (target != null && !isNaN(target) && ((t.dir > 0 && target <= entry) || (t.dir < 0 && target >= entry))) err = 'Target must be on the profit side of the entry.';
    const per = isNaN(stop) ? 0 : Math.abs(entry - stop);
    const shares = per ? Math.floor(riskUsd / per) : 0;
    if (!err && shares < 1) err = 'Stop too wide for this risk: less than 1 share.';
    if (!err && shares * entry > S.arena.balance * 4) err = 'Position would need more than 4× buying power. Use a tighter stop or lower risk.';
    const rr = target != null && !isNaN(target) && per ? Math.abs(target - entry) / per : null;
    return { entry, stop, target: isNaN(target) ? null : target, riskUsd, per, shares, err, rr };
  }

  function enter() {
    const why = lockedReason(); if (why) return A().toast(why);
    const k = ticketCalc(); if (k.err) return A().toast(k.err);
    const breaks = [];
    if (G.ticket.risk > 1) breaks.push(`Risked ${G.ticket.risk}% (rule: ≤1%)`);
    G.pos = { dir: G.ticket.dir, entry: k.entry, stop: k.stop, stop0: k.stop, target: k.target, shares: k.shares, riskUsd: k.per * k.shares, entryBar: G.i, breaks, riskPct: G.ticket.risk };
    G.ticket.stop = ''; G.ticket.target = '';
    A().toast(`${G.pos.dir > 0 ? '🟢 Long' : '🔴 Short'} ${k.shares} ${G.day.ticker} @ ${k.entry.toFixed(2)}`);
    draw();
  }

  function closePos(price, bar, reason) {
    const p = G.pos; if (!p) return;
    const gross = (price - p.entry) * p.dir * p.shares;
    const fees = commission(p.shares) * 2;
    const net = gross - fees;
    const r = net / p.riskUsd;
    const trade = { at: Date.now(), ticker: G.day.ticker, dayType: G.day.regimeName, dir: p.dir, entry: p.entry, exit: r2(price), stop: p.stop0, target: p.target, shares: p.shares, entryBar: p.entryBar, exitBar: bar, pnl: r2(net), fees: r2(fees), r: Math.round(r * 100) / 100, reason, breaks: p.breaks, riskPct: p.riskPct, setup: '', emotion: '', followed: null };
    G.trades.push(trade); G.pos = null;
    const S = A().S; S.arena.balance = r2(S.arena.balance + net);
    S.arena.trades.push(trade); S.arena.trades = S.arena.trades.slice(-300); A().save(); A().checkBadges();
    A().toast(`${reason}: ${A().fmtR(trade.r)} (${A().fmt$(net)})`, trade.r >= 0 ? 'xp' : 'loss');
    if (dayR() <= -CFG.maxDailyLossR) { pause(); A().toast('🛑 Daily max loss reached. Trading locked for today.', 'loss'); }
  }

  function stepBar() {
    if (G.i >= G.day.candles.length - 1) return endDay();
    G.i++;
    const c = G.day.candles[G.i]; const p = G.pos;
    if (p) {
      const slip = c.c * CFG.slippagePct;
      if (p.dir > 0) {
        if (c.o <= p.stop) closePos(c.o - slip, G.i, 'Stopped out (gapped through stop)');
        else if (c.l <= p.stop) closePos(p.stop - slip, G.i, p.stop >= p.entry ? 'Stopped at breakeven/profit' : 'Stopped out');
        else if (p.target != null && c.o >= p.target) closePos(c.o, G.i, '🎯 Target hit');
        else if (p.target != null && c.h >= p.target) closePos(p.target, G.i, '🎯 Target hit');
      } else {
        if (c.o >= p.stop) closePos(c.o + slip, G.i, 'Stopped out (gapped through stop)');
        else if (c.h >= p.stop) closePos(p.stop + slip, G.i, p.stop <= p.entry ? 'Stopped at breakeven/profit' : 'Stopped out');
        else if (p.target != null && c.o <= p.target) closePos(c.o, G.i, '🎯 Target hit');
        else if (p.target != null && c.l <= p.target) closePos(p.target, G.i, '🎯 Target hit');
      }
    }
    if (G.i >= G.day.candles.length - 1) { if (G.pos) closePos(G.day.candles[G.i].c, G.i, 'Closed at the bell'); endDay(); return; }
    draw();
  }

  function moveStop(v) {
    const p = G.pos; if (!p) return;
    const nv = r2(parseFloat(v)); if (isNaN(nv)) return;
    const c = G.day.candles[G.i];
    if ((p.dir > 0 && nv < p.stop) || (p.dir < 0 && nv > p.stop)) return A().toast('🚫 Golden rule: you can only TIGHTEN a stop, never widen it.');
    if ((p.dir > 0 && nv >= c.c) || (p.dir < 0 && nv <= c.c)) return A().toast('That stop is past the current price. Use "Exit now" instead.');
    p.stop = nv; A().toast(`Stop moved to ${nv.toFixed(2)}`); draw();
  }

  function play() { if (G.phase !== 'live') return; G.playing = true; clearInterval(timer); timer = setInterval(stepBar, SPEEDS[G.speed]); draw(); }
  function pause() { clearInterval(timer); timer = null; if (G) { G.playing = false; if (el && G.phase === 'live') draw(); } }

  function endDay() {
    pause();
    if (G.phase === 'summary') return;
    if (G.pos) closePos(G.day.candles[G.i].c, G.i, 'Closed at the bell');
    G.phase = 'summary';
    const S = A().S; S.arena.days++; S.arena.equity.push(S.arena.balance); S.arena.equity = S.arena.equity.slice(-200); A().save();
    draw();
  }

  function saveJournal() {
    const S = A().S;
    G.trades.forEach((t, k) => {
      t.setup = (document.querySelector(`[name=setup${k}]`) || {}).value || '';
      t.emotion = (document.querySelector(`[name=emo${k}]`) || {}).value || '';
      const f = document.querySelector(`[name=fol${k}]:checked`); t.followed = f ? f.value === 'y' : null;
      const st = S.arena.trades.find(x => x.at === t.at); if (st) Object.assign(st, { setup: t.setup, emotion: t.emotion, followed: t.followed });
    });
    const journaled = G.trades.filter(t => t.setup && t.emotion && t.followed != null).length;
    const clean = G.trades.length > 0 && G.trades.every(t => !t.breaks.length && t.followed) && journaled === G.trades.length;
    let xp = 10 + journaled * 4;
    if (clean) { xp += 10; S.badges._discDay = Date.now(); }
    if (!G.trades.length && G.day.regime === 'range') xp += 5;
    G.phase = 'done'; A().save(); A().addXP(xp, clean ? 'Disciplined day 🧘' : 'Trading day');
    draw();
  }

  /* ───────── rendering ───────── */
  function render(container) { el = container; if (!G || G.phase === 'done') renderHome(); else draw(); }
  function draw() {
    if (!el || !document.body.contains(el)) return;
    if (!G || G.phase === 'done') return renderHome();
    if (G.phase === 'brief') return renderBrief();
    if (G.phase === 'summary') return renderSummary();
    renderLive();
  }

  function renderHome() {
    const S = A().S, st = stats(), esc = A().esc;
    const tr = S.arena.trades;
    const group = key => { const g = {}; tr.filter(t => t[key]).forEach(t => { (g[t[key]] = g[t[key]] || []).push(t.r); }); return Object.entries(g).map(([k, rs]) => ({ k, n: rs.length, exp: rs.reduce((a, b) => a + b, 0) / rs.length, win: Math.round(rs.filter(x => x > 0).length / rs.length * 100) })).sort((a, b) => b.exp - a.exp); };
    const bySetup = group('setup'), byEmo = group('emotion');
    const pnl = S.arena.balance - S.arena.start;
    el.innerHTML = `<div class="page arena-home"><h1>🕹️ Arena</h1>
      <p class="muted">Trade realistic, randomly generated US-market days (5-minute candles, 16:30–23:00 Israel time) with virtual money. You get scored on <b>process</b>: XP comes from discipline and journaling, not from luck.</p>
      <div class="stat-grid">
        <div class="stat"><b>${A().fmt$(S.arena.balance)}</b><span>Virtual account <i class="${pnl >= 0 ? 'good' : 'bad'}">${pnl >= 0 ? '+' : ''}${A().fmt$(pnl)}</i></span></div>
        <div class="stat"><b>${st.trades}</b><span>Trades · ${S.arena.days} days</span></div>
        <div class="stat"><b>${st.winRate}%</b><span>Win rate</span></div>
        <div class="stat"><b>${A().fmtR(st.avgW)} / ${A().fmtR(st.avgL)}</b><span>Avg win / avg loss</span></div>
        <div class="stat"><b class="${st.expectancy >= 0 ? 'good' : 'bad'}">${A().fmtR(st.expectancy)}</b><span>Expectancy per trade</span></div>
        <div class="stat"><b>${A().fmtR(st.totalR)}</b><span>Total R</span></div></div>
      ${st.trades < 100 ? `<div class="banner">📊 Sample size: <b>${st.trades}/100</b> trades. Your stats become meaningful around 100 trades. <div class="bar"><div style="width:${Math.min(100, st.trades)}%"></div></div></div>` : '<div class="banner good">✅ 100+ trades logged. Your stats now mean something!</div>'}
      <div class="row center"><button class="btn primary big" data-arena="new">▶ Start a new trading day</button></div>
      <h2>📈 Equity curve</h2><canvas id="equity" class="equity"></canvas>
      <div class="two-col"><div><h2>🧪 Expectancy by setup</h2>${bySetup.length ? `<table class="tbl"><tr><th>Setup</th><th>Trades</th><th>Win%</th><th>Exp.</th></tr>${bySetup.map(x => `<tr><td>${esc(x.k)}</td><td>${x.n}</td><td>${x.win}%</td><td class="${x.exp >= 0 ? 'good' : 'bad'}">${A().fmtR(x.exp)}</td></tr>`).join('')}</table>` : '<p class="muted">Journal your trades to see which setups work for you.</p>'}</div>
      <div><h2>🧠 Expectancy by emotion</h2>${byEmo.length ? `<table class="tbl"><tr><th>Emotion</th><th>Trades</th><th>Exp.</th></tr>${byEmo.map(x => `<tr><td>${esc(x.k)}</td><td>${x.n}</td><td class="${x.exp >= 0 ? 'good' : 'bad'}">${A().fmtR(x.exp)}</td></tr>`).join('')}</table>` : '<p class="muted">Tag emotions in your journal to discover your patterns.</p>'}</div></div>
      <h2>📓 Recent trades</h2>${tr.length ? `<table class="tbl"><tr><th>Date</th><th>Ticker</th><th>Side</th><th>Entry→Exit</th><th>R</th><th>Setup</th><th>Rules</th></tr>${tr.slice(-12).reverse().map(t => `<tr><td>${new Date(t.at).toLocaleDateString('en-GB')}</td><td>${esc(t.ticker)}</td><td>${t.dir > 0 ? 'Long' : 'Short'}</td><td>${t.entry.toFixed(2)}→${t.exit.toFixed(2)}</td><td class="${t.r >= 0 ? 'good' : 'bad'}">${A().fmtR(t.r)}</td><td>${esc(t.setup || '–')}</td><td>${t.breaks.length || t.followed === false ? '⚠️' : '✅'}</td></tr>`).join('')}</table>` : '<p class="muted">No trades yet.</p>'}
      ${tr.length >= 3 ? '<div class="row center"><button class="btn ghost" data-arena="coach-review">🤖 Ask coach to review my trading</button></div>' : ''}</div>`;
    requestAnimationFrame(() => drawEquity($('#equity'), S.arena.equity));
  }
  const $ = s => document.querySelector(s);

  function drawEquity(cv, eq) {
    if (!cv) return; const dpr = devicePixelRatio || 1; const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (eq.length < 2) { ctx.fillStyle = '#8b93b8'; ctx.font = '13px Nunito'; ctx.fillText('Finish a trading day to start your equity curve.', 12, H / 2); return; }
    const hi = Math.max(...eq), lo = Math.min(...eq), pad = (hi - lo) * 0.1 || 100;
    const x = i => 10 + i / (eq.length - 1) * (W - 20), y = v => 10 + (hi + pad - v) / (hi - lo + 2 * pad) * (H - 20);
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, y(eq[0])); ctx.lineTo(W, y(eq[0])); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = eq[eq.length - 1] >= eq[0] ? '#00d68f' : '#ff4d6d'; ctx.lineWidth = 2.5; ctx.beginPath(); eq.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))); ctx.stroke();
  }

  function renderBrief() {
    const d = G.day, esc = A().esc;
    const inPlay = d.rvol >= 2 && Math.abs(d.gapPct) >= 3;
    el.innerHTML = `<div class="page arena-brief"><h1>☀️ Pre-market brief</h1>
      <div class="brief-card"><div class="ticker">${esc(d.ticker)}</div>
        <div class="brief-grid"><div><span>Prev. close</span><b>${d.prevClose.toFixed(2)}</b></div><div><span>Open</span><b>${d.open.toFixed(2)}</b></div>
        <div><span>Gap</span><b class="${d.gapPct >= 0 ? 'good' : 'bad'}">${d.gapPct > 0 ? '+' : ''}${d.gapPct}%</b></div><div><span>Relative volume</span><b>${d.rvol}×</b></div>
        <div><span>Prev. day high</span><b>${d.pdh.toFixed(2)}</b></div><div><span>Prev. day low</span><b>${d.pdl.toFixed(2)}</b></div><div><span>Daily ATR</span><b>${d.atr.toFixed(2)}</b></div><div><span>Catalyst</span><b class="small">${esc(d.catalyst)}</b></div></div></div>
      <h2>Quick check: is ${esc(d.ticker)} a "Stock in Play" today?</h2>
      ${G.inPlayAnswered == null ? `<div class="row center"><button class="btn ghost big" data-arena="inplay" data-v="1">Yes, in play 🔥</button><button class="btn ghost big" data-arena="inplay" data-v="0">No, not really 😴</button></div>`
        : `<div class="banner ${G.inPlayAnswered === inPlay ? 'good' : 'warn'}">${G.inPlayAnswered === inPlay ? '✅ Correct!' : '❌ Not quite.'} ${inPlay ? `Gap of ${d.gapPct}% with a catalyst and ${d.rvol}× relative volume = in play. Opening-range setups are worth watching.` : `Small gap and/or low relative volume (${d.rvol}×). Moves may be random and choppy, so be picky or sit out.`}</div>
        <div class="rules-box"><b>Today's rules</b><ul><li>Every trade needs a stop-loss</li><li>Risk ≤ 1% per trade (${A().fmt$(A().S.arena.balance * 0.01)})</li><li>Max ${CFG.maxTradesPerDay} trades · daily max loss −${CFG.maxDailyLossR}R</li><li>Stops can be tightened, never widened</li></ul></div>
        <div class="row center"><button class="btn primary big" data-arena="start">🔔 Ring the opening bell</button></div>`}
      <div class="row center"><button class="btn ghost sm" data-arena="home">← Back</button></div></div>`;
  }

  function renderLive() {
    const d = G.day, c = d.candles[G.i], esc = A().esc, p = G.pos, S = A().S;
    const t = CH.barTime(G.i);
    const lock = lockedReason();
    const k = ticketCalc();
    let unreal = 0, unrealR = 0;
    if (p) { unreal = (c.c - p.entry) * p.dir * p.shares; unrealR = unreal / p.riskUsd; }
    const chg = (c.c - d.prevClose) / d.prevClose * 100;
    el.innerHTML = `<div class="arena">
      <div class="arena-top"><div><b class="ticker sm">${esc(d.ticker)}</b> <span class="px">${c.c.toFixed(2)}</span> <span class="${chg >= 0 ? 'good' : 'bad'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span></div>
        <div class="muted small">🇮🇱 ${t.il} · 🇺🇸 ${t.et} ET · bar ${G.i + 1}/${d.candles.length} · VWAP ${c.vwap.toFixed(2)}</div>
        <div class="dayr ${dayR() >= 0 ? 'good' : 'bad'}">Day: ${A().fmtR(dayR())}</div></div>
      <div class="chart-wrap"><canvas id="arenaChart" class="arena-chart ${G.pick ? 'picking' : ''}"></canvas>${G.pick ? `<div class="pick-hint">Click the chart to set your ${G.pick.toUpperCase()}</div>` : ''}</div>
      <div class="controls">
        <button class="btn ${G.playing ? 'ghost' : 'primary'}" data-arena="${G.playing ? 'pause' : 'play'}">${G.playing ? '⏸ Pause' : '▶ Play'}</button>
        <button class="btn ghost" data-arena="step" title="Next candle (→)">⏭ Next bar</button>
        <div class="speed">${[1, 2, 4].map(s => `<button class="chip-btn ${G.speed === s ? 'on' : ''}" data-arena="speed" data-v="${s}">${s}×</button>`).join('')}</div>
        <label class="small"><input type="checkbox" data-arena="ema" ${G.ema ? 'checked' : ''}> 9/20 EMA</label>
        <span class="legend small"><i style="background:#ffb627"></i>VWAP <i style="background:#ff8a3d"></i>Levels</span>
        <button class="btn ghost sm" data-arena="end">Finish day ⏩</button></div>
      <div class="panels">
      ${p ? `<div class="panel pos"><h3>${p.dir > 0 ? '🟢 LONG' : '🔴 SHORT'} ${p.shares} sh @ ${p.entry.toFixed(2)}</h3>
          <div class="pnl ${unreal >= 0 ? 'good' : 'bad'}">${A().fmt$(unreal)} · ${A().fmtR(unrealR)}</div>
          <div class="small muted">Stop ${p.stop.toFixed(2)} · Target ${p.target != null ? p.target.toFixed(2) : '–'} · Risk ${A().fmt$(p.riskUsd)}</div>
          <div class="row"><input id="newstop" type="number" step="0.01" placeholder="New stop" value="${p.stop.toFixed(2)}"><button class="btn ghost sm" data-arena="movestop">Tighten stop</button><button class="btn ghost sm" data-arena="be">Stop → breakeven</button></div>
          <button class="btn danger" data-arena="exit">Exit now @ market</button></div>`
        : `<div class="panel ticket"><h3>📝 Order ticket</h3>${lock ? `<div class="banner warn">${esc(lock)}</div>` : ''}
          <div class="seg"><button class="${G.ticket.dir > 0 ? 'on long' : ''}" data-arena="dir" data-v="1">Long ▲</button><button class="${G.ticket.dir < 0 ? 'on short' : ''}" data-arena="dir" data-v="-1">Short ▼</button></div>
          <div class="frow"><label>Stop-loss <span class="req">required</span><input id="t-stop" type="number" step="0.01" value="${esc(G.ticket.stop)}" placeholder="${(c.c - G.ticket.dir * d.atr * 0.1).toFixed(2)}"></label><button class="btn ghost sm" data-arena="pick" data-v="stop" title="Pick on chart">🎯</button></div>
          <div class="frow"><label>Target <span class="muted">optional</span><input id="t-target" type="number" step="0.01" value="${esc(G.ticket.target)}"></label><button class="btn ghost sm" data-arena="pick" data-v="target" title="Pick on chart">🎯</button></div>
          <div class="frow"><label>Risk % of account<select id="t-risk">${[0.25, 0.5, 1, 1.5, 2].map(r => `<option ${r === G.ticket.risk ? 'selected' : ''} value="${r}">${r}%${r > 1 ? ' ⚠️' : ''}</option>`).join('')}</select></label></div>
          <div class="calc">${k.err ? `<span class="muted small">${esc(k.err)}</span>` : `Entry ≈ <b>${k.entry.toFixed(2)}</b> · <b>${k.shares}</b> shares · risk <b>${A().fmt$(k.per * k.shares)}</b>${k.rr ? ` · R:R <b>${k.rr.toFixed(1)}</b>` : ''}`}</div>
          <button class="btn primary big ${G.ticket.dir > 0 ? '' : 'short-btn'}" data-arena="enter" ${k.err || lock ? 'disabled' : ''}>${G.ticket.dir > 0 ? 'BUY' : 'SELL SHORT'} ${k.err ? '' : k.shares}</button></div>`}
        <div class="panel info"><h3>ℹ️ ${esc(d.ticker)} today</h3><div class="small">Gap ${d.gapPct > 0 ? '+' : ''}${d.gapPct}% · RVOL ${d.rvol}× · ATR ${d.atr.toFixed(2)}<br>${esc(d.catalyst)}</div>
          <div class="small muted" style="margin-top:6px">Opening range (first bar): ${d.candles[0].l.toFixed(2)} – ${d.candles[0].h.toFixed(2)}</div>
          <div class="small">Balance: <b>${A().fmt$(S.arena.balance)}</b> · Trades today: ${G.trades.length}/${CFG.maxTradesPerDay}</div>
          ${G.trades.length ? `<div class="small">${G.trades.map(tt => `<span class="${tt.r >= 0 ? 'good' : 'bad'}">${A().fmtR(tt.r)}</span>`).join(' · ')}</div>` : ''}
          <div class="small muted" style="margin-top:6px">⌨️ Space = play/pause · → = next bar</div></div>
      </div></div>`;
    // inputs keep ticket state without re-rendering on every keystroke
    const bind = (id, key, num) => { const n = document.getElementById(id); if (n) n.addEventListener('input', () => { G.ticket[key] = num ? +n.value : n.value; refreshCalc(); }); };
    bind('t-stop', 'stop'); bind('t-target', 'target'); bind('t-risk', 'risk', true);
    redraw();
    const cv = document.getElementById('arenaChart');
    cv.addEventListener('mousemove', e => { hoverY = e.offsetY; redraw(); });
    cv.addEventListener('mouseleave', () => { hoverY = null; redraw(); });
    cv.addEventListener('click', e => {
      if (!G.pick || !map) return;
      const price = r2(map.yToPrice(e.offsetY));
      if (G.pick === 'newstop') { G.pick = null; moveStop(price); return; }
      G.ticket[G.pick] = price.toFixed(2); G.pick = null; draw();
    });
  }
  function refreshCalc() {
    // re-render only the ticket calc + button
    const k = ticketCalc(); const lock = lockedReason();
    const calc = el.querySelector('.calc'); const btn = el.querySelector('[data-arena=enter]');
    if (calc) calc.innerHTML = k.err ? `<span class="muted small">${A().esc(k.err)}</span>` : `Entry ≈ <b>${k.entry.toFixed(2)}</b> · <b>${k.shares}</b> shares · risk <b>${A().fmt$(k.per * k.shares)}</b>${k.rr ? ` · R:R <b>${k.rr.toFixed(1)}</b>` : ''}`;
    if (btn) { btn.disabled = !!(k.err || lock); btn.textContent = `${G.ticket.dir > 0 ? 'BUY' : 'SELL SHORT'} ${k.err ? '' : k.shares}`; }
    redraw();
  }
  function redraw() {
    const cv = document.getElementById('arenaChart'); if (!cv || !G) return;
    const d = G.day;
    const spec = { candles: d.candles, levels: [{ p: d.pdh, label: 'PDH', color: '#ff8a3d' }, { p: d.pdl, label: 'PDL', color: '#ff8a3d' }, { p: d.prevClose, label: 'Prev close', color: '#8b93b8' }, { p: d.candles[0].h, label: 'OR high', color: '#00d68f99' }, { p: d.candles[0].l, label: 'OR low', color: '#ff4d6d99' }] };
    const markers = [];
    if (G.pos) { markers.push({ type: 'entry', p: G.pos.entry, label: 'Entry' }, { type: 'stop', p: G.pos.stop, label: 'Stop' }); if (G.pos.target != null) markers.push({ type: 'target', p: G.pos.target, label: 'Target' }); }
    else { const s = parseFloat(G.ticket.stop), tg = parseFloat(G.ticket.target); if (!isNaN(s)) markers.push({ type: 'stop', p: s, label: 'Stop?' }); if (!isNaN(tg)) markers.push({ type: 'target', p: tg, label: 'Target?' }); }
    map = CH.draw(cv, spec, { upTo: G.i, slots: d.candles.length, timeAxis: true, ema: G.ema, markers, trades: G.trades.concat(G.pos ? [{ entryBar: G.pos.entryBar, entry: G.pos.entry, dir: G.pos.dir }] : []), hoverY, ignoreLevelsForScale: false });
  }

  function renderSummary() {
    const d = G.day, esc = A().esc;
    const total = dayR(), pnl = G.trades.reduce((s, t) => s + t.pnl, 0);
    el.innerHTML = `<div class="page arena-sum"><h1>🔔 Market closed</h1>
      <div class="reveal"><div class="muted small">Today's day type was…</div><h2>${esc(d.regimeName)}</h2><p>${esc(d.regimeLesson)}</p></div>
      <canvas id="sumChart" class="arena-chart small-chart"></canvas>
      <div class="stat-grid"><div class="stat"><b class="${total >= 0 ? 'good' : 'bad'}">${A().fmtR(total)}</b><span>Day result</span></div><div class="stat"><b class="${pnl >= 0 ? 'good' : 'bad'}">${A().fmt$(pnl)}</b><span>P&L after fees</span></div><div class="stat"><b>${G.trades.length}</b><span>Trades</span></div></div>
      ${G.trades.length ? `<h2>📓 Journal your trades</h2><p class="muted">Honest journaling = XP. Your answers build your personal "what works for me" stats.</p>
        ${G.trades.map((t, k) => `<div class="jcard"><div class="jhead"><b>#${k + 1} ${t.dir > 0 ? 'Long' : 'Short'} ${t.shares} @ ${t.entry.toFixed(2)} → ${t.exit.toFixed(2)}</b><span class="${t.r >= 0 ? 'good' : 'bad'}">${A().fmtR(t.r)} (${A().fmt$(t.pnl)})</span></div>
          <div class="small muted">${esc(t.reason)} · fees ${A().fmt$(t.fees)}${t.breaks.length ? ` · <span class="bad">⚠️ ${esc(t.breaks.join(', '))}</span>` : ''}</div>
          <div class="jrow"><label>Setup<select name="setup${k}"><option value="">Choose…</option>${SETUPS.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
          <label>Emotion at entry<select name="emo${k}"><option value="">Choose…</option>${EMOTIONS.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
          <span>Followed my plan? <label><input type="radio" name="fol${k}" value="y"> Yes</label> <label><input type="radio" name="fol${k}" value="n"> No</label></span></div></div>`).join('')}`
        : `<div class="banner">${d.regime === 'range' ? '🧘 No trades on a chop day: that\'s a pro move. +5 bonus XP.' : 'No trades today. Sitting out is a valid decision, but make sure it was by choice and not fear.'}</div>`}
      <div class="row center"><button class="btn primary big" data-arena="journal">Save & collect XP</button></div></div>`;
    requestAnimationFrame(() => { const cv = document.getElementById('sumChart'); if (cv) CH.draw(cv, { candles: d.candles, levels: [{ p: d.candles[0].h, label: 'OR high', color: '#00d68f99' }, { p: d.candles[0].l, label: 'OR low', color: '#ff4d6d99' }] }, { timeAxis: true, trades: G.trades }); });
  }

  /* ───────── events ───────── */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-arena]'); if (!b) return;
    const a = b.dataset.arena;
    switch (a) {
      case 'new': return newDay();
      case 'home': G = null; return renderHome();
      case 'inplay': G.inPlayAnswered = b.dataset.v === '1'; { const d = G.day; if (G.inPlayAnswered === (d.rvol >= 2 && Math.abs(d.gapPct) >= 3)) A().addXP(2, 'Good scan'); } return draw();
      case 'start': G.phase = 'live'; return draw();
      case 'play': return play();
      case 'pause': return pause();
      case 'step': return stepBar();
      case 'speed': G.speed = +b.dataset.v; if (G.playing) play(); else draw(); return;
      case 'ema': G.ema = b.checked; return redraw();
      case 'dir': G.ticket.dir = +b.dataset.v; return draw();
      case 'pick': G.pick = G.pick === b.dataset.v ? null : b.dataset.v; pause(); return draw();
      case 'enter': return enter();
      case 'exit': { const c = G.day.candles[G.i]; closePos(c.c - G.pos.dir * c.c * CFG.slippagePct, G.i, 'Manual exit'); return draw(); }
      case 'movestop': return moveStop(document.getElementById('newstop').value);
      case 'be': return moveStop(G.pos.entry);
      case 'end': if (await A().confirmBox('Fast-forward to the close? Any open position will be closed at the last price, and stops/targets are still checked bar by bar.', 'Finish day')) { pause(); while (G.phase === 'live') stepBar(); } return;
      case 'journal': return saveJournal();
      case 'coach-review': {
        const st = stats(); const tr = A().S.arena.trades.slice(-20);
        const bySetup = {}; tr.forEach(t => { if (t.setup) (bySetup[t.setup] = bySetup[t.setup] || []).push(t.r); });
        const q = `Review my Arena trading. Last ${tr.length} trades: win rate ${st.winRate}%, avg win ${st.avgW.toFixed(2)}R, avg loss ${st.avgL.toFixed(2)}R, expectancy ${st.expectancy.toFixed(2)}R. ` +
          `Rule breaks: ${tr.filter(t => t.breaks.length || t.followed === false).length}. By setup: ${Object.entries(bySetup).map(([k, v]) => `${k} ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(2)}R (${v.length})`).join(', ') || 'not journaled'}. What should I work on?`;
        return A().askCoach(q);
      }
    }
  });
  document.addEventListener('keydown', e => {
    if (!G || G.phase !== 'live' || location.hash !== '#arena') return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); G.playing ? pause() : play(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepBar(); }
  });

  window.TQ_Arena = { render, pause: () => { if (G && G.playing) pause(); }, redraw: () => { if (G && G.phase === 'live') redraw(); } };
})();
