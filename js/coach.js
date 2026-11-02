/* My Trading Bro – Coach.
 * Offline mode: rule-based answers from the course, glossary, live calculators and the learner's own data.
 * AI mode: if TQ_CONFIG.aiEndpoint is set, questions go to the coach worker (server/coach-worker.js). */
(function () {
  'use strict';

  function zonedParts(tz) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = Object.fromEntries(f.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { day: parts.weekday, h: +parts.hour % 24, m: +parts.minute, str: parts.hour + ':' + parts.minute };
  }

  function marketStatus() {
    const ny = zonedParts('America/New_York');
    const il = zonedParts('Asia/Jerusalem');
    const mins = ny.h * 60 + ny.m;
    const weekend = ny.day === 'Sat' || ny.day === 'Sun';
    let us;
    if (weekend) us = 'closed (weekend)';
    else if (mins >= 570 && mins < 960) us = 'OPEN – regular session';
    else if (mins >= 240 && mins < 570) us = 'pre-market';
    else if (mins >= 960 && mins < 1200) us = 'after-hours';
    else us = 'closed';
    // offset between Israel and New York right now (handles DST mismatch weeks)
    const diff = ((il.h * 60 + il.m) - mins + 1440) % 1440;
    const openIL = new Date(Date.UTC(2000, 0, 1, 9, 30 + diff)).toISOString().substr(11, 5);
    const closeIL = new Date(Date.UTC(2000, 0, 1, 16, diff)).toISOString().substr(11, 5);
    const ilWeekday = il.day;
    const tase = (ilWeekday === 'Sat' || ilWeekday === 'Sun') ? 'closed (weekend)' : (ilWeekday === 'Fri' ? 'short Friday session (ends early afternoon)' : ((il.h * 60 + il.m) >= 600 && (il.h * 60 + il.m) < 1045 ? 'likely open' : 'closed'));
    return { ny: ny.str, il: il.str, us, openIL, closeIL, tase, holidayNote: 'Holidays are not included, so check the exchange calendar.' };
  }

  function nums(text) { return (text.replace(/,/g, '').match(/-?\d+(\.\d+)?/g) || []).map(Number); }

  function lessonLink(id) {
    for (const u of window.TQ_COURSE) for (const l of u.lessons) if (l.id === id) return `[[lesson:${id}|${u.title} → ${l.title}]]`;
    return '';
  }

  function searchLessons(q) {
    const words = q.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const hits = [];
    for (const u of window.TQ_COURSE) for (const l of u.lessons) {
      const text = (l.title + ' ' + l.cards.map(c => (c.title || '') + ' ' + (c.html || '') + ' ' + (c.q || '')).join(' ')).toLowerCase();
      const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
      if (score) hits.push({ id: l.id, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, 3).map(h => h.id);
  }

  function offlineAnswer(q, ctx) {
    const t = q.toLowerCase().trim();
    const n = nums(t);
    const name = ctx.name || 'bro';

    if (/^(hi|hey|hello|yo|sup|shalom|שלום|היי)\b/.test(t))
      return `Hey ${name}! 👋 Ask me anything: a term ("what is VWAP?"), a calculation ("position size 10000 1% entry 50 stop 49.5"), "what should I work on?", "is the market open?", or "my stats".`;

    if (/(weak|work on|improve|what should i (learn|study|practice)|next|struggl|mistake)/.test(t)) {
      const lines = [];
      if (ctx.weak.length) {
        lines.push(`Based on your quiz grades, here's what needs more work, ${name}:`);
        ctx.weak.slice(0, 5).forEach(w => lines.push(`• **${w.title}**: ${w.score}% (${lessonLink(w.id)})`));
        lines.push('Tip: open **Review** to replay only the questions you got wrong.');
      } else lines.push(`No weak spots yet. Every lesson you've done is at 80%+. 💪`);
      if (ctx.next) lines.push(`Next new lesson on your path: ${lessonLink(ctx.next)}`);
      if (ctx.arena.trades >= 5) {
        if (ctx.arena.expectancy < 0) lines.push(`In the Arena your expectancy is **${ctx.arena.expectancy.toFixed(2)}R**. Review your journal: which setup and emotion tag loses most?`);
        else lines.push(`Arena expectancy: **${ctx.arena.expectancy.toFixed(2)}R** over ${ctx.arena.trades} trades. Keep logging until 100+.`);
      }
      return lines.join('\n');
    }

    if (/(my stats|my progress|how am i doing|report card|my grades)/.test(t)) {
      const a = ctx.arena;
      return [`📋 **${name}'s report card**`,
        `• Level ${ctx.level} · ${ctx.xp} XP · 🔥 ${ctx.streak}-day streak`,
        `• Lessons completed: ${ctx.done}/${ctx.total} · average grade ${ctx.avgGrade}%`,
        `• Arena: ${a.trades} trades · win rate ${a.winRate}% · expectancy ${a.expectancy.toFixed(2)}R · total ${a.totalR.toFixed(1)}R`,
        ctx.weak.length ? `• Needs work: ${ctx.weak.slice(0, 3).map(w => w.title).join(', ')}` : '• No weak topics right now 🎯'].join('\n');
    }

    if (/(open|close|hours|time|when).*(market|nasdaq|nyse|tase|bourse|us)|(market|nasdaq|nyse|tase).*(open|close|hours)/.test(t)) {
      const s = marketStatus();
      return [`🕓 Right now: **${s.il}** in Israel, **${s.ny}** in New York.`,
        `🇺🇸 US stocks: **${s.us}**. Today the regular session runs **${s.openIL}–${s.closeIL} Israel time**.`,
        `🇮🇱 TASE: ${s.tase}. (Mon–Fri since Jan 2026.)`, s.holidayNote, lessonLink('u7l1')].join('\n');
    }

    if (/(position size|how many shares|shares should|size calc)/.test(t) && n.length >= 4) {
      const [acct, risk, entry, stop] = n;
      const riskUsd = acct * risk / 100; const per = Math.abs(entry - stop);
      if (!per) return 'Entry and stop can\'t be the same price.';
      const sh = Math.floor(riskUsd / per);
      return `🧮 Account $${acct.toLocaleString()} × ${risk}% = **$${riskUsd.toFixed(2)} risk**.\nRisk per share = |${entry} − ${stop}| = $${per.toFixed(2)}.\n**Shares = ${riskUsd.toFixed(2)} ÷ ${per.toFixed(2)} = ${sh}** (position value ≈ $${(sh * entry).toLocaleString(undefined, { maximumFractionDigits: 0 })}).${risk > 1 ? '\n⚠️ Above 1% risk per trade. Most pros stay at 0.5–1%.' : ''}\n${lessonLink('u4l1')}`;
    }
    if (/(position size|how many shares)/.test(t))
      return `Use: **Shares = (Account × Risk%) ÷ (Entry − Stop)**. Give me the numbers like: "position size 10000 1% entry 50 stop 49.5" and I'll calculate it. ${lessonLink('u4l1')}`;

    if (/expectancy/.test(t) && n.length >= 3) {
      let [wr, aw, al] = n; if (wr > 1) wr /= 100; al = Math.abs(al);
      const e = wr * aw - (1 - wr) * al;
      return `📐 Expectancy = ${wr.toFixed(2)} × ${aw} − ${(1 - wr).toFixed(2)} × ${al} = **${e.toFixed(3)}R per trade**. ${e > 0 ? 'Positive (before costs). ✅' : 'Negative: this loses money over time. ❌'}\n${lessonLink('u4l2')}`;
    }

    if (/(breakeven|break even).*(win|rate)|win rate.*need/.test(t) && n.length >= 1) {
      const rr = n[0]; const be = 1 / (1 + rr) * 100;
      return `With a ${rr}:1 reward:risk you need to win **${be.toFixed(1)}%** of trades to break even (before costs). ${lessonLink('u4l3')}`;
    }

    if (/(real money|open (an )?account|broker for me|parent'?s? account|my (dad|mom|father|mother)'?s? account|start trading for real|deposit)/.test(t))
      return `Straight talk, ${name}: in Israel you generally need to be **18** to open your own trading account. Using someone else's account to get around that isn't a good idea, and it isn't legal either.\nThe good news: you have time to do what most traders skip. Build **100+ journaled Arena trades** with positive expectancy and finish the course. When you turn 18, you'll start with real skills (and tiny size). ${lessonLink('u7l2')}`;

    if (/(should i buy|what (stock|share) (should|to) buy|give me a (tip|stock)|which stock|best stock|will .* go up|price target)/.test(t))
      return `I don't give stock picks, and honestly, nobody can reliably tell you what goes up tomorrow. What I *can* teach you is the process pros use to find trades each morning:\n1. Look for **Stocks in Play** (catalyst + gap + RVOL ≥ 2).\n2. Mark key levels (PDH/PDL, pre-market high/low, VWAP).\n3. Wait for **your** setup (ORB / VWAP pullback).\n4. Size by the stop, risk ≤1%.\n${lessonLink('u5l1')}`;

    if (/(guarantee|get rich|quick money|double my money|100% win|never lose)/.test(t))
      return `Nothing in trading is guaranteed. Anyone promising that is selling something. Research shows ~97% of persistent day traders lose money (Brazil study). The edge comes from risk control + a tested setup + discipline. ${lessonLink('u0l2')}`;

    // glossary (longest key first so "stop loss" wins over "stop")
    const keys = Object.keys(window.TQ_GLOSSARY).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b');
      if (re.test(t)) return `📘 ${window.TQ_GLOSSARY[k]}`;
    }

    const hits = searchLessons(t);
    if (hits.length) return `I'm not 100% sure what you mean, but these lessons cover it:\n${hits.map(h => '• ' + lessonLink(h)).join('\n')}\nYou can also ask about a specific term (VWAP, ORB, R multiple, spread…).`;
    return `I didn't get that one 🤔. Try:\n• "what is a stop loss?"\n• "position size 25000 0.5% entry 40 stop 39.6"\n• "expectancy 45% 2 1"\n• "is the market open?"\n• "what should I work on?"\n${window.TQ_CONFIG.aiEndpoint ? '' : '\n(The full AI coach can be switched on later, see README.)'}`;
  }

  async function aiAnswer(history, ctx, onText) {
    const res = await fetch(window.TQ_CONFIG.aiEndpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12), learner: ctx }),
    });
    if (!res.ok) throw new Error('Coach server error ' + res.status);
    const data = await res.json();
    if (onText) onText(data.text);
    return data.text;
  }

  async function ask(history, ctx, onText) {
    const q = history[history.length - 1].content;
    if (window.TQ_CONFIG.aiEndpoint) {
      try { return { text: await aiAnswer(history, ctx, onText), mode: 'ai' }; }
      catch (e) { return { text: offlineAnswer(q, ctx) + '\n\n_(AI coach unreachable, so this answer came from the offline coach.)_', mode: 'offline' }; }
    }
    return { text: offlineAnswer(q, ctx), mode: 'offline' };
  }

  window.TQ_Coach = { ask, marketStatus };
})();
