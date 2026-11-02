/* My Trading Bro – voice: Bro speaks (text-to-speech) and listens (speech recognition).
 * Uses the browser's built-in voices, so no API key is needed. Edge has very natural "Online (Natural)" voices.
 * Listening uses the browser's speech recognition (Edge/Chrome, needs internet + microphone permission). */
(function () {
  'use strict';
  const synth = window.speechSynthesis || null;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voices = [];
  let settings = { name: '', rate: 1 };
  let token = 0;        // bumps on every stop(), so stale callbacks are ignored
  let rec = null;

  function loadVoices() { if (synth) voices = synth.getVoices(); }
  if (synth) { loadVoices(); synth.addEventListener && synth.addEventListener('voiceschanged', loadVoices); }

  function englishVoices() {
    return voices.filter(v => /^en(-|_|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a));
  }
  function score(v) {
    let s = 0;
    if (/natural/i.test(v.name)) s += 50;
    if (/online/i.test(v.name)) s += 10;
    if (/en-US/i.test(v.lang)) s += 8;
    if (/andrew|brian|guy|christopher|eric|ryan|davis|roger|steffan|david|mark|george/i.test(v.name)) s += 20; // a "bro" voice
    if (/google/i.test(v.name)) s += 5;
    return s;
  }
  function pickVoice() {
    const en = englishVoices();
    return en.find(v => v.name === settings.name) || en[0] || voices[0] || null;
  }

  /* Turn lesson HTML into something that sounds good out loud. */
  function toSpeech(html) {
    const tpl = document.createElement('template'); tpl.innerHTML = String(html || '');
    const parts = [];
    tpl.content.querySelectorAll('table').forEach(t => {
      const rows = [...t.rows].map(r => [...r.cells].map(c => c.textContent.trim()));
      const head = rows[0] || []; const lines = [];
      rows.slice(1).forEach(r => {
        if (head.length > 2 && !head[0]) lines.push(r[0] + ': ' + r.slice(1).map((c, i) => head[i + 1] + ', ' + c).join('; ') + '.');
        else lines.push(r.map((c, i) => (head[i] ? head[i] + ' ' : '') + c).join(', ') + '.');
      });
      t.replaceWith(document.createTextNode(' ' + lines.join(' ') + ' '));
    });
    tpl.content.querySelectorAll('li,p,div,h1,h2,h3,br').forEach(el => el.append(document.createTextNode('. ')));
    return clean(tpl.content.textContent);
  }
  function clean(t) {
    return String(t)
      .replace(/\[\[lesson:\w+\|([^\]]+)\]\]/g, '$1')
      .replace(/\*\*|__|`/g, '')
      .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|️|‍/gu, '')
      .replace(/(\d),(\d{3})/g, '$1$2')
      .replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/≈/g, ' about ')
      .replace(/→/g, ', then ').replace(/–/g, ' to ').replace(/₪\s?(\d[\d.]*)/g, '$1 shekels').replace(/₪/g, ' shekels ')
      .replace(/%/g, ' percent').replace(/\b(\d+(?:\.\d+)?)R\b/g, '$1 R').replace(/\bvs\.?/gi, 'versus').replace(/\be\.g\./gi, 'for example')
      .replace(/\bIL\b/g, 'Israel').replace(/\bET\b/g, 'Eastern time').replace(/\s*\.\s*(\.\s*)+/g, '. ')
      .replace(/\s+/g, ' ').trim();
  }
  function chunks(text) {
    // Browsers cut off very long utterances, so speak sentence by sentence.
    const out = []; let cur = '';
    String(text).split(/(?<=[.!?:;])\s+/).forEach(s => {
      if ((cur + ' ' + s).length > 220 && cur) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
    });
    if (cur) out.push(cur);
    return out.filter(x => x.replace(/[\s.]/g, ''));
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!synth) { if (opts.onend) setTimeout(opts.onend, 0); return; }
    const my = ++token; synth.cancel();
    const list = chunks(clean(text)); const v = pickVoice();
    if (!list.length) { if (opts.onend) setTimeout(() => { if (my === token) opts.onend(); }, 0); return; }
    let i = 0;
    const next = () => {
      if (my !== token) return;
      if (i >= list.length) { if (opts.onend) opts.onend(); return; }
      const u = new SpeechSynthesisUtterance(list[i++]);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = settings.rate || 1; u.pitch = 1;
      u.onend = next; u.onerror = next;
      synth.speak(u);
    };
    next();
    // Some browsers stall speech in the background; nudging resume() keeps it going.
    const keep = setInterval(() => { if (my !== token || !synth.speaking) return clearInterval(keep); if (!synth.paused) { synth.pause(); synth.resume(); } }, 10000);
  }
  function stop() { token++; if (synth) synth.cancel(); stopListening(); }
  const speaking = () => !!(synth && synth.speaking);

  function listen(opts) {
    opts = opts || {};
    stopListening();
    if (!Rec) { if (opts.onerror) opts.onerror('unsupported'); return false; }
    const my = token;
    rec = new Rec(); rec.lang = 'en-US'; rec.interimResults = !!opts.interim; rec.maxAlternatives = 3; rec.continuous = false;
    let got = false;
    rec.onresult = e => {
      if (my !== token) return;
      const r = e.results[e.results.length - 1];
      if (!r.isFinal) { if (opts.oninterim) opts.oninterim(r[0].transcript); return; }
      got = true; const alts = [...r].map(a => a.transcript.trim());
      if (opts.onresult) opts.onresult(alts[0], alts);
    };
    rec.onerror = e => { if (my === token && opts.onerror) opts.onerror(e.error || 'error'); };
    rec.onend = () => { rec = null; if (my === token && opts.onend) opts.onend(got); };
    try { rec.start(); } catch (e) { if (opts.onerror) opts.onerror('busy'); return false; }
    return true;
  }
  function stopListening() { if (rec) { try { rec.onend = null; rec.abort(); } catch (e) { } rec = null; } }

  /* Understand a spoken answer. Returns {i} for mcq/tf, {n} for numbers, {cmd} for commands, or null. */
  const WORDNUM = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function wordsToNumber(t) {
    const m = t.replace(/,/g, '').match(/-?\d+(\.\d+)?/); if (m) return parseFloat(m[0]);
    const ws = t.toLowerCase().replace(/-/g, ' ').split(/\s+/); let total = 0, cur = 0, seen = false, dec = null;
    for (const w of ws) {
      if (w === 'point') { dec = ''; continue; }
      if (w in WORDNUM) { seen = true; if (dec !== null) dec += WORDNUM[w]; else cur += WORDNUM[w]; }
      else if (w === 'hundred') { cur *= 100; seen = true; }
      else if (w === 'thousand') { total += cur * 1000; cur = 0; seen = true; }
      else if (w === 'million') { total += cur * 1e6; cur = 0; seen = true; }
    }
    if (!seen) return null;
    return parseFloat(String(total + cur) + (dec ? '.' + dec : ''));
  }
  function commandOf(t) {
    if (/\b(repeat|again|say (that|it) again|what\??)$/i.test(t) || /^(repeat|again)\b/i.test(t)) return 'repeat';
    if (/^(next|continue|go on|skip|ok(ay)?|got it|yes next)\b/i.test(t)) return 'next';
    if (/^(stop|pause|wait)\b/i.test(t)) return 'pause';
    if (/\b(i don'?t know|no idea|not sure|pass)\b/i.test(t)) return 'dunno';
    return null;
  }
  // Which option did they say, judged by the option's own words (numbers like "97" count too)?
  function matchOption(card, t) {
    const STOP = /^(the|and|for|you|your|are|with|that|this|its|it's|one|answer|option|think|say|guess|about)$/;
    const words = s => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => (w.length > 2 || /\d/.test(w)) && !STOP.test(w)));
    const said = words(t); let best = null, bestScore = 0, second = 0;
    if (!said.size) return null;
    card.opts.forEach((o, i) => {
      const ow = words(o); let hit = 0; ow.forEach(w => { if (said.has(w)) hit++; });
      // Count both "how much of the option did they say" and "how much of what they said is this option".
      const sc = ow.size && hit ? Math.max(hit / ow.size, hit / said.size) : 0;
      if (sc > bestScore) { second = bestScore; bestScore = sc; best = i; } else if (sc > second) second = sc;
    });
    return best != null && bestScore >= 0.5 && bestScore > second ? best : null;
  }
  function parseAnswer(card, alts) {
    for (const raw of alts) {
      const t = raw.toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/[,!?]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!t) continue;
      const cmd = commandOf(t);
      if (card.t === 'tf') {
        if (/\b(true|yes|yeah|yep|correct|right|bull|bullish|that'?s true)\b/.test(t) && !/\bnot (true|correct|right)\b/.test(t)) return { i: 1 };
        if (/\b(false|no|nope|wrong|incorrect|bear|bearish|not true)\b/.test(t)) return { i: 0 };
      } else if (card.t === 'mcq') {
        const byText = matchOption(card, t);
        if (byText != null && t.split(' ').length > 2) return { i: byText }; // "a repeatable advantage…" is option text, not letter A
        const L = t.match(/^(?:answer |option |letter |it'?s |i think |i'?ll go with |the answer is )?(a|b|c|d|ay|bee|be|see|sea|cee|dee|the)\b/);
        const map = { a: 0, ay: 0, b: 1, bee: 1, be: 1, c: 2, see: 2, sea: 2, cee: 2, d: 3, dee: 3 };
        if (L && L[1] in map && map[L[1]] < card.opts.length) return { i: map[L[1]] };
        const ord = t.match(/\b(first|second|third|fourth|one|two|three|four|1|2|3|4)\b/);
        const omap = { first: 0, one: 0, 1: 0, second: 1, two: 1, 2: 1, third: 2, three: 2, 3: 2, fourth: 3, four: 3, 4: 3 };
        if (ord && /(option|answer|number|the|first|second|third|fourth)/.test(t) && omap[ord[1]] < card.opts.length) return { i: omap[ord[1]] };
        if (byText != null) return { i: byText };
      } else if (card.t === 'num') {
        const n = wordsToNumber(t); if (n != null && !isNaN(n)) return { n };
      }
      if (cmd) return { cmd };
    }
    return null;
  }
  function parseStars(alts) {
    for (const t of alts) { const n = wordsToNumber(t.toLowerCase().replace(/\b(won|want)\b/g, 'one').replace(/\b(to|too)\b/g, 'two').replace(/\bfor\b/g, 'four')); if (n >= 1 && n <= 5) return Math.round(n); }
    return null;
  }

  window.TQ_Voice = {
    canSpeak: !!synth, canListen: !!Rec,
    speak, stop, speaking, listen, stopListening, toSpeech, clean, parseAnswer, parseStars,
    englishVoices, pickVoice, set(s) { settings = Object.assign({ name: '', rate: 1 }, s || {}); }, get settings() { return settings; },
  };
})();
