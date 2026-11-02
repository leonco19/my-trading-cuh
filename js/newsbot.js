/* My Trading Cuh – News.
 * news.json is refreshed every 2 hours by GitHub Actions (scripts/update_news.py), organized by topic.
 * This file loads it, searches it, and explains why a headline matters for each course (day/swing/invest/crypto).
 * Live search through rss2json is only a fallback for searches that aren't in news.json. */
(function () {
  'use strict';
  const R2J = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const GLOBES = 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585';
  const mem = {};
  let last = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };
  const gnews = (q, he) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + (he ? '&hl=iw&gl=IL&ceid=IL:iw' : '&hl=en-US&gl=US&ceid=US:en');
  const hasHebrew = t => /[֐-׿]/.test(t);

  // Read one feed (cached 10 min; the free reader needs a little space between requests, so we queue + retry).
  async function feed(url) {
    const key = 'nb:' + url;
    let c = mem[url]; if (!c) { try { c = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { c = null; } }
    if (c && Date.now() - c.t < 10 * 60000) return c.items;
    for (let a = 0; a < 3; a++) {
      const wait = Math.max(0, last + 1700 - Date.now()); if (wait) await sleep(wait);
      last = Date.now();
      try {
        const r = await fetch(R2J + encodeURIComponent(url));
        if (r.ok) {
          const d = await r.json();
          if (d.status === 'ok') {
            const isG = url.includes('news.google');
            const items = (d.items || []).map(it => {
              let title = decode(it.title).trim(), source = isG ? '' : decode((d.feed && d.feed.title) || '').replace(/\s*[-|].*$/, '');
              const m = isG && title.match(/^(.*\S)\s+[-–]\s+([^-–]{2,70})$/); if (m) { title = m[1]; source = m[2]; }
              const date = it.pubDate ? new Date(it.pubDate.replace(' ', 'T') + (/[zZ+]/.test(it.pubDate.slice(10)) ? '' : 'Z')) : null;
              return { title, source: source || (isG ? 'Google News' : 'Globes'), url: it.link, date: date && !isNaN(date) ? date : null };
            }).filter(x => x.title);
            const out = { t: Date.now(), items }; mem[url] = out; try { sessionStorage.setItem(key, JSON.stringify(out)); } catch (e) { }
            return items;
          }
        }
      } catch (e) { }
      await sleep(1500 * (a + 1));
    }
    throw new Error('news-unavailable');
  }
  function tidy(list, n) {
    const seen = new Set();
    return list.filter(x => { const k = x.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, n || 6)
      .map(x => Object.assign({}, x, { date: x.date ? x.date.getTime() : null }));
  }

  /* What to search for each course */
  const TOPICS = {
    day: { q: '"stock market" OR nasdaq OR "S&P 500" when:1d', label: 'day trading' },
    swing: { q: 'stock earnings OR "stock market" when:2d', label: 'swing trading' },
    invest: { q: '"S&P 500" OR "interest rates" OR inflation when:3d', label: 'investing' },
    crypto: { q: 'bitcoin OR ethereum OR crypto when:1d', label: 'crypto' },
  };

  /* Why it matters, per course */
  const RULES = [
    { re: /earnings|results|quarter|guidance|revenue|profit|דוח|רווח|הכנסות/i, name: 'Earnings season', lesson: 'u5l1',
      day: 'Earnings make stocks gap and become "in play": huge volume and fast moves both ways. Wait for the opening range before you jump in.',
      swing: 'Check the earnings date before you hold a stock overnight. Earnings can gap a stock right past your stop.',
      invest: 'One quarter rarely changes a 10-year story. Investors care about the long-term trend in profits, not one report.',
      crypto: 'Big tech earnings move the whole risk mood, and crypto often follows the Nasdaq on those days.' },
    { re: /\bfed\b|federal reserve|powell|interest rate|rate cut|rate hike|ריבית|בנק ישראל/i, name: 'Interest rates', lesson: 'u7l1',
      day: 'Rate decision days are wild: the market can swing hard in the minutes after the announcement. Many day traders sit out until it settles.',
      swing: 'Rates shape the overall trend. Lower rates usually help stocks, higher rates hurt growth stocks most.',
      invest: 'Rates affect everything: savings accounts, bonds and stock prices. That is why investors spread money across asset types.',
      crypto: 'Lower rates mean cheaper money, which has often helped risky assets like crypto (and the opposite when rates rise).' },
    { re: /inflation|\bcpi\b|consumer prices|אינפלציה|מדד המחירים/i, name: 'Inflation', lesson: 'i1l3',
      day: 'Inflation reports (CPI) come out before the US open and can make the first minutes very volatile.',
      swing: 'Hot inflation numbers can flip the market trend for days. Check the index before opening new longs.',
      invest: 'Inflation is why cash slowly loses value. Your real return = your return minus inflation.',
      crypto: 'Inflation data moves rate expectations, and those move crypto too.' },
    { re: /jobs report|payrolls|unemployment|תעסוקה|אבטלה/i, name: 'Jobs data', lesson: 'u7l1',
      day: 'The jobs report (first Friday of the month) drops before the open and often causes a big gap.',
      swing: 'Strong or weak jobs data can change the market direction for the week.',
      invest: 'A strong job market usually means a healthy economy. One report is just noise for long-term investors.',
      crypto: 'Jobs data moves rate expectations, which crypto traders watch closely.' },
    { re: /\bipo\b|goes public|listing|debut|הנפקה/i, name: 'IPOs', lesson: 'u1l1',
      day: 'New IPOs are super volatile and have little price history. Pros usually wait for the opening range to form first.',
      swing: 'Many traders wait for an IPO to build a base for a few weeks before buying the breakout.',
      invest: 'Hyped IPOs often fall after the first days. Index funds get new companies automatically once they are big enough.',
      crypto: 'Crypto companies going public link crypto and the stock market more tightly.' },
    { re: /bankrupt|chapter 11|insolven|default|פשיטת רגל|חדלות פירעון/i, name: 'Bankruptcy', lesson: 'u5l5',
      day: 'Bankrupt stocks get very cheap and very volatile. Easy to lose fast, so avoid them while learning.',
      swing: 'This is why every position needs a stop: one bad headline can wipe out a single stock.',
      invest: 'This is why diversification matters: in an index fund, one bankruptcy barely moves you.',
      crypto: 'When a crypto exchange or lender goes bust, coins held there can be frozen. Not your keys, not your coins.' },
    { re: /merger|acquisition|acquire|buyout|takeover|deal to buy|מיזוג|רכישה/i, name: 'Mergers & deals', lesson: 'u5l1',
      day: 'The company being bought usually jumps toward the deal price, then barely moves. The buyer often drops.',
      swing: 'After a takeover jump there is usually little upside left. Rumors are riskier than confirmed deals.',
      invest: 'Big deals change companies for years. Investors look at whether the price paid makes sense.',
      crypto: 'Big companies buying into crypto can lift the whole sector for a while.' },
    { re: /hack|exploit|stolen|breach|scam|fraud|פריצה|הונאה/i, name: 'Hacks & scams', lesson: 'c3l2',
      day: 'Hack headlines can crash a coin or stock in minutes. That is why the stop goes in before anything else.',
      swing: 'A hack can gap a position overnight. Size small so one event can\'t hurt you badly.',
      invest: 'Security problems are a long-term risk for a company, and another reason to diversify.',
      crypto: 'Hacks are why you never leave everything on one exchange, and never share your seed phrase.' },
    { re: /\betf\b|fund flows|תעודת סל|קרן מחקה/i, name: 'ETFs', lesson: 'u10l2',
      day: 'Big ETFs like SPY and QQQ show the market\'s mood. If they\'re falling, most long setups are harder.',
      swing: 'Check the index ETF trend before swing trades. Most stocks follow the market.',
      invest: 'Index ETFs are the core tool for long-term investors: cheap, diversified, and simple.',
      crypto: 'Money flowing into Bitcoin ETFs is a big driver of the BTC price since 2024.' },
    { re: /record high|all-time high|rally|surge|soar|jump|שיא|זינוק/i, name: 'Big rally', lesson: 'u6l1',
      day: 'Rallies tempt FOMO. Wait for your setup, and don\'t chase a stock that already ran.',
      swing: 'Strong trends are great for swing traders, but buy pullbacks, not spikes.',
      invest: 'Markets at record highs are normal over time. Investors keep buying on schedule (DCA) instead of guessing.',
      crypto: 'Crypto rallies can reverse fast. Take profits by plan, not by feeling.' },
    { re: /sell-?off|plunge|crash|tumble|slump|sink|drop|fall|ירידות|צניחה|קריסה/i, name: 'Sell-off', lesson: 'u4l4',
      day: 'Big down days are where your daily loss limit matters most. Trade smaller, or not at all.',
      swing: 'When the index breaks down, swing traders cut size and wait in cash.',
      invest: 'Panic-selling in crashes is the classic investor mistake. If you don\'t need the money for years, stay calm.',
      crypto: 'Crypto drawdowns can hit 70%+. Position size is your seatbelt.' },
    { re: /oil|opec|brent|crude|נפט/i, name: 'Oil', lesson: 'u7l1',
      day: 'Oil moves hit energy stocks first, and can pull the whole market with them.',
      swing: 'Energy stocks trend with oil. Check the oil chart before trading them.',
      invest: 'Oil prices feed into inflation, which feeds into interest rates.',
      crypto: 'Oil shocks change the overall risk mood, and crypto often reacts.' },
    { re: /tariff|trade war|sanction|מכס|סנקציות/i, name: 'Tariffs & trade', lesson: 'u7l1',
      day: 'Tariff headlines can drop at any time and move the market in seconds. Always trade with a stop.',
      swing: 'Trade fights can change a sector\'s trend for weeks. Watch which industries are hit.',
      invest: 'Trade wars come and go. A global, diversified portfolio handles them better than a few stocks.',
      crypto: 'Trade tension makes markets nervous, and crypto usually moves with that mood.' },
    { re: /war|attack|missile|conflict|ceasefire|מלחמה|הפסקת אש|טיל/i, name: 'Geopolitics', lesson: 'u6l3',
      day: 'Geopolitical news creates sudden spikes. Most pros reduce size when headlines are flying.',
      swing: 'Unexpected events are why overnight gaps happen. Never risk more than you planned.',
      invest: 'Historically, markets recovered from most crises. Long-term investors avoid reacting to every headline.',
      crypto: 'In scary times crypto has acted both as "digital gold" and as a risky asset. Don\'t assume either.' },
    { re: /halving|bitcoin|btc|ethereum|ביטקוין|קריפטו/i, name: 'Crypto', lesson: 'c1l1',
      day: 'Crypto trades 24/7, so news can move it while US stocks are closed. Crypto-related stocks often follow.',
      swing: 'Crypto trends can last weeks, but they swing much harder than stocks. Use smaller size.',
      invest: 'If you ever invest in crypto, keep it a small part of your money. It can drop 70%+.',
      crypto: 'This is the news that moves your market. Check the trend, the levels, and your risk before acting.' },
    { re: /\bai\b|artificial intelligence|nvidia|chip|semiconductor|בינה מלאכותית|שבבים/i, name: 'AI & chips', lesson: 'u5l1',
      day: 'AI and chip stocks are the most "in play" names right now: big volume and big daily ranges.',
      swing: 'Hot sectors trend, but pullbacks can be sharp. Buy near support, with a stop.',
      invest: 'Hype sectors can fall hard after big runs. That\'s why investors don\'t put everything in one theme.',
      crypto: 'The AI boom competes with crypto for the same "risk money", so their moods often link.' },
  ];
  function explain(items, track) {
    const text = items.map(i => i.title).join(' \n ');
    const out = [];
    for (const r of RULES) { if (r.re.test(text)) out.push({ name: r.name, why: r[track] || r.day, lesson: r.lesson }); if (out.length >= 2) break; }
    if (!out.length) out.push({ name: 'How to read news', why: 'Ask yourself: does this change what people expect? Surprises move prices; news everyone expected usually doesn\'t.', lesson: 'u5l1' });
    return out;
  }

  const STOP = new Set('what whats what\'s is are the a an of on in to for and or me tell about news latest new today any happening going with how why who give show please there this that than do does did i you it its from at by up be been was were will can could should about'.split(' '));
  function keywords(t) {
    return t.toLowerCase().replace(/[?!.,"'’]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && !/^(חדשות|מה|על|יש|קורה|תספר|לי|את|של|עם|היום)$/.test(w)).slice(0, 5).join(' ');
  }

  // Figure out what they asked for, fetch it, and build the answer.
  async function answer(text, track) {
    const t = String(text || '').trim();
    const he = hasHebrew(t);
    const isIsrael = /israel|tel aviv|tase|ישראל|בורסה|תל אביב|אקטואליה|בארץ|ת"א/i.test(t);
    const isCrypto = /crypto|bitcoin|btc|ethereum|ביטקוין|קריפטו/i.test(t);
    const general = !t || /^(.*(top|today|happening|market|news|moved|moving|update|headlines|מה קורה|חדשות|עדכונים).*)$/i.test(t) && keywords(t).replace(/\b(market|markets|stock|stocks|moved|moving|top|headlines|update|updates|trading|day|swing|investing|course|my)\b/g, '').trim() === '';
    let items = [], title = '', topic = track;
    if (isIsrael) {
      title = '🇮🇱 Israeli markets & current events';
      try { items = await feed(gnews('בורסה OR מניות OR "תל אביב 35" when:2d', true)); } catch (e) { items = []; }
      if (items.length < 4) { try { items = items.concat(await feed(GLOBES)); } catch (e) { } }
    } else if (isCrypto && general) {
      topic = 'crypto'; title = '₿ Crypto news';
      items = await feed(gnews(TOPICS.crypto.q));
    } else if (general) {
      title = `🔥 Today's news for ${TOPICS[track] ? TOPICS[track].label : 'you'}`;
      items = await feed(gnews((TOPICS[track] || TOPICS.day).q));
    } else {
      const k = keywords(t) || t;
      title = `🔎 News about "${k}"`;
      items = await feed(gnews(k + ' when:7d', he));
    }
    items = tidy(items, 6);
    return { title, items, notes: items.length ? explain(items, track) : [], topic };
  }

  let NEWS = null, loading = null;
  function load(force) {
    if (NEWS && !force && Date.now() - NEWS._at < 10 * 60000) return Promise.resolve(NEWS);
    if (loading) return loading;
    loading = fetch('news.json?v=' + Math.floor(Date.now() / 600000), { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('no news file'); return r.json(); })
      .then(d => { d._at = Date.now(); NEWS = d; try { localStorage.setItem('mtb:v1:news', JSON.stringify(d)); } catch (e) { } return d; })
      .catch(e => { try { const c = JSON.parse(localStorage.getItem('mtb:v1:news') || 'null'); if (c) { NEWS = c; return c; } } catch (x) { } throw e; })
      .finally(() => { loading = null; });
    return loading;
  }
  const allItems = d => [].concat(...d.topics.map(t => t.items.map(i => Object.assign({ topic: t.id }, i))));
  // Search the saved headlines first; only go online if nothing matches.
  async function search(text) {
    const d = await load();
    const words = keywords(text).split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];
    const hits = allItems(d).map(i => ({ i, n: words.filter(w => i.title.toLowerCase().includes(w)).length })).filter(x => x.n).sort((a, b) => b.n - a.n || (b.i.date || 0) - (a.i.date || 0)).map(x => x.i);
    if (hits.length) return hits.slice(0, 6);
    try { return tidy(await feed(gnews(keywords(text) + ' when:7d', hasHebrew(text))), 6); } catch (e) { return []; }
  }
  // Topics ordered for this course: the ones made for it first.
  async function topicsFor(track) {
    const d = await load();
    const mine = d.topics.filter(t => t.tracks.includes(track)), rest = d.topics.filter(t => !t.tracks.includes(track));
    return { updated: d.updated, topics: mine.concat(rest).filter(t => t.items.length) };
  }
  function find(title) { if (!NEWS) return null; return allItems(NEWS).find(i => i.title === title) || null; }

  window.TQ_NewsBot = { answer, explain, load, search, topicsFor, find, TOPICS };
})();
