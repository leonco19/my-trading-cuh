/* My Trading Cuh – chart engine: seeded market generator + canvas candlestick renderer */
(function () {
  'use strict';

  /* ---------- seeded RNG ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return r;
  }

  const round2 = x => Math.round(x * 100) / 100;

  function addVwap(candles) {
    let pv = 0, v = 0;
    for (const c of candles) { const tp = (c.h + c.l + c.c) / 3; pv += tp * c.v; v += c.v; c.vwap = pv / v; }
    return candles;
  }

  function ema(values, n) {
    const k = 2 / (n + 1); const out = []; let prev = values[0];
    for (let i = 0; i < values.length; i++) { prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k); out.push(prev); }
    return out;
  }

  /* Build candles that follow a path of waypoints [[barIndex, price], ...].
   * A price of 'V' snaps that waypoint to the running VWAP when it is reached. */
  function fromPath(points, opts) {
    const o = Object.assign({ seed: 1, noise: 0.0016, wick: 0.0012, vol: 100000, uShape: true, n: points[points.length - 1][0] + 1 }, opts);
    const r = rng(o.seed);
    const candles = [];
    let prevClose = typeof points[0][1] === 'number' ? points[0][1] : 100;
    let pv = 0, vv = 0;
    let seg = 0;
    const pts = points.map(p => p.slice());
    for (let i = 0; i < o.n; i++) {
      while (seg < pts.length - 2 && i > pts[seg + 1][0]) seg++;
      let [i0, p0] = pts[seg]; let [i1, p1] = pts[seg + 1];
      if (p1 === 'V') { p1 = vv ? pv / vv : prevClose; pts[seg + 1][1] = p1; }
      if (p0 === 'V') { p0 = vv ? pv / vv : prevClose; pts[seg][1] = p0; }
      const t = i1 === i0 ? 1 : Math.min(1, Math.max(0, (i - i0) / (i1 - i0)));
      const target = p0 + (p1 - p0) * t;
      const timeVol = o.uShape ? (1.6 - Math.sin(Math.PI * i / Math.max(1, o.n - 1)) * 0.9) : 1;
      const open = i === 0 ? prevClose : prevClose + r.gauss() * prevClose * o.noise * 0.15;
      const close = target + r.gauss() * target * o.noise * timeVol;
      const hi = Math.max(open, close) + Math.abs(r.gauss()) * target * o.wick * timeVol;
      const lo = Math.min(open, close) - Math.abs(r.gauss()) * target * o.wick * timeVol;
      const v = Math.round(o.vol * timeVol * (0.6 + r() * 0.8) * (1 + Math.abs(close - open) / target * 150));
      const c = { o: round2(open), h: round2(hi), l: round2(lo), c: round2(close), v };
      candles.push(c);
      pv += ((c.h + c.l + c.c) / 3) * v; vv += v;
      prevClose = c.c;
    }
    return addVwap(candles);
  }

  /* ---------- lesson patterns ---------- */
  const C = (o, h, l, c, v) => ({ o, h, l, c, v: v || 1000 });
  const PATTERNS = {
    anatomy: () => ({ candles: [C(100, 104, 98.5, 103), C(103, 103.8, 99, 100)], anatomy: true, noVol: true }),
    hammer: () => ({ candles: [C(110, 110.4, 108.6, 108.9), C(108.9, 109.2, 107.4, 107.6), C(107.6, 107.9, 106.1, 106.3), C(106.3, 106.6, 105, 105.2), C(105.2, 105.4, 103.9, 104.1), C(104.1, 104.6, 101.2, 104.4)], highlight: 5, noVol: true }),
    engulf: () => ({ candles: [C(110, 110.3, 108.7, 108.9), C(108.9, 109.1, 107.5, 107.7), C(107.7, 107.9, 106.4, 106.6), C(106.6, 106.8, 105.6, 105.8), C(105.8, 107.9, 105.4, 107.6)], highlight: 4, noVol: true }),
    patterns: () => ({ candles: [C(105, 105.3, 103.6, 103.8), C(103.8, 104.1, 100.8, 103.9), C(103.9, 104.9, 103.6, 104.6), C(104.6, 104.8, 103.2, 103.4), C(103.4, 106.2, 103.1, 105.9), C(105.9, 106.8, 105, 105.95)], labels: { 1: 'Hammer', 4: 'Engulfing', 5: 'Doji' }, noVol: true }),
    uptrend: s => ({ candles: fromPath([[0, 100], [8, 103], [13, 101.6], [22, 105], [27, 103.7], [37, 107.5], [41, 106.4], [50, 109.6]], { seed: s || 11 }), noVwap: true }),
    downtrend: s => ({ candles: fromPath([[0, 110], [8, 107], [13, 108.4], [22, 105], [27, 106.3], [37, 102.6], [41, 103.7], [50, 100.2]], { seed: s || 12 }), noVwap: true }),
    range: s => ({ candles: fromPath([[0, 100], [6, 103], [12, 100.2], [18, 102.9], [24, 100.1], [30, 103.1], [36, 100.3], [42, 102.8], [48, 101.5]], { seed: s || 13, uShape: false }), levels: [{ p: 103.1, label: 'Ceiling', color: '#ff4d6d' }, { p: 100.1, label: 'Floor', color: '#00d68f' }], noVwap: true }),
    'breakout-volume': s => {
      const cs = fromPath([[0, 100], [5, 101.8], [10, 100.4], [16, 101.9], [22, 100.6], [28, 101.8], [30, 103.6], [40, 105.5]], { seed: s || 14, uShape: false });
      cs.forEach((c, i) => { if (i === 29 || i === 30) c.v *= 5; else if (i < 29) c.v *= 0.7; });
      return { candles: cs, levels: [{ p: 102, label: 'Range high', color: '#ff8a3d' }], noVwap: true };
    },
    sr: s => ({ candles: fromPath([[0, 78], [8, 81.9], [12, 80.4], [18, 81.95], [22, 80.7], [28, 83.6], [33, 82.05], [44, 85.5]], { seed: s || 15 }), levels: [{ p: 82, label: 'Prev. day high', color: '#ff8a3d' }], noVwap: true }),
    'vwap-bounce': s => ({ candles: fromPath([[0, 100], [12, 104.2], [22, 'V'], [24, 'V'], [38, 106.5], [44, 107.2]], { seed: s || 16 }) }),
    'vwap-reject': s => ({ candles: fromPath([[0, 100], [10, 96.5], [16, 'V'], [24, 96.9], [30, 'V'], [40, 95.2], [44, 94.8]], { seed: s || 17 }) }),
    'orb-up': s => {
      const cs = fromPath([[0, 100.4], [1, 101.0], [6, 100.75], [9, 101.0], [11, 101.6], [25, 103.3], [36, 104.1]], { seed: s || 18 });
      cs[0] = { o: 100.45, h: 101.2, l: 100.4, c: 101.1, v: cs[0].v * 2 };
      addVwap(cs);
      return { candles: cs, levels: [{ p: 101.2, label: 'OR high', color: '#00d68f' }, { p: 100.4, label: 'OR low', color: '#ff4d6d' }], highlight: 0 };
    },
    'orb-fake': s => {
      const cs = fromPath([[0, 100.4], [3, 100.9], [5, 101.45], [7, 100.9], [12, 100.1], [20, 99.2], [30, 98.6]], { seed: s || 19 });
      cs[0] = { o: 100.45, h: 101.2, l: 100.4, c: 101.1, v: cs[0].v * 2 };
      addVwap(cs);
      return { candles: cs, levels: [{ p: 101.2, label: 'OR high', color: '#00d68f' }, { p: 100.4, label: 'OR low / stop', color: '#ff4d6d' }], highlight: 0 };
    },
  };

  /* ---------- Arena day generator ---------- */
  const TICKERS = ['NOVA', 'ZYPH', 'QBIT', 'HLXR', 'AURN', 'VTRA', 'KRYO', 'MNDL', 'ORBX', 'PLSM', 'SKYW', 'TRDE', 'LUMN', 'GRVT', 'CDRX', 'FLUX', 'DYNQ', 'ARCH', 'BRSK', 'ELAN'];
  const CATALYSTS = {
    up: ['Earnings beat + raised full-year guidance', 'FDA approval for lead drug', 'Announced $2B buyback', 'Won a major government contract', 'Analyst upgrade to Buy, target +40%', 'Takeover rumors reported by press'],
    down: ['Earnings miss + guidance cut', 'CEO unexpectedly resigned', 'Short-seller report published', 'Clinical trial failed primary endpoint', 'Downgraded to Sell', 'Lost its largest customer'],
    none: ['No news – sector moving', 'No specific news', 'Index rebalancing day'],
  };
  const REGIMES = ['trend-up', 'trend-down', 'orb-fakeout', 'range', 'gap-fade', 'vwap-trend-up', 'vwap-trend-down', 'late-breakout'];
  const REGIME_INFO = {
    'trend-up': ['Trend day up', 'Opened strong and kept grinding higher. ORB longs and VWAP pullback longs worked; shorts got run over.'],
    'trend-down': ['Trend day down', 'Sellers controlled all day below VWAP. ORB shorts and VWAP rejection shorts worked.'],
    'orb-fakeout': ['Failed breakout', 'Broke the opening range, then reversed hard. Traders who respected their stops lost 1R; those who didn\'t lost much more.'],
    'range': ['Chop / range day', 'No follow-through in either direction. The best trade was often NO trade, or small size.'],
    'gap-fade': ['Gap and fade', 'Gapped on news but sellers faded the gap all day. Chasing the open was punished.'],
    'vwap-trend-up': ['VWAP trend (up)', 'Rallied, pulled back to VWAP, held, and trended higher. Textbook VWAP pullback long.'],
    'vwap-trend-down': ['VWAP trend (down)', 'Dropped, bounced into VWAP, got rejected and fell further. Textbook VWAP rejection short.'],
    'late-breakout': ['Quiet morning, late breakout', 'Choppy morning, then a breakout in the afternoon on rising volume. Patience paid.'],
  };

  function genDay(seed) {
    const r = rng(seed);
    const regime = r.pick(REGIMES);
    const prevClose = round2(r.range(18, 220));
    const P = prevClose;
    let gap;
    if (regime === 'trend-up' || regime === 'vwap-trend-up') gap = r.range(0.02, 0.09);
    else if (regime === 'trend-down' || regime === 'vwap-trend-down') gap = -r.range(0.02, 0.09);
    else if (regime === 'gap-fade') gap = (r() < 0.5 ? 1 : -1) * r.range(0.05, 0.12);
    else gap = (r() < 0.5 ? 1 : -1) * r.range(0.005, 0.05);
    const open = round2(P * (1 + gap));
    const s = gap >= 0 ? 1 : -1;
    const m = x => round2(open * (1 + x));
    let path;
    switch (regime) {
      case 'trend-up': path = [[0, open], [3, m(0.012)], [6, m(0.008)], [20, m(0.03)], [28, m(0.024)], [50, m(0.045)], [60, m(0.04)], [77, m(r.range(0.05, 0.07))]]; break;
      case 'trend-down': path = [[0, open], [3, m(-0.012)], [6, m(-0.008)], [20, m(-0.03)], [28, m(-0.024)], [50, m(-0.045)], [60, m(-0.04)], [77, m(-r.range(0.05, 0.07))]]; break;
      case 'orb-fakeout': path = [[0, open], [1, m(s * 0.004)], [4, m(s * 0.011)], [7, m(s * 0.002)], [14, m(-s * 0.018)], [30, m(-s * 0.026)], [55, m(-s * 0.02)], [77, m(-s * 0.03)]]; break;
      case 'range': path = [[0, open], [6, m(0.012)], [14, m(-0.008)], [24, m(0.011)], [34, m(-0.009)], [46, m(0.01)], [58, m(-0.007)], [68, m(0.008)], [77, m(0.001)]]; break;
      case 'gap-fade': path = [[0, open], [2, m(s * 0.008)], [8, m(-s * 0.004)], [25, m(-s * 0.02)], [45, m(-s * 0.035)], [60, m(-s * 0.03)], [77, round2(P * (1 + gap * 0.25))]]; break;
      case 'vwap-trend-up': path = [[0, open], [10, m(0.025)], [20, 'V'], [23, 'V'], [40, m(0.04)], [50, 'V'], [52, 'V'], [77, m(0.055)]]; break;
      case 'vwap-trend-down': path = [[0, open], [10, m(-0.025)], [20, 'V'], [23, 'V'], [40, m(-0.04)], [50, 'V'], [52, 'V'], [77, m(-0.055)]]; break;
      default: path = [[0, open], [8, m(0.006)], [16, m(-0.005)], [26, m(0.005)], [36, m(-0.004)], [46, m(0.006)], [50, m(0.002)], [54, m(s * 0.014)], [77, m(s * r.range(0.03, 0.045))]];
    }
    const candles = fromPath(path, { seed: seed * 7 + 3, n: 78, noise: r.range(0.0011, 0.0019), wick: r.range(0.0008, 0.0014), vol: Math.round(r.range(40000, 160000)) });
    const pdh = round2(P * (1 + r.range(0.008, 0.025)));
    const pdl = round2(P * (1 - r.range(0.008, 0.025)));
    const atr = round2(P * r.range(0.025, 0.05));
    const catalyst = Math.abs(gap) > 0.04 ? r.pick(gap > 0 ? CATALYSTS.up : CATALYSTS.down) : r.pick(CATALYSTS.none);
    const rvol = Math.abs(gap) > 0.04 ? round2(r.range(2.5, 7)) : round2(r.range(0.8, 2.2));
    return { seed, regime, regimeName: REGIME_INFO[regime][0], regimeLesson: REGIME_INFO[regime][1], ticker: r.pick(TICKERS), prevClose: P, open, gapPct: round2(gap * 100), pdh, pdl, atr, catalyst, rvol, candles };
  }

  function barTime(i) { // 5-min bars from 09:30 ET → Israel time is +7h (most of the year)
    const mins = 9 * 60 + 30 + i * 5;
    const f = mm => String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
    return { et: f(mins), il: f(mins + 7 * 60) };
  }

  /* ---------- renderer ---------- */
  const COLORS = { up: '#00d68f', down: '#ff4d6d', grid: 'rgba(255,255,255,0.06)', text: '#8b93b8', vwap: '#ffb627', ema9: '#4c8dff', ema20: '#9b6bff', bg: 'transparent' };

  function draw(canvas, spec, opts) {
    if (!canvas || !canvas.isConnected) return null;
    opts = opts || {};
    const candles = spec.candles.slice(0, opts.upTo != null ? opts.upTo + 1 : undefined);
    const all = spec.candles;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 600, H = canvas.clientHeight || 300;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const padR = 58, padL = 6, padT = 10;
    const volH = spec.noVol ? 0 : Math.round(H * 0.16);
    const padB = (opts.timeAxis ? 18 : 6);
    const plotH = H - padT - padB - volH;
    const slots = opts.slots || all.length;
    const cw = (W - padL - padR) / slots;
    // y-range from what is visible (+ levels/markers) so the future can't be guessed from the scale
    let hi = -Infinity, lo = Infinity;
    for (const c of candles) { hi = Math.max(hi, c.h); lo = Math.min(lo, c.l); }
    // Markers (your stop/target) always fit; reference levels only stretch the scale when they're nearby,
    // so a far-away level can't squash the candles into a thin line.
    const span = Math.max(hi - lo, hi * 0.012);
    for (const m of (opts.markers || [])) if (m.p != null) { hi = Math.max(hi, m.p); lo = Math.min(lo, m.p); }
    for (const l of (spec.levels || [])) if (l.p >= lo - span * 0.6 && l.p <= hi + span * 0.6) { hi = Math.max(hi, l.p); lo = Math.min(lo, l.p); }
    const pad = (hi - lo) * 0.08 || 1; hi += pad; lo -= pad;
    const y = p => padT + (hi - p) / (hi - lo) * plotH;
    const x = i => padL + i * cw + cw / 2;
    // grid + price axis
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.textBaseline = 'middle';
    const step = niceStep((hi - lo) / 5);
    for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) {
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y(p)); ctx.lineTo(W - padR, y(p)); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.fillText(p.toFixed(step < 1 ? 2 : 0), W - padR + 6, y(p));
    }
    // levels
    for (const l of (spec.levels || [])) if (l.p >= lo && l.p <= hi) line(ctx, padL, W - padR, y(l.p), l.color, [6, 4], l.label, W - padR);
    // indicators
    if (!spec.noVwap && opts.vwap !== false && candles.length && candles[0].vwap != null) path(ctx, candles.map((c, i) => [x(i), y(c.vwap)]), COLORS.vwap, 2);
    if (opts.ema && candles.length > 2) {
      path(ctx, ema(candles.map(c => c.c), 9).map((v, i) => [x(i), y(v)]), COLORS.ema9, 1.3);
      path(ctx, ema(candles.map(c => c.c), 20).map((v, i) => [x(i), y(v)]), COLORS.ema20, 1.3);
    }
    // volume
    if (volH) {
      const maxV = Math.max(...all.map(c => c.v));
      candles.forEach((c, i) => {
        const h = c.v / maxV * (volH - 4);
        ctx.fillStyle = (c.c >= c.o ? COLORS.up : COLORS.down) + '55';
        ctx.fillRect(x(i) - cw * 0.35, H - padB - h, cw * 0.7, h);
      });
    }
    // candles
    candles.forEach((c, i) => {
      const up = c.c >= c.o; const col = up ? COLORS.up : COLORS.down;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1, cw * 0.08);
      ctx.beginPath(); ctx.moveTo(x(i), y(c.h)); ctx.lineTo(x(i), y(c.l)); ctx.stroke();
      const bt = y(Math.max(c.o, c.c)), bb = y(Math.min(c.o, c.c));
      ctx.fillRect(x(i) - cw * 0.36, bt, cw * 0.72, Math.max(1.2, bb - bt));
      if (spec.highlight === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.strokeRect(x(i) - cw * 0.5, y(c.h) - 4, cw, y(c.l) - y(c.h) + 8); ctx.setLineDash([]); }
      if (spec.labels && spec.labels[i]) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(spec.labels[i], x(i), y(c.h) - 12); ctx.textAlign = 'left'; }
    });
    if (spec.anatomy) drawAnatomy(ctx, candles, x, y, cw);
    // markers (entry/stop/target/exit)
    for (const mk of (opts.markers || [])) {
      if (mk.p == null) continue;
      const col = { entry: '#4c8dff', stop: '#ff4d6d', target: '#00d68f', draft: '#ffffff' }[mk.type] || '#fff';
      line(ctx, padL, W - padR, y(mk.p), col, mk.type === 'entry' ? [] : [4, 4], mk.label || mk.type, W - padR);
    }
    for (const t of (opts.trades || [])) {
      if (t.entryBar != null) dot(ctx, x(t.entryBar), y(t.entry), t.dir > 0 ? '▲' : '▼', '#4c8dff');
      if (t.exitBar != null) dot(ctx, x(t.exitBar), y(t.exit), '✕', t.r >= 0 ? COLORS.up : COLORS.down);
    }
    // time axis
    if (opts.timeAxis) {
      ctx.fillStyle = COLORS.text;
      for (let i = 0; i < slots; i += 12) { ctx.textAlign = i === 0 ? 'left' : 'center'; ctx.fillText(barTime(i)[opts.tz || 'il'], i === 0 ? padL : x(i), H - 8); }
      ctx.textAlign = 'left';
    }
    // crosshair
    if (opts.hoverY != null && opts.hoverY > padT && opts.hoverY < padT + plotH) {
      const price = hi - (opts.hoverY - padT) / plotH * (hi - lo);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(padL, opts.hoverY); ctx.lineTo(W - padR, opts.hoverY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#232b45'; ctx.fillRect(W - padR + 1, opts.hoverY - 9, padR - 2, 18);
      ctx.fillStyle = '#fff'; ctx.fillText(price.toFixed(2), W - padR + 5, opts.hoverY);
    }
    return { yToPrice: py => hi - (py - padT) / plotH * (hi - lo), priceToY: y };
  }

  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
  function path(ctx, pts, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); }
  function line(ctx, x0, x1, yy, col, dash, label, lx) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.font = '10px "Space Grotesk", sans-serif'; const w = ctx.measureText(label).width + 8; ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fillRect(lx - w - 4, yy - 8, w, 16); ctx.globalAlpha = 1; ctx.fillStyle = '#0b0f1a'; ctx.fillText(label, lx - w, yy); ctx.font = '11px "JetBrains Mono", monospace'; }
  }
  function dot(ctx, xx, yy, ch, col) { ctx.fillStyle = col; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ch, xx, yy); ctx.textAlign = 'left'; ctx.font = '11px "JetBrains Mono", monospace'; }
  function drawAnatomy(ctx, cs, x, y, cw) {
    ctx.fillStyle = '#fff'; ctx.font = '12px "Space Grotesk", sans-serif';
    const g = cs[0], r = cs[1];
    const lab = (t, xx, yy) => { ctx.fillText(t, xx, yy); };
    lab('← High (upper wick)', x(0) + cw * 0.45, y(g.h));
    lab('← Close', x(0) + cw * 0.45, y(g.c));
    lab('← Open', x(0) + cw * 0.45, y(g.o));
    lab('← Low (lower wick)', x(0) + cw * 0.45, y(g.l));
    ctx.textAlign = 'center'; lab('GREEN: close > open', x(0), y(g.l) + 22); lab('RED: close < open', x(1), y(r.l) + 22); ctx.textAlign = 'left';
  }

  window.TQ_Charts = { rng, genDay, fromPath, PATTERNS, draw, barTime, ema, addVwap };
})();
