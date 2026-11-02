/* My Trading Bro – course content.
 * Card types:
 *   learn  {t,title,html,chart?}
 *   mcq    {t,q,opts,a,why,chart?}
 *   tf     {t,q,a,why}
 *   num    {t,q,a,tol,suffix,why}
 * chart = {pattern, seed?, marks?}  (see charts.js PATTERNS)
 */
window.TQ_COURSE = [
  /* ───────────────────────── UNIT 0 ───────────────────────── */
  {
    id: 'u0', title: 'Start Here', subtitle: 'The truth about day trading', color: '#58cc02', icon: '🚀',
    lessons: [
      {
        id: 'u0l1', title: 'What is day trading?', icon: '📈', xp: 15,
        cards: [
          { t: 'learn', title: 'Day trading in one sentence', html: `
            <p><b>Day trading</b> means buying and selling a financial instrument (a stock, an ETF, a futures contract…) <b>within the same day</b>, and closing every position before the market closes.</p>
            <p>A day trader is not betting on whether a company is good. They're trying to profit from <b>short-term price moves</b> that last minutes or hours.</p>
            <div class="callout">🧠 Think of it as a skill game, like poker or chess. Over many rounds the player with a small, real <b>edge</b> and strict discipline wins. Everyone else slowly pays the house.</div>` },
          { t: 'learn', title: 'Trading vs. investing', html: `
            <table class="tbl"><tr><th></th><th>Investing</th><th>Day trading</th></tr>
            <tr><td>Holding time</td><td>Years</td><td>Minutes to hours</td></tr>
            <tr><td>Goal</td><td>Own growing businesses</td><td>Capture short moves</td></tr>
            <tr><td>Time needed</td><td>A few hours a year</td><td>Hours every day</td></tr>
            <tr><td>Costs</td><td>Very low</td><td>High (spreads, commissions, mistakes)</td></tr>
            <tr><td>Success rate</td><td>Most long-term index investors make money</td><td>Most day traders lose money</td></tr></table>
            <p>Both are legit. Professional traders usually <b>also</b> invest long-term. They're different tools.</p>` },
          { t: 'mcq', q: 'You buy a stock at 10:15 and sell it at 14:40 the same day. What did you do?', opts: ['Long-term investing', 'Day trading', 'Swing trading (days to weeks)', 'Market making'], a: 1, why: 'Opened and closed within the same session → day trade.' },
          { t: 'tf', q: 'A day trader usually holds positions overnight to catch the next day\'s gap.', a: false, why: 'Holding overnight is swing trading. Day traders end the day "flat" (no open positions), which also protects them from overnight news risk.' },
          { t: 'mcq', q: 'What is an "edge"?', opts: ['A hot stock tip', 'A repeatable advantage that makes your average trade profitable after costs', 'Trading with leverage', 'Having fast internet'], a: 1, why: 'An edge is statistical: over many trades, your average result is positive after all costs. Without an edge, more trading = more losses.' },
        ]
      },
      {
        id: 'u0l2', title: 'The scoreboard', icon: '📊', xp: 20,
        cards: [
          { t: 'learn', title: 'What the research says', html: `
            <p>Researchers have studied millions of real broker accounts. The results are brutal, and you should know them before you start:</p>
            <ul>
              <li>🇧🇷 <b>Brazil (Chague, De-Losso & Giovannetti, 2019):</b> of people who day-traded mini-index futures for 300+ days, about <b>97% lost money</b>. Only ~1% earned more than minimum wage.</li>
              <li>🇹🇼 <b>Taiwan (Barber, Lee, Liu & Odean):</b> 14 years of data on <i>every</i> day trader in Taiwan. Most lose. <b>Less than 1%</b> were predictably profitable year after year.</li>
              <li>🇺🇸 <b>USA (Barber & Odean, 2000), "Trading Is Hazardous to Your Wealth":</b> the most active traders earned ~11.4%/yr while the market made ~17.9%. Costs and overconfidence ate the difference.</li>
            </ul>`},
          { t: 'learn', title: 'So why learn it at all?', html: `
            <p>Because the <b>1% who do succeed</b> share the same habits, and those habits can be learned:</p>
            <ol><li><b>Risk management</b> – tiny, fixed losses</li><li><b>A tested strategy</b> with a measured edge</li><li><b>Discipline & journaling</b></li><li><b>Patience</b> – practicing for months before real money</li></ol>
            <div class="callout good">🎮 You two have an unfair advantage: you're starting at 16–17. You can practice for <b>more than a year</b> in the simulator before you're legally able to trade real money. Most people skip this step and pay for it.</div>`},
          { t: 'mcq', q: 'In the big Brazil study, roughly what share of persistent day traders lost money?', opts: ['About 30%', 'About 50%', 'About 75%', 'About 97%'], a: 3, why: '~97% of those who persisted for 300+ days lost money. That\'s why this course is built around risk control and practice first.' },
          { t: 'mcq', q: 'Barber & Odean found that the most active traders underperformed mainly because of…', opts: ['Bad luck', 'Trading costs and overconfidence', 'Government taxes only', 'Slow computers'], a: 1, why: 'Every trade costs money (spread, commission, slippage). Overconfident people trade too much, and the costs pile up.' },
          { t: 'tf', q: 'If most traders lose, the right move is to practice with fake money until your stats prove you have an edge.', a: true, why: 'Exactly. In this app your Arena stats (expectancy, win rate, average R) are your proof.' },
        ]
      },
      {
        id: 'u0l3', title: 'How this app works', icon: '🎮', xp: 10,
        cards: [
          { t: 'learn', title: 'Your path', html: `
            <p>1. <b>Lessons</b> (this!) – short cards and quizzes. Earn XP, keep your streak 🔥.</p>
            <p>2. <b>Arena</b> – a chart simulator. Trade realistic market days with virtual money. Every trade is scored in <b>R</b> (you'll learn this soon).</p>
            <p>3. <b>Coach</b> – ask questions any time.</p>
            <p>4. <b>News</b> – learn how real events (earnings, IPOs, bankruptcies, interest rates) move markets.</p>`},
          { t: 'learn', title: 'The 3 golden rules (we\'ll enforce them)', html: `
            <div class="rule">🛑 <b>1. Every trade has a stop-loss.</b> The Arena won't even let you enter without one.</div>
            <div class="rule">🎯 <b>2. Risk a tiny, fixed % per trade</b> (usually 0.5–1% of the account).</div>
            <div class="rule">📓 <b>3. Journal every trade.</b> Your data is your teacher.</div>`},
          { t: 'mcq', q: 'Which is NOT one of our golden rules?', opts: ['Always use a stop-loss', 'Risk a small fixed % per trade', 'Double your size after a loss to win it back', 'Journal every trade'], a: 2, why: 'Doubling after losses ("martingale") is how accounts blow up. It\'s the opposite of our rules.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 1 ───────────────────────── */
  {
    id: 'u1', title: 'Market Mechanics', subtitle: 'How the machine actually works', color: '#1cb0f6', icon: '⚙️',
    lessons: [
      {
        id: 'u1l1', title: 'Stocks, exchanges & indices', icon: '🏛️', xp: 15,
        cards: [
          { t: 'learn', title: 'The basics', html: `
            <p>A <b>stock (share)</b> is a tiny piece of ownership in a company. Shares trade on <b>exchanges</b>:</p>
            <ul><li>🇺🇸 <b>NYSE</b> and <b>Nasdaq</b> – the biggest in the world, where most day trading happens.</li>
            <li>🇮🇱 <b>TASE</b> (Tel Aviv Stock Exchange) – Israel's exchange. Since Jan 2026 it trades <b>Monday–Friday</b>.</li></ul>
            <p>An <b>index</b> tracks a group of stocks: <b>S&P 500</b> (500 large US companies), <b>Nasdaq-100</b> (big tech-heavy), <b>TA-35 / TA-125</b> (Israel's largest).</p>
            <p>An <b>ETF</b> is a fund that trades like a stock. <b>SPY</b> tracks the S&P 500, <b>QQQ</b> the Nasdaq-100. They are among the most traded instruments on earth.</p>`},
          { t: 'mcq', q: 'What does the ticker QQQ track?', opts: ['The TA-35', 'Gold', 'The Nasdaq-100', 'US government bonds'], a: 2, why: 'QQQ (Invesco QQQ Trust) tracks the Nasdaq-100.' },
          { t: 'mcq', q: 'Since January 2026, the Tel Aviv Stock Exchange trades on…', opts: ['Sunday–Thursday', 'Monday–Friday', 'Every day', 'Monday–Thursday only'], a: 1, why: 'TASE moved from Sunday–Thursday to Monday–Friday on January 5, 2026, to align with global markets. Friday is a shorter session.' },
          { t: 'tf', q: 'Owning one share of a company means you own a (tiny) part of that company.', a: true, why: 'Yes. A share is a fractional ownership unit.' },
        ]
      },
      {
        id: 'u1l2', title: 'Bid, ask & spread', icon: '↔️', xp: 15,
        cards: [
          { t: 'learn', title: 'Every price has two sides', html: `
            <p><b>Bid</b> = the highest price someone is willing to <b>pay</b> right now.<br><b>Ask</b> (offer) = the lowest price someone is willing to <b>sell</b> at.</p>
            <p>The gap between them is the <b>spread</b>. If you buy at the ask and instantly sell at the bid, you lose the spread. It's a hidden cost on every trade.</p>
            <div class="quote-box"><span class="bid">Bid 99.98</span><span class="ask">Ask 100.02</span></div>
            <p>Spread here = 0.04 per share. On 500 shares, that's $20 just to get in and out.</p>`},
          { t: 'learn', title: 'Liquidity = your best friend', html: `
            <p><b>Liquid</b> stocks (huge volume, like AAPL, SPY, NVDA) have tiny spreads, often $0.01. <b>Illiquid</b> stocks (small, rarely traded) have wide spreads and can "jump" past your stop.</p>
            <p>Pro day traders stick to liquid names: usually <b>1M+ shares traded per day</b> and price above ~$5.</p>`},
          { t: 'num', q: 'Bid = 24.90, Ask = 25.00. What is the spread in dollars?', a: 0.10, tol: 0.001, suffix: '$', why: '25.00 − 24.90 = $0.10.' },
          { t: 'mcq', q: 'You place a market BUY order. At what price will you most likely be filled?', opts: ['The bid', 'The ask', 'The middle', 'Yesterday\'s close'], a: 1, why: 'A market buy takes the best available offer, the ask.' },
          { t: 'tf', q: 'Penny stocks with tiny volume are ideal for beginners because they move a lot.', a: false, why: 'They move a lot partly because they\'re illiquid and easy to manipulate. Wide spreads and pump-and-dumps make them a classic beginner trap.' },
        ]
      },
      {
        id: 'u1l3', title: 'Order types', icon: '🧾', xp: 20,
        cards: [
          { t: 'learn', title: 'Your toolbox', html: `
            <ul>
            <li><b>Market order</b> – fill me NOW at the best available price. Fast, but you might get a worse price (<b>slippage</b>).</li>
            <li><b>Limit order</b> – fill me only at <b>this price or better</b>. Price control, but it might never fill.</li>
            <li><b>Stop order (stop-loss)</b> – becomes a market order once price touches a level. Used to <b>exit losers automatically</b>.</li>
            <li><b>Stop-limit</b> – becomes a limit order at the trigger. Careful: in a fast drop it may not fill at all.</li>
            <li><b>Bracket order (OCO)</b> – entry + stop-loss + profit target in one. When one exit fills, the other cancels.</li>
            </ul>`},
          { t: 'mcq', q: 'You want to buy only if you can get $50.00 or lower. Which order?', opts: ['Market', 'Limit buy at 50.00', 'Stop buy at 50.00', 'Sell stop'], a: 1, why: 'A buy limit fills at the limit price or lower.' },
          { t: 'mcq', q: 'You\'re long from $30. You want to get out automatically if price falls to $29.40. Which order?', opts: ['Sell limit at 29.40', 'Sell stop at 29.40', 'Buy stop at 29.40', 'Market buy'], a: 1, why: 'A sell stop below the market triggers if price falls to it. That\'s your stop-loss.' },
          { t: 'tf', q: 'A bracket order lets you set entry, stop-loss and target at the same time.', a: true, why: 'Yes, and it\'s the best way to enforce discipline: your exits are decided before emotions show up.' },
          { t: 'mcq', q: 'What is slippage?', opts: ['The fee your broker charges', 'Getting filled at a worse price than expected', 'A chart pattern', 'Tax on profits'], a: 1, why: 'In fast markets, a market or stop order can fill several cents (or more) away from where you expected.' },
        ]
      },
      {
        id: 'u1l4', title: 'Long, short & leverage', icon: '⚖️', xp: 20,
        cards: [
          { t: 'learn', title: 'Two directions', html: `
            <p><b>Long</b> = buy first, sell later. You profit if price goes <b>up</b>.</p>
            <p><b>Short</b> = borrow shares, sell them now, buy them back later. You profit if price goes <b>down</b>. Risk: price can rise without limit, so a short with no stop can lose more than you put in.</p>`},
          { t: 'learn', title: 'Leverage: a double-edged sword', html: `
            <p><b>Margin / leverage</b> lets you trade more than your cash. 4× leverage turns a 2% move into an 8% gain… or an 8% loss.</p>
            <p>Leverage doesn't create an edge. It multiplies whatever you already have, <b>including your mistakes</b>. Products marketed with crazy leverage (some CFDs, forex at 1:100+) are where many beginners lose fastest.</p>
            <div class="callout">🇺🇸 US stock trades now settle <b>T+1</b> (one business day after the trade, since May 2024).</div>`},
          { t: 'mcq', q: 'You short a stock at $40 and buy it back at $37. Per share you…', opts: ['Lost $3', 'Made $3', 'Broke even', 'Made $37'], a: 1, why: 'Sold high (40), bought back lower (37) → +$3 per share.' },
          { t: 'num', q: 'With 5× leverage, the stock moves 3% against you. What % of your own money did you lose?', a: 15, tol: 0.01, suffix: '%', why: '3% × 5 = 15%. Leverage multiplies losses exactly like gains.' },
          { t: 'tf', q: 'A short position\'s maximum possible loss is limited to what you invested.', a: false, why: 'A stock can keep rising, so an unprotected short has theoretically unlimited risk. Always use a stop.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 2 ───────────────────────── */
  {
    id: 'u2', title: 'Reading Charts', subtitle: 'Speak the language of price', color: '#ce82ff', icon: '🕯️',
    lessons: [
      {
        id: 'u2l1', title: 'Candlesticks 101', icon: '🕯️', xp: 15,
        cards: [
          { t: 'learn', title: 'Anatomy of a candle', html: `
            <p>Each candle shows 4 prices for one time period (1 min, 5 min, 1 day…): <b>Open, High, Low, Close (OHLC)</b>.</p>
            <ul><li>🟩 <b>Green</b> = closed <b>higher</b> than it opened</li><li>🟥 <b>Red</b> = closed <b>lower</b> than it opened</li>
            <li>The thick part is the <b>body</b> (open→close). The thin lines are <b>wicks</b>, showing how far price traveled and got rejected.</li></ul>`, chart: { pattern: 'anatomy' } },
          { t: 'learn', title: 'Timeframes', html: `
            <p>Day traders usually watch the <b>5-minute</b> chart to trade, the <b>1-minute</b> to fine-tune entries, and the <b>daily</b> chart for the big picture (key levels, trend).</p>
            <p>Rule: <b>the higher timeframe wins</b>. A tiny bullish pattern on the 1-min chart means little if the daily is crashing into resistance.</p>`},
          { t: 'mcq', q: 'A candle opens at 50, goes to 52, drops to 49, closes at 51. Its color and wicks?', opts: ['Red, no wicks', 'Green, with upper and lower wicks', 'Green, no wicks', 'Red, long lower wick only'], a: 1, why: 'Close (51) > Open (50) → green. High 52 above the body and low 49 below → both wicks.' },
          { t: 'tf', q: 'A long upper wick means buyers pushed price up but sellers pushed it back down.', a: true, why: 'Long wicks = rejection. Upper wick = price got rejected from higher levels.' },
        ]
      },
      {
        id: 'u2l2', title: 'Candle patterns', icon: '🔨', xp: 20,
        cards: [
          { t: 'learn', title: 'Three patterns worth knowing', html: `
            <p><b>🔨 Hammer</b> – small body, long lower wick. Sellers pushed down hard, buyers took it all back. Possible bounce, especially at support.</p>
            <p><b>🟩 Bullish engulfing</b> – a green body completely "swallows" the previous red body. Momentum flipped.</p>
            <p><b>➕ Doji</b> – open ≈ close. Indecision.</p>
            <div class="callout">⚠️ Honest truth: candle patterns <b>alone</b> have weak predictive power in research. They only matter <b>at a key level, with volume, in the right context</b>.</div>`, chart: { pattern: 'patterns' } },
          { t: 'mcq', q: 'Which candle is this?', chart: { pattern: 'hammer' }, opts: ['Doji', 'Hammer', 'Bearish engulfing', 'Shooting star'], a: 1, why: 'Small body near the top, long lower wick after a down move = hammer.' },
          { t: 'mcq', q: 'What does the last candle show?', chart: { pattern: 'engulf' }, opts: ['Bullish engulfing', 'Doji', 'Hammer', 'Gap down'], a: 0, why: 'A big green body that completely covers the previous red body = bullish engulfing.' },
          { t: 'tf', q: 'A hammer in the middle of nowhere (no support, no volume) is a strong buy signal.', a: false, why: 'Context is everything. Patterns matter at levels, with volume confirmation.' },
        ]
      },
      {
        id: 'u2l3', title: 'Trends & ranges', icon: '🧗', xp: 20,
        cards: [
          { t: 'learn', title: 'Market structure', html: `
            <p><b>Uptrend</b> = higher highs + higher lows (HH/HL). <b>Downtrend</b> = lower highs + lower lows (LH/LL). <b>Range</b> = price bouncing between a ceiling and a floor.</p>
            <p>The classic advice "<b>the trend is your friend</b>" has real research behind it: <b>momentum</b> is one of the most studied effects in finance. Trading <i>with</i> the trend is generally easier than catching tops and bottoms.</p>`, chart: { pattern: 'uptrend' } },
          { t: 'mcq', q: 'What is this market doing?', chart: { pattern: 'downtrend' }, opts: ['Uptrend', 'Downtrend', 'Range', 'Can\'t tell'], a: 1, why: 'Lower highs and lower lows → downtrend.' },
          { t: 'mcq', q: 'And this one?', chart: { pattern: 'range' }, opts: ['Uptrend', 'Downtrend', 'Range / chop', 'Breakout'], a: 2, why: 'Price keeps bouncing between the same high and low → range. Breakout strategies get chopped up here.' },
          { t: 'tf', q: 'In an uptrend, buying pullbacks to a higher low is generally a with-trend trade.', a: true, why: 'Buying a pullback in an uptrend = trading with the trend, often with a clear stop under the higher low.' },
        ]
      },
      {
        id: 'u2l4', title: 'Volume tells the truth', icon: '🔊', xp: 15,
        cards: [
          { t: 'learn', title: 'Volume & relative volume', html: `
            <p><b>Volume</b> = how many shares traded. Price moves on high volume are more "real" (big players are involved). Moves on low volume are easier to reverse.</p>
            <p><b>Relative volume (RVOL)</b> = today's volume ÷ the usual volume for this time of day. RVOL 3 = three times normal. Stocks with very high RVOL are called <b>"Stocks in Play"</b>. Something is happening (news, earnings), and research shows these are where day-trading strategies work best.</p>`, chart: { pattern: 'breakout-volume' } },
          { t: 'num', q: 'A stock usually trades 2M shares a day. Today it already traded 7M. What is its RVOL?', a: 3.5, tol: 0.01, suffix: '×', why: '7M ÷ 2M = 3.5× relative volume. It\'s "in play".' },
          { t: 'tf', q: 'A breakout on very low volume is more trustworthy than one on high volume.', a: false, why: 'Usually the opposite. High volume shows real participation.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 3 ───────────────────────── */
  {
    id: 'u3', title: 'Levels & Indicators', subtitle: 'Where professionals act', color: '#ff9600', icon: '📐',
    lessons: [
      {
        id: 'u3l1', title: 'Support & resistance', icon: '🧱', xp: 20,
        cards: [
          { t: 'learn', title: 'Levels that matter intraday', html: `
            <p><b>Support</b> = a price where buyers stepped in before. <b>Resistance</b> = where sellers did. Day traders mark these every morning:</p>
            <ul><li><b>Previous day high / low / close (PDH / PDL / PDC)</b></li><li><b>Pre-market high / low</b></li><li><b>Opening range high / low</b> (first 5–30 min)</li><li><b>Round numbers</b> ($50, $100)</li></ul>
            <p>Once resistance breaks, it often becomes support (<b>"role reversal"</b>).</p>`, chart: { pattern: 'sr' } },
          { t: 'mcq', q: 'Price breaks above yesterday\'s high at $82, then pulls back to $82 and holds. What happened?', opts: ['Resistance became support', 'Support became resistance', 'A doji', 'Nothing important'], a: 0, why: 'Old resistance (82) is now acting as support: role reversal. A classic entry spot with a stop just below.' },
          { t: 'tf', q: 'Levels are exact lines. Price must touch them to the cent.', a: false, why: 'Levels are zones. Expect some noise around them.' },
        ]
      },
      {
        id: 'u3l2', title: 'VWAP – the pro benchmark', icon: '〰️', xp: 20,
        cards: [
          { t: 'learn', title: 'Volume-Weighted Average Price', html: `
            <p><b>VWAP</b> = the average price paid today, weighted by volume. It resets every morning.</p>
            <p>Why it matters: big institutions are graded on whether they bought <b>below</b> VWAP or sold <b>above</b> it, so they really do act around it.</p>
            <ul><li>Price <b>above</b> VWAP → buyers in control. Favor longs.</li><li>Price <b>below</b> VWAP → sellers in control. Favor shorts.</li><li>Pullbacks to VWAP in a trend are popular entries.</li></ul>`, chart: { pattern: 'vwap-bounce' } },
          { t: 'mcq', q: 'The stock is trending up and pulls back to VWAP, where buyers step in. This is often called…', chart: { pattern: 'vwap-bounce' }, opts: ['A VWAP rejection short', 'A VWAP bounce / pullback long', 'A gap fill', 'A doji'], a: 1, why: 'Trend up + hold at VWAP = classic VWAP pullback long, with a stop below VWAP / the pullback low.' },
          { t: 'mcq', q: 'Price spends all morning below VWAP and fails every time it touches it. Bias?', chart: { pattern: 'vwap-reject' }, opts: ['Bullish', 'Bearish', 'Neutral', 'Can\'t trade'], a: 1, why: 'Repeated failures at VWAP from below = sellers in control.' },
          { t: 'tf', q: 'VWAP resets every trading day.', a: true, why: 'Standard VWAP is an intraday measure starting at the open.' },
        ]
      },
      {
        id: 'u3l3', title: 'Moving averages & ATR', icon: '📏', xp: 20,
        cards: [
          { t: 'learn', title: 'Moving averages', html: `
            <p>A moving average smooths price. Popular intraday ones: <b>9 EMA</b> and <b>20 EMA</b> (exponential, reacts fast). On the daily chart: <b>50</b> and <b>200 SMA</b>.</p>
            <p>Use them to read the trend (price above a rising 20 EMA = healthy uptrend), not as magic buy/sell lines.</p>`},
          { t: 'learn', title: 'ATR – how much does it usually move?', html: `
            <p><b>Average True Range (ATR)</b> = the average size of a day's (or a candle's) move. If a stock's 14-day ATR is $2, a $6 stop is huge and a $0.05 stop is just noise.</p>
            <p>The pros size their stops by volatility. The well-known ORB study we'll cover used a stop of <b>10% of the 14-day ATR</b>.</p>`},
          { t: 'num', q: 'A stock\'s 14-day ATR is $4.00. What is 10% of ATR (a typical tight stop distance)?', a: 0.4, tol: 0.001, suffix: '$', why: '10% × $4.00 = $0.40.' },
          { t: 'mcq', q: 'What does a high ATR tell you?', opts: ['The stock is cheap', 'The stock moves a lot, so wider stops and smaller size are needed', 'The trend is up', 'Volume is low'], a: 1, why: 'Volatile = wider stops, which means smaller position size for the same risk.' },
        ]
      },
      {
        id: 'u3l4', title: 'The indicator trap', icon: '🪤', xp: 15,
        cards: [
          { t: 'learn', title: 'Less is more', html: `
            <p>RSI, MACD, Stochastics, Bollinger Bands… beginners stack 8 indicators and feel "scientific". But most indicators are just <b>math on past price</b>. They <b>lag</b>, and they all say the same thing.</p>
            <p>What pros watch most: <b>price, volume, key levels, VWAP</b>, plus the news catalyst. Add an indicator only if your <b>own tested data</b> shows it improves results.</p>`},
          { t: 'tf', q: 'Adding more indicators always improves a strategy.', a: false, why: 'More indicators = more conflicting signals and "curve fitting". Simple, tested rules beat complex untested ones.' },
          { t: 'mcq', q: 'Which of these is NOT derived only from past price?', opts: ['RSI', 'MACD', 'Moving average', 'A news catalyst like an earnings surprise'], a: 3, why: 'News is new information. Indicators just transform price history.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 4 ───────────────────────── */
  {
    id: 'u4', title: 'Risk Management', subtitle: '⭐ The unit that matters most', color: '#ff4b4b', icon: '🛡️',
    lessons: [
      {
        id: 'u4l1', title: 'The 1% rule & position sizing', icon: '🧮', xp: 25,
        cards: [
          { t: 'learn', title: 'Survive first', html: `
            <p>Professional traders decide <b>how much they're willing to lose</b> before thinking about profit. The common rule: risk <b>0.5%–1% of your account per trade</b>.</p>
            <p>At 1% risk, 10 losses in a row (it happens!) = about −10%. Annoying, but you survive. At 10% risk, the same streak wipes out ~65% of the account.</p>`},
          { t: 'learn', title: 'The position-size formula', html: `
            <div class="formula">Shares = (Account × Risk%) ÷ (Entry − Stop)</div>
            <p>Example: $10,000 account, risk 1% = <b>$100</b>. Entry $50.00, stop $49.50 → risk per share $0.50.<br>Shares = 100 ÷ 0.50 = <b>200 shares</b>.</p>
            <p>Notice: <b>the stop decides the size</b>, not your feelings. Wider stop → fewer shares.</p>`},
          { t: 'num', q: 'Account $20,000, risk 0.5%, entry $80.00, stop $79.00. How many shares?', a: 100, tol: 0.5, suffix: 'shares', why: '$20,000 × 0.5% = $100. Risk/share = $1.00. 100 ÷ 1 = 100 shares.' },
          { t: 'num', q: 'Account $10,000, risk 1%, entry $25.00, stop $24.75. How many shares?', a: 400, tol: 0.5, suffix: 'shares', why: '$100 ÷ $0.25 = 400 shares.' },
          { t: 'mcq', q: 'You want to buy but the logical stop is far away. What should you do?', opts: ['Move the stop closer so you can buy more', 'Buy the same size anyway', 'Reduce your share size so the dollar risk stays the same', 'Skip the stop'], a: 2, why: 'Keep dollar risk fixed. A wider stop just means fewer shares (or skipping the trade).' },
        ]
      },
      {
        id: 'u4l2', title: 'R-multiples & expectancy', icon: '🎯', xp: 25,
        cards: [
          { t: 'learn', title: 'Think in R', html: `
            <p><b>1R</b> = the amount you risked on a trade. If you risk $100 and make $250, you made <b>+2.5R</b>. If you get stopped out, <b>−1R</b>.</p>
            <p>R lets you compare trades fairly, whatever the account size. In the Arena every trade is scored in R.</p>`},
          { t: 'learn', title: 'Expectancy: the only number that matters', html: `
            <div class="formula">Expectancy = (Win% × Avg Win R) − (Loss% × Avg Loss R)</div>
            <p>Example: you win 40% of trades at +2.5R and lose 60% at −1R:<br>0.4 × 2.5 − 0.6 × 1 = 1.0 − 0.6 = <b>+0.4R per trade</b>.</p>
            <p>Positive expectancy (after costs!) = an edge. Over 100 trades risking $100 each, that's about +$4,000.</p>`},
          { t: 'num', q: 'Win rate 50%, average win +1.5R, average loss −1R. Expectancy per trade (in R)?', a: 0.25, tol: 0.001, suffix: 'R', why: '0.5×1.5 − 0.5×1 = 0.75 − 0.5 = +0.25R.' },
          { t: 'num', q: 'Win rate 70%, avg win +0.5R, avg loss −1.5R. Expectancy?', a: -0.1, tol: 0.001, suffix: 'R', why: '0.7×0.5 − 0.3×1.5 = 0.35 − 0.45 = −0.10R. A high win rate can still lose money!' },
          { t: 'tf', q: 'A strategy that wins 70% of the time is always profitable.', a: false, why: 'Win rate means nothing without the size of wins vs. losses. See the previous question.' },
        ]
      },
      {
        id: 'u4l3', title: 'Reward:risk & breakeven', icon: '⚖️', xp: 20,
        cards: [
          { t: 'learn', title: 'How often do you need to win?', html: `
            <div class="formula">Breakeven win rate = 1 ÷ (1 + Reward:Risk)</div>
            <table class="tbl"><tr><th>Reward:Risk</th><th>Need to win</th></tr><tr><td>1:1</td><td>50%</td></tr><tr><td>2:1</td><td>33%</td></tr><tr><td>3:1</td><td>25%</td></tr></table>
            <p>Bigger targets let you be wrong more often, but they hit less often. There's no free lunch. What matters is the <b>measured</b> combination.</p>`},
          { t: 'num', q: 'Your average win is 2R and average loss is 1R. Breakeven win rate (in %)?', a: 33.33, tol: 0.5, suffix: '%', why: '1 ÷ (1+2) = 33.3%.' },
          { t: 'mcq', q: 'Which trade setup is better, everything else equal?', opts: ['Risk $1 to make $0.50', 'Risk $1 to make $2', 'Risk $2 to make $1', 'They\'re identical'], a: 1, why: '2:1 reward:risk needs only ~33% wins to break even.' },
        ]
      },
      {
        id: 'u4l4', title: 'Daily loss limit & drawdowns', icon: '🧯', xp: 20,
        cards: [
          { t: 'learn', title: 'The math of losing', html: `
            <table class="tbl"><tr><th>If you lose</th><th>You need to gain</th></tr><tr><td>10%</td><td>11%</td></tr><tr><td>25%</td><td>33%</td></tr><tr><td>50%</td><td><b>100%</b></td></tr><tr><td>75%</td><td><b>300%</b></td></tr></table>
            <p>That's why pros set a <b>daily max loss</b> (often −2R to −3R, or ~2–3% of the account). Hit it → shut down for the day. No exceptions. Prop trading firms enforce this on their traders.</p>`},
          { t: 'num', q: 'Your account drops from $10,000 to $6,000. What % gain do you need to get back to $10,000?', a: 66.67, tol: 0.5, suffix: '%', why: 'You need +$4,000 on $6,000 = 66.7%. Losses hurt more than gains help.' },
          { t: 'tf', q: 'After hitting your daily max loss, you should take one more trade to make it back.', a: false, why: 'That\'s "revenge trading", the #1 account killer. Stop, review, come back tomorrow.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 5 ───────────────────────── */
  {
    id: 'u5', title: 'Strategies with Evidence', subtitle: 'What actually has data behind it', color: '#2b70c9', icon: '🧪',
    lessons: [
      {
        id: 'u5l1', title: 'Stocks in Play', icon: '🔥', xp: 20,
        cards: [
          { t: 'learn', title: 'Trade where the action is', html: `
            <p>Most stocks on most days move randomly. A day trader's first job is <b>picking the right stock</b>: one where something real is happening.</p>
            <p><b>Stocks in Play</b> usually have:</p>
            <ul><li>A <b>catalyst</b>: earnings, FDA decision, acquisition, guidance change, big contract, analyst up/downgrade</li><li>A <b>gap</b>: opening well above/below yesterday's close</li><li><b>High relative volume</b> (RVOL ≥ 2–3×)</li><li>Enough <b>liquidity</b> (tight spreads)</li></ul>
            <p>Research by Zarattini, Barbon & Aziz (2024) found their opening-range strategy did far better when restricted to Stocks in Play than on random stocks.</p>`},
          { t: 'mcq', q: 'Which stock is most "in play" today?', opts: ['A stock up 0.3% on normal volume', 'A stock gapping +9% on earnings with 5× relative volume', 'A stock that hasn\'t traded in 3 days', 'A stock near its 200-day average'], a: 1, why: 'Catalyst + gap + high RVOL = in play.' },
          { t: 'tf', q: 'Scanning the whole market every morning for catalysts and volume is part of the job.', a: true, why: 'Pros spend the pre-market building a watchlist. Many use scanners (gap scanners, RVOL scanners).' },
        ]
      },
      {
        id: 'u5l2', title: 'Opening Range Breakout (ORB)', icon: '🚪', xp: 30,
        cards: [
          { t: 'learn', title: 'One of the most studied day-trading setups', html: `
            <p>The first minutes after the 9:30 ET open (16:30 Israel time) set the <b>opening range (OR)</b>: the high and low of the first 5, 15 or 30 minutes.</p>
            <p><b>Rule (simplified, from Zarattini & Aziz research):</b></p>
            <ol><li>Take the first <b>5-minute</b> candle.</li><li>If it closed green → go <b>long</b> when price breaks above its high. If red → go <b>short</b> below its low.</li><li>Stop-loss: the other side of the range (or ~10% of ATR).</li><li>Exit at the end of the day if the stop isn't hit.</li></ol>`, chart: { pattern: 'orb-up' } },
          { t: 'learn', title: 'What the research found, honestly', html: `
            <p>📄 <i>"Can Day Trading Really Be Profitable?"</i> (Zarattini & Aziz, 2023) tested a 5-min ORB on QQQ from 2016–2023, and a 2024 follow-up on Stocks in Play reported strong backtested results <b>after estimated costs</b>.</p>
            <p>⚠️ But: these are <b>backtests</b> (simulations on past data). Independent replications on index CFDs found much of the edge disappeared after real costs. Edges also fade once many people use them.</p>
            <div class="callout">✅ The lesson isn't "ORB = free money". It's: <b>simple, rule-based, testable</b> strategies on <b>in-play</b> stocks with <b>strict risk</b> are where real evidence exists.</div>`},
          { t: 'mcq', q: 'The first 5-min candle of the day is green, high $101.20, low $100.40. ORB rule says…', chart: { pattern: 'orb-up' }, opts: ['Short below 100.40', 'Buy above 101.20, stop near 100.40', 'Buy at the open immediately', 'Do nothing ever'], a: 1, why: 'Green first candle → long on a break of its high, stop at the other side of the range.' },
          { t: 'mcq', q: 'What happened here?', chart: { pattern: 'orb-fake' }, opts: ['Perfect breakout to the moon', 'A failed breakout (fakeout) that hit the stop', 'Gap up', 'A doji'], a: 1, why: 'Price broke the range, then reversed. Fakeouts are normal, and that\'s why the stop and small size exist.' },
          { t: 'tf', q: 'A strategy that worked in a backtest is guaranteed to work in the future.', a: false, why: 'Markets change, costs are higher in reality, and backtests can be over-fitted. Always forward-test (paper trade) first.' },
        ]
      },
      {
        id: 'u5l3', title: 'VWAP trend trading', icon: '🌊', xp: 25,
        cards: [
          { t: 'learn', title: 'Trend + pullback + VWAP', html: `
            <p>A popular, logical setup used by many professional desks:</p>
            <ol><li>Stock in play, trending (above VWAP and rising for longs).</li><li>Wait for a <b>pullback</b> toward VWAP or the 9/20 EMA on lighter volume.</li><li>Enter when it shows strength again (e.g. breaks the high of the pullback candle).</li><li>Stop below the pullback low / VWAP. Target: the prior high or 2R+.</li></ol>
            <p>Why it makes sense: you're buying <b>with</b> the trend, at a price institutions consider "fair", with a nearby logical stop.</p>`, chart: { pattern: 'vwap-bounce' } },
          { t: 'mcq', q: 'Where is the most logical stop for a VWAP pullback long?', opts: ['10% above entry', 'Just below the pullback low / VWAP', 'No stop needed at VWAP', 'At yesterday\'s close no matter what'], a: 1, why: 'If price breaks back below VWAP and the pullback low, the idea is wrong. Get out.' },
          { t: 'tf', q: 'A "pullback" in an uptrend should ideally come on lighter volume than the push up.', a: true, why: 'Light volume on the pullback = weak selling. Heavy volume on the drop is a warning sign.' },
        ]
      },
      {
        id: 'u5l4', title: 'The rhythm of the day', icon: '⏰', xp: 20,
        cards: [
          { t: 'learn', title: 'Not all minutes are equal', html: `
            <p>US market (9:30–16:00 ET). In Israel time that's usually <b>16:30–23:00</b>:</p>
            <ul><li>🔥 <b>First 30–60 min</b> (16:30–17:30 IL): highest volume and volatility. Most day-trading opportunities, and most danger.</li>
            <li>😴 <b>Lunch</b> (~19:00–20:30 IL): low volume, choppy. Many pros stop trading.</li>
            <li>⚡ <b>Last hour</b> (22:00–23:00 IL): volume returns.</li></ul>
            <p>📄 <i>Gao, Han, Li & Zhou (2018), "Market Intraday Momentum":</i> the S&P 500 ETF's first half-hour return (from the previous close) helped predict the <b>last half-hour</b> return. The effect was small but real, and stronger on volatile, high-volume days.</p>`},
          { t: 'mcq', q: 'For a trader in Israel, when does the US regular session usually open?', opts: ['09:30', '14:00', '16:30', '22:00'], a: 2, why: '9:30 ET = 16:30 Israel time for most of the year (it shifts by an hour for a few weeks when daylight-saving changes don\'t line up).' },
          { t: 'mcq', q: 'Which period is usually choppiest with the lowest volume?', opts: ['The open', 'Midday / lunch', 'The last hour', 'All the same'], a: 1, why: 'The midday lull is notorious for fake moves and chop.' },
        ]
      },
      {
        id: 'u5l5', title: 'What does NOT work', icon: '🚫', xp: 20,
        cards: [
          { t: 'learn', title: 'Traps that eat beginners', html: `
            <ul>
            <li>📱 <b>Telegram/Discord "signal" groups & paid gurus</b>: often make money from subscriptions or pump-and-dumps, not trading.</li>
            <li>🎰 <b>Penny-stock pumps</b>: illiquid, manipulated, wide spreads.</li>
            <li>📉 <b>Averaging down</b> on a losing day trade: turning a small loss into a big one.</li>
            <li>🎲 <b>Martingale</b> (doubling after losses): guaranteed blow-up eventually.</li>
            <li>⚡ <b>Max leverage products</b> (some CFDs/forex at 1:100+).</li>
            <li>💸 <b>Binary options</b>: Israel <b>banned</b> firms from selling them (2017) after massive fraud.</li>
            <li>🤖 <b>"Guaranteed" trading bots</b>: if it really printed money, nobody would sell it to you.</li>
            </ul>`},
          { t: 'mcq', q: 'An Instagram account promises "95% winning signals, join for ₪299/month". Most likely…', opts: ['Free money', 'Their real business is selling subscriptions', 'Regulated by the Israel Securities Authority', 'A bank'], a: 1, why: 'If they had a 95% edge they wouldn\'t need your ₪299. Real results = audited, long-term track records.' },
          { t: 'tf', q: 'Averaging down (buying more as a day trade goes against you) is a good risk-management technique.', a: false, why: 'It increases exposure to a trade that\'s already proving you wrong. Respect the stop.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 6 ───────────────────────── */
  {
    id: 'u6', title: 'Trader Psychology', subtitle: 'Your brain is the final boss', color: '#ff86d0', icon: '🧠',
    lessons: [
      {
        id: 'u6l1', title: 'FOMO, revenge & overconfidence', icon: '😤', xp: 20,
        cards: [
          { t: 'learn', title: 'Know your enemies', html: `
            <p><b>😱 FOMO</b> (fear of missing out): chasing a stock that already ran 20%. Usually buying from the people taking profit.</p>
            <p><b>😡 Revenge trading</b>: after a loss, jumping into a random trade to "win it back".</p>
            <p><b>😎 Overconfidence</b>: after a few wins, increasing size and breaking rules. Research (Barber & Odean) links overconfidence directly to over-trading and worse returns.</p>
            <p><b>🙈 Loss aversion</b>: moving your stop further away because you "can't" accept the loss.</p>`},
          { t: 'mcq', q: 'You missed a breakout. It\'s now +12% above your planned entry. Best action?', opts: ['Chase it, it might go higher', 'Let it go and wait for a new setup or a pullback', 'Short it out of anger', 'Double size'], a: 1, why: 'Missing a trade costs $0. Chasing one costs real money. There\'s always another setup.' },
          { t: 'mcq', q: 'Price is about to hit your stop. The disciplined move is…', opts: ['Move the stop lower "just this once"', 'Let the stop do its job', 'Cancel the stop', 'Buy more'], a: 1, why: 'Your stop was set when you were calm and rational. Trust that version of you.' },
        ]
      },
      {
        id: 'u6l2', title: 'The trading journal', icon: '📓', xp: 15,
        cards: [
          { t: 'learn', title: 'Data beats feelings', html: `
            <p>For every trade, write: <b>setup, entry, stop, target, result in R, emotion, did I follow the plan?</b></p>
            <p>After 50–100 trades, patterns appear: "I lose on Fridays", "My ORB trades are +0.3R but my random trades are −0.5R". <b>Cut what loses, double down on what works.</b></p>
            <p>The Arena logs your trades automatically and asks you for the setup and emotion after each one.</p>`},
          { t: 'tf', q: 'A trade that made money but broke your rules was a good trade.', a: false, why: 'Process over outcome. A rule-breaking win teaches bad habits that eventually cost much more.' },
          { t: 'mcq', q: 'How many trades do you need before your stats mean something?', opts: ['3', '10', 'At least 50–100', 'One great one'], a: 2, why: 'Small samples are mostly luck. Think in large numbers.' },
        ]
      },
      {
        id: 'u6l3', title: 'Process over outcome', icon: '🧘', xp: 15,
        cards: [
          { t: 'learn', title: 'Think like a casino, not a gambler', html: `
            <p>A casino doesn't celebrate one spin of the roulette wheel. It knows its edge plays out over <b>thousands</b> of spins.</p>
            <p>Judge yourself on: Did I take <b>only</b> my setups? Did I size correctly? Did I respect my stop and daily limit? If yes, it was a good day, <b>even if you lost money</b>.</p>`},
          { t: 'mcq', q: 'You followed your plan perfectly and lost −1R. How do you grade the trade?', opts: ['Terrible trade', 'Good trade, bad outcome', 'Should\'ve skipped the stop', 'Should\'ve doubled'], a: 1, why: 'A well-executed trade with an edge can still lose. That\'s normal variance.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 7 ───────────────────────── */
  {
    id: 'u7', title: 'Trading from Israel 🇮🇱', subtitle: 'Hours, brokers, taxes, rules', color: '#0038b8', icon: '🇮🇱',
    lessons: [
      {
        id: 'u7l1', title: 'Market clocks', icon: '🕓', xp: 15,
        cards: [
          { t: 'learn', title: 'When can you trade?', html: `
            <p><b>🇮🇱 TASE</b>: <b>Monday–Friday</b> since 5 Jan 2026. Continuous trading runs roughly from ~10:00 until ~17:15–17:25 Monday–Thursday. <b>Friday is a short session</b> that ends early afternoon (before Shabbat). Check tase.co.il for the exact schedule and holidays.</p>
            <p><b>🇺🇸 US (NYSE/Nasdaq)</b>: 9:30–16:00 New York time = usually <b>16:30–23:00 Israel</b>. Pre-market starts as early as 11:00 IL (4:00 ET).</p>
            <p>⚠️ For a few weeks in <b>March</b> and <b>Oct/Nov</b>, Israel and the US switch daylight-saving time on different dates, so the US opens at <b>15:30</b> Israel time.</p>
            <div class="callout">🎓 For students: US markets open after school, which is one reason Israeli day traders mostly trade the US.</div>`},
          { t: 'mcq', q: 'Most of the year, the US closing bell (16:00 ET) rings at what Israel time?', opts: ['18:00', '21:00', '23:00', '01:00'], a: 2, why: '16:00 ET + 7h = 23:00 Israel time.' },
          { t: 'tf', q: 'The US open is always exactly 16:30 Israel time, all year round.', a: false, why: 'During the DST mismatch weeks (March, late Oct/early Nov) it\'s 15:30.' },
        ]
      },
      {
        id: 'u7l2', title: 'Brokers, age & currency', icon: '🏦', xp: 20,
        cards: [
          { t: 'learn', title: 'How Israelis access markets', html: `
            <ul><li><b>Israeli banks</b> (trading through your bank account): easy, but often higher fees.</li>
            <li><b>Israeli brokerage firms / investment houses</b>: usually cheaper than banks, regulated by the <b>Israel Securities Authority (רשות ניירות ערך)</b>.</li>
            <li><b>International brokers</b> (e.g. Interactive Brokers): low costs and direct US access, but you handle tax reporting yourself.</li></ul>
            <p>🔞 <b>Age:</b> you generally need to be <b>18</b> to open your own trading account, and margin/short-selling privileges have extra requirements. Until then: simulator + learning. That's exactly what My Trading Bro is for.</p>`},
          { t: 'learn', title: 'Currency risk (USD/ILS)', html: `
            <p>Trading US stocks means your money is in <b>dollars</b>. If the shekel strengthens, your dollar profits are worth fewer shekels, and vice versa. Converting currency also costs a fee at many brokers.</p>`},
          { t: 'mcq', q: 'Who regulates securities brokers and investment firms in Israel?', opts: ['The Israel Tax Authority', 'The Israel Securities Authority (ISA)', 'The Ministry of Education', 'Nobody'], a: 1, why: 'The ISA (רשות ניירות ערך) supervises the capital markets. Before using any firm, check it\'s licensed.' },
          { t: 'tf', q: 'You made 5% on a US stock, but the dollar fell 5% vs. the shekel. In shekels you made roughly 0%.', a: true, why: 'Currency moves can cancel out stock gains (or add to them).' },
        ]
      },
      {
        id: 'u7l3', title: 'Taxes in Israel', icon: '🧾', xp: 20,
        cards: [
          { t: 'learn', title: 'The basics (not tax advice!)', html: `
            <ul><li>Capital gains on securities are generally taxed at <b>25%</b> of the <b>real</b> (inflation-adjusted) gain for individuals.</li>
            <li>Losses can be <b>offset</b> against gains in the same tax year.</li>
            <li>High earners can owe an additional <b>surtax</b> (מס יסף) on capital income above a yearly threshold.</li>
            <li><b>Israeli broker/bank</b>: they usually withhold the tax for you. <b>Foreign broker</b>: you must report and pay yourself (annual return + reporting).</li>
            <li>⚠️ Very frequent, business-like trading <b>may be treated as business income</b> at higher personal tax rates. That's a real risk for full-time day traders.</li></ul>
            <p>When the time comes, speak with an Israeli accountant (רואה חשבון) before trading seriously.</p>`},
          { t: 'num', q: 'You made a real gain of ₪4,000 this year. At 25%, how much capital gains tax?', a: 1000, tol: 0.5, suffix: '₪', why: '25% × 4,000 = ₪1,000.' },
          { t: 'mcq', q: 'You trade through a foreign broker. Who is responsible for reporting your gains to the Israel Tax Authority?', opts: ['The foreign broker', 'You', 'Nobody, it\'s abroad', 'The US government'], a: 1, why: 'With a foreign broker, reporting and paying is your responsibility.' },
        ]
      },
      {
        id: 'u7l4', title: 'Rules & scams', icon: '🚨', xp: 15,
        cards: [
          { t: 'learn', title: 'Good-to-know rules', html: `
            <p><b>US "Pattern Day Trader" rule:</b> for years US margin accounts needed <b>$25,000</b> to day trade more than 3 times in 5 days. In <b>April 2026</b> the SEC approved FINRA's plan to <b>scrap</b> that rule, replacing it with new intraday margin standards (rolling out from mid-2026; brokers may keep their own minimums).</p>
            <p><b>Scam red flags</b> 🚩: guaranteed returns, pressure to deposit fast, unlicensed "brokers" calling you, WhatsApp "investment clubs", requests for remote access to your computer, crypto "recovery" services.</p>`},
          { t: 'tf', q: 'A "broker" calls you, promises 30% a month guaranteed and asks you to install remote-access software. Legit?', a: false, why: 'Classic scam pattern. Hang up.' },
          { t: 'mcq', q: 'In 2026 the US $25,000 Pattern Day Trader minimum was…', opts: ['Raised to $50,000', 'Approved for removal by the SEC', 'Applied to Israel', 'Unchanged forever'], a: 1, why: 'The SEC approved FINRA\'s amendment in April 2026 to remove the PDT designation and the $25k minimum.' },
        ]
      },
    ]
  },

  /* ───────────────────────── UNIT 8 ───────────────────────── */
  {
    id: 'u8', title: 'Your Trading Plan', subtitle: '🎓 Graduation', color: '#ffc800', icon: '🎓',
    lessons: [
      {
        id: 'u8l1', title: 'Write your plan', icon: '📝', xp: 20,
        cards: [
          { t: 'learn', title: 'A pro trading plan answers…', html: `
            <ol><li><b>What</b> do I trade? (e.g. US stocks in play, price > $5, RVOL > 2)</li>
            <li><b>When?</b> (e.g. first 90 minutes only)</li>
            <li><b>Which setups?</b> (e.g. 5-min ORB, VWAP pullback. Max 2!)</li>
            <li><b>Entry, stop, target rules</b>, written exactly</li>
            <li><b>Risk</b>: % per trade, max trades/day, daily max loss</li>
            <li><b>Review</b>: journal daily, weekly stats review</li></ol>
            <p>Write it down. If a trade isn't in the plan, it doesn't exist.</p>`},
          { t: 'mcq', q: 'Which plan rule is the most precise?', opts: ['"Buy when it looks strong"', '"Buy a break of the 5-min opening range high if the first candle is green and RVOL > 2; stop at range low; risk 0.5%"', '"Trade a lot"', '"Follow my gut"'], a: 1, why: 'Precise rules can be tested and measured. Vague rules can\'t.' },
        ]
      },
      {
        id: 'u8l2', title: 'Backtesting & paper trading', icon: '🔬', xp: 20,
        cards: [
          { t: 'learn', title: 'Prove it before you risk it', html: `
            <p><b>Backtest</b>: apply your exact rules to past charts and record every result.<br><b>Forward-test (paper trade)</b>: trade the rules live with fake money for at least <b>2–3 months / 100+ trades</b>.</p>
            <p>Graduation criteria many coaches use before going live (with tiny size):</p>
            <ul><li>✅ 100+ logged trades</li><li>✅ Positive expectancy after realistic costs</li><li>✅ Rules followed on 90%+ of trades</li><li>✅ Max drawdown you could actually live with</li></ul>`},
          { t: 'tf', q: 'If you\'re profitable over your first 10 paper trades, you\'re ready to go big with real money.', a: false, why: '10 trades is mostly luck. Aim for 100+, then start real trading with very small size.' },
        ]
      },
      {
        id: 'u8l3', title: 'Final exam', icon: '🏆', xp: 50,
        cards: [
          { t: 'mcq', q: 'Account $15,000, risk 1%. Max dollar loss per trade?', opts: ['$15', '$150', '$1,500', '$1'], a: 1, why: '1% of 15,000 = $150.' },
          { t: 'num', q: 'Risk $150, entry $60.00, stop $59.25. Shares?', a: 200, tol: 0.5, suffix: 'shares', why: '150 ÷ 0.75 = 200.' },
          { t: 'num', q: 'Win rate 45%, avg win +2R, avg loss −1R. Expectancy (R)?', a: 0.35, tol: 0.001, suffix: 'R', why: '0.45×2 − 0.55×1 = 0.90 − 0.55 = +0.35R.' },
          { t: 'mcq', q: 'Best place to look for day trades?', opts: ['Random illiquid penny stocks', 'Stocks in play: catalyst + gap + high RVOL + liquid', 'Whatever is trending on TikTok', 'Stocks that haven\'t moved in a month'], a: 1, why: 'In-play stocks are where research found edges.' },
          { t: 'mcq', q: 'Price is below VWAP and making lower highs. Your bias?', opts: ['Long', 'Short / avoid longs', 'Neutral always', 'Buy more on every dip'], a: 1, why: 'Below VWAP + downtrend structure = sellers in control.' },
          { t: 'tf', q: 'You hit your daily max loss. You stop trading for the day.', a: true, why: 'Non-negotiable.' },
          { t: 'mcq', q: 'US market open in Israel time (most of the year)?', opts: ['10:00', '15:00', '16:30', '18:30'], a: 2, why: '9:30 ET = 16:30 IL.' },
          { t: 'mcq', q: 'The single most important skill that separates surviving traders?', opts: ['Predicting the future', 'Risk management & discipline', 'Having many indicators', 'Trading every day'], a: 1, why: '🎓 Congratulations! Now go prove your edge in the Arena.' },
        ]
      },
    ]
  },
];

/* Glossary for the coach and the tooltips */
window.TQ_GLOSSARY = {
  'vwap': 'VWAP (Volume-Weighted Average Price) is the average price paid today, weighted by volume. It resets daily. Above VWAP = buyers in control, below = sellers. Institutions benchmark their fills against it. (Lesson: Levels & Indicators → VWAP)',
  'orb': 'Opening Range Breakout: mark the high/low of the first 5–30 minutes, trade the break in the direction of the first candle, stop at the other side, exit by the close. Studied by Zarattini & Aziz (2023/2024). Strongest on Stocks in Play. (Lesson: Strategies → ORB)',
  'opening range': 'The opening range is the high and low of the first N minutes after the open (often 5, 15 or 30). See ORB.',
  'stock in play': 'A stock with a news catalyst, a gap, and unusually high relative volume (RVOL ≥ 2–3×). Most day-trading edges show up in these.',
  'stocks in play': 'A stock with a news catalyst, a gap, and unusually high relative volume (RVOL ≥ 2–3×). Most day-trading edges show up in these.',
  'rvol': 'Relative volume = today\'s volume ÷ normal volume for this time of day. RVOL 3 = three times normal activity.',
  'spread': 'The spread is the difference between the bid (best buyer) and the ask (best seller). It\'s a hidden cost on every round trip.',
  'bid': 'The bid is the highest price a buyer is currently willing to pay.',
  'ask': 'The ask (offer) is the lowest price a seller is currently willing to accept.',
  'stop': 'A stop-loss is an order that exits your position automatically if price reaches a level that proves your idea wrong. In My Trading Bro every trade needs one.',
  'stop loss': 'A stop-loss is an order that exits your position automatically if price reaches a level that proves your idea wrong.',
  'limit order': 'A limit order fills only at your price or better. You control the price but might not get filled.',
  'market order': 'A market order fills immediately at the best available price. Fast, but you may suffer slippage.',
  'slippage': 'Slippage is the difference between the price you expected and the price you actually got, common in fast markets.',
  'r multiple': 'R = the amount you risked. +2R means you made twice your risk; −1R means a normal full stop-out.',
  'expectancy': 'Expectancy = (Win% × Avg win R) − (Loss% × Avg loss R). Positive after costs = an edge.',
  'position size': 'Shares = (Account × Risk%) ÷ (Entry − Stop). The stop distance decides the size.',
  'atr': 'Average True Range measures typical movement. Use it to set volatility-based stops (e.g. 10% of daily ATR for tight ORB stops).',
  'ema': 'Exponential moving average. The 9 and 20 EMA are popular intraday trend guides.',
  'support': 'Support is a price zone where buyers previously stepped in.',
  'resistance': 'Resistance is a price zone where sellers previously stepped in.',
  'short': 'Shorting = selling borrowed shares, hoping to buy back cheaper. Risk is theoretically unlimited without a stop.',
  'leverage': 'Leverage (margin) multiplies both gains and losses. It does not create an edge.',
  'margin': 'Margin = borrowing from your broker to trade bigger. Multiplies gains AND losses.',
  'pdt': 'The US Pattern Day Trader rule required $25k to day trade frequently on margin. The SEC approved its removal in April 2026, with new intraday margin standards rolling out from mid-2026.',
  'pattern day trader': 'The US Pattern Day Trader rule required $25k to day trade frequently on margin. The SEC approved its removal in April 2026.',
  'tase': 'The Tel Aviv Stock Exchange. Trades Monday–Friday since January 2026, with a short Friday session.',
  'gap': 'A gap is when a stock opens far above (gap up) or below (gap down) the previous close, usually because of news.',
  'catalyst': 'A catalyst is news that moves a stock: earnings, FDA decisions, M&A, guidance, upgrades/downgrades, contracts.',
  'ipo': 'IPO (Initial Public Offering) is when a private company first sells shares on an exchange. New IPOs are often very volatile.',
  'earnings': 'Quarterly results. Stocks often gap and become "in play" after earnings, especially with a surprise vs. expectations.',
  'tax': 'In Israel, capital gains on securities are generally taxed at 25% of the real gain (plus possible surtax for high incomes). Very frequent trading could be treated as business income. Talk to an accountant (not tax advice).',
  'drawdown': 'Drawdown = how far your account fell from its peak. A 50% drawdown needs +100% to recover.',
  'journal': 'A trading journal records setup, entry, stop, target, R result, emotion and rule-following for every trade.',
  'backtest': 'Testing exact rules on historical data. Useful, but beware over-fitting and unrealistic costs. Forward-test after.',
  'candle': 'A candlestick shows open, high, low and close for one period. Green = closed up, red = closed down, wicks = rejected prices.',
  'hammer': 'A hammer is a small body with a long lower wick: sellers pushed down, buyers took it back. Meaningful mainly at support.',
  'doji': 'A doji has open ≈ close: indecision.',
  'etf': 'An ETF is a fund that trades like a stock. SPY = S&P 500, QQQ = Nasdaq-100.',
  'fomo': 'Fear of missing out: chasing a move that already happened. Missing a trade costs $0, chasing one costs money.',
  'revenge': 'Revenge trading is forcing trades to win back a loss. The #1 account killer. Respect your daily max loss.',
};
