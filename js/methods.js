/* My Trading Bro – teaching methods + the feedback loop.
 *
 * Every method teaches the SAME lesson content, just in a different way. All of them are built on
 * learning-science techniques that have strong evidence behind them:
 *   • Retrieval practice (testing yourself beats re-reading)       – all methods
 *   • Spaced repetition (review right before you'd forget)        – the Review tab
 *   • Pretesting / "generation effect" (guess first, learn after) – Call It First
 *   • Conversational, bite-sized explanations (less overload)      – Bro Talk
 *   • Worked examples + full explanations                         – Deep Dive
 *   • Desirable difficulty, time pressure, combos (game flow)      – Market Rush
 *
 * After each lesson the learner rates the method 1–5 ★. If it's below CFG.expectedRating, the app
 * asks why. If the reason makes sense, it writes a change request for the owner (Leon) to approve.
 */
(function () {
  'use strict';

  const METHODS = {
    chat: {
      id: 'chat', letter: 'C', icon: '💬', name: 'Bro Talk',
      tagline: 'Your Bro explains it like a chat, one message at a time, with quick checks in between.',
      science: 'Small chunks + checking yourself right after each idea (less overload, better memory).',
      pitch: 'it explains things in small chat-sized pieces and checks you right away',
    },
    predict: {
      id: 'predict', letter: 'P', icon: '🎯', name: 'Call It First',
      tagline: 'Make your call BEFORE you learn the idea, then find out if you were right.',
      science: 'Pretesting: guessing first (even wrong!) makes the real answer stick much better.',
      pitch: 'it turns every idea into a quick guess-first challenge',
    },
    cards: {
      id: 'cards', letter: 'D', icon: '📖', name: 'Deep Dive',
      tagline: 'The full explanation first, with tables and charts, then the quiz.',
      science: 'Worked examples: seeing the whole picture before practicing. Best when a topic is confusing.',
      pitch: 'it gives you the full explanation with examples before any questions',
    },
    rush: {
      id: 'rush', letter: 'R', icon: '⚡', name: 'Market Rush',
      tagline: 'Quick cheat sheet, then a timed question rush with combo multipliers.',
      science: 'Desirable difficulty + game flow: time pressure and streaks keep your brain fully switched on.',
      pitch: 'it is short, fast and game-like, with a timer and combos',
    },
  };
  const ORDER = ['chat', 'predict', 'cards', 'rush'];

  /* ───────── building a session for a method ─────────
   * Returns a list of steps. Card indexes (ci) point into lesson.cards, so grading/review keys stay the same.
   *   {k:'learn', ci}   full explanation card
   *   {k:'chat', ci}    explanation as chat bubbles
   *   {k:'sheet', cis}  compact cheat sheet of several explanations
   *   {k:'predict', ci} ungraded guess on a question (shown before the idea is taught)
   *   {k:'q', ci}       graded question
   */
  function buildSteps(lesson, method) {
    const learn = [], qs = [];
    lesson.cards.forEach((c, i) => (c.t === 'learn' ? learn : qs).push(i));
    const steps = [];
    if (method === 'rush') {
      if (learn.length) steps.push({ k: 'sheet', cis: learn });
      qs.forEach(ci => steps.push({ k: 'q', ci }));
    } else if (method === 'predict') {
      // Guess question k before idea k, then the graded quiz at the end.
      learn.forEach((ci, k) => { if (qs[k] != null && lesson.cards[qs[k]].t !== 'num') steps.push({ k: 'predict', ci: qs[k] }); steps.push({ k: 'learn', ci }); });
      qs.forEach(ci => steps.push({ k: 'q', ci }));
    } else if (method === 'chat') {
      // Explain one idea, check it right away, then the rest of the questions.
      const used = new Set();
      learn.forEach((ci, k) => { steps.push({ k: 'chat', ci }); if (qs[k] != null) { steps.push({ k: 'q', ci: qs[k] }); used.add(qs[k]); } });
      qs.filter(ci => !used.has(ci)).forEach(ci => steps.push({ k: 'q', ci }));
    } else {
      lesson.cards.forEach((c, ci) => steps.push(c.t === 'learn' ? { k: 'learn', ci } : { k: 'q', ci }));
    }
    return steps;
  }

  /* Split a learn card's HTML into chat bubbles (one per paragraph / block; long lists in pairs). */
  function bubbles(html) {
    const tpl = document.createElement('template'); tpl.innerHTML = html.trim();
    const out = [];
    [...tpl.content.childNodes].forEach(n => {
      if (n.nodeType === 3) { if (n.textContent.trim()) out.push(`<p>${n.textContent.trim()}</p>`); return; }
      if (n.nodeType !== 1) return;
      if ((n.tagName === 'UL' || n.tagName === 'OL') && n.children.length > 3) {
        const items = [...n.children];
        for (let i = 0; i < items.length; i += 2) out.push(`<${n.tagName.toLowerCase()} start="${i + 1}">${items.slice(i, i + 2).map(x => x.outerHTML).join('')}</${n.tagName.toLowerCase()}>`);
      } else out.push(n.outerHTML);
    });
    return out.length ? out : [html];
  }

  /* ───────── feedback: reasons, "is it reasonable?", what to switch to ───────── */
  const REASONS = [
    { id: 'boring', label: '😴 Boring', fix: ['rush', 'predict', 'chat'], why: 'more game-like and faster' },
    { id: 'long', label: '🐢 Too long / slow', fix: ['rush', 'chat'], why: 'shorter and quicker' },
    { id: 'text', label: '📚 Too much reading', fix: ['chat', 'rush'], why: 'small chat-sized pieces instead of walls of text' },
    { id: 'confusing', label: '😵 Confusing', fix: ['cards', 'chat'], why: 'the full explanation with examples before any questions' },
    { id: 'easy', label: '🥱 Too easy', fix: ['rush', 'predict'], why: 'more of a challenge' },
    { id: 'hard', label: '🧗 Too hard', fix: ['cards', 'chat'], why: 'more explanation before you get tested' },
    { id: 'guess', label: '🎲 Felt like guessing', fix: ['cards', 'chat'], why: 'you learn the idea first instead of guessing' },
    { id: 'other', label: '✍️ Something else', fix: [], why: '' },
  ];
  const KEYWORDS = [
    [/bor|dull|sleep|משעמם|שעמום|חופר/i, 'boring'],
    [/long|slow|forever|ארוך|איטי/i, 'long'],
    [/read|text|words|wall|קריאה|טקסט|מילים/i, 'text'],
    [/confus|understand|lost|get it|לא הבנתי|מבלבל|לא ברור/i, 'confusing'],
    [/easy|simple|קל מדי|קליל/i, 'easy'],
    [/hard|difficult|tough|קשה/i, 'hard'],
    [/guess|random|ניחוש|לנחש/i, 'guess'],
    [/fast|rush|time|timer|stress|לחץ|מהר/i, 'hard'],
  ];
  const JUNK = /^(idk|i dont know|i don't know|no|nah|nothing|bad|meh|lol|lmao|whatever|just because|because|cuz|dunno|asdf|qwerty|ok|okay|לא יודע|סתם|כי ככה|לא|אין)$/i;

  // Is the free-text reason something we can act on?
  function judgeText(text) {
    const t = String(text || '').trim();
    if (t.length < 8) return { ok: false, msg: 'Can you say a bit more? A short sentence is enough.' };
    if (JUNK.test(t.replace(/[.!?]+$/, ''))) return { ok: false, msg: 'Give me a real reason so I know what to change 🙏' };
    const letters = (t.match(/\p{L}/gu) || []).length;
    if (letters / t.length < 0.6) return { ok: false, msg: 'That doesn\'t look like words. What didn\'t you like?' };
    if (/asdf|qwer|zxcv|hjkl|sdfg|dfgh|fghj|ghjk/i.test(t)) return { ok: false, msg: 'That looks like keyboard mashing 😄 What didn\'t you like?' };
    if (/(.)\1{4,}/.test(t)) return { ok: false, msg: 'Try writing it as a sentence 😄' };
    const words = t.split(/\s+/).filter(w => /\p{L}{2,}/u.test(w));
    if (words.length < 2) return { ok: false, msg: 'A couple more words, please.' };
    const latin = t.match(/[a-z]/gi) || [];
    if (latin.length > 10 && !/[aeiouy]/i.test(t)) return { ok: false, msg: 'That doesn\'t look like words. What didn\'t you like?' };
    return { ok: true };
  }
  function reasonFromText(text) {
    for (const [re, id] of KEYWORDS) if (re.test(text)) return id;
    return null;
  }
  /* Decide what to do with a low rating. Returns {ok, msg?, to?, reasonId, why} */
  function evaluate(reasonId, text, current, rejected) {
    let rid = reasonId;
    if (rid === 'other') {
      const j = judgeText(text); if (!j.ok) return j;
      rid = reasonFromText(text) || 'other';
    } else if (text && text.trim() && !judgeText(text).ok) {
      text = ''; // a chip is enough on its own; ignore junk extra text
    }
    const r = REASONS.find(x => x.id === rid);
    const skip = new Set([current].concat(rejected || []));
    let to = (r.fix || []).find(m => !skip.has(m));
    if (!to) to = ORDER.find(m => !skip.has(m)) || ORDER.find(m => m !== current);
    const why = METHODS[to].pitch;
    return { ok: true, to, reasonId: rid, text: (text || '').trim(), why };
  }

  /* ───────── approval codes (work across two phones) ───────── */
  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).toUpperCase().padStart(7, '0'); }
  function approvalCode(id, to) { return METHODS[to].letter + hash(id + ':' + to + ':' + window.TQ_CONFIG.ownerSecret).slice(0, 5); }
  function checkApproval(id, code) {
    const c = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return ORDER.find(m => approvalCode(id, m) === c) || null;
  }

  window.TQ_Methods = { METHODS, ORDER, REASONS, buildSteps, bubbles, evaluate, judgeText, approvalCode, checkApproval };
})();
