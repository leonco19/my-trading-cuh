# 📈 My Trading Bro

A game-style app that teaches day trading from scratch, made for **Leon** and **Barda**.

- 🏠 **Desk**: 11 seasons, 42 lessons (day trading, plus **Swing Trading** and **Investing**). Your XP is your own stock price ($LEON / $BRDA), with green-day streaks, trader ranks and badges
- 🧑‍🏫 **4 teaching methods**: 💬 Bro Talk (chat), 🎯 Call It First (guess first), 📖 Deep Dive (full explanation), ⚡ Market Rush (timed, with combos). All of them are built on retrieval practice, and Review uses spaced repetition
- ⭐ **Rate every lesson**: a low rating asks why. If the reason makes sense, a change request goes to Leon's 🧪 **Lab** (or to WhatsApp with a code if you're on different phones). Nothing changes until Leon approves
- ✅ **Quizzes & grades**: every lesson ends with a grade. Each answer is remembered per learner, so the app knows what you've mastered and what needs work
- 🔁 **Review**: replays only the questions you got wrong until you fix them
- 🕹️ **Arena**: a trading simulator with realistic 5-minute market days, virtual money, enforced risk rules, a journal and stats (win rate, expectancy, by setup, by emotion)
- 🤖 **Coach**: answers questions, calculates position size and expectancy, knows the market hours, and knows your weak spots
- 📰 **News**: world + Israel market news, each with "why it matters for traders"
- 🏆 **Progress**: report card, mastery per unit, leaderboard (Leon vs. Barda), badges

> Education only. Not financial advice. Everything uses virtual money.

---

## ▶️ Run it on this computer

Double-click **`Start My Trading Bro.bat`**. It opens the app at `http://localhost:8642`.
In Edge/Chrome, click the **Install** icon in the address bar (or the "Install" pop-up) to get it as a real desktop app with its own icon.

(You can also just double-click `index.html`. Everything works except "install as app" and offline mode.)

## 📲 Put it on your phones (and Barda's)

To install on a phone, the app needs to be online at an `https://` address. The free, easy way is **GitHub Pages**:

1. Create a free GitHub account (or use an existing one).
2. Create a new repository called `my-trading-bro` and upload all the files in this folder (except `server/`, which isn't needed for the app).
3. Repository → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root → Save.
4. After about a minute the app is live at `https://<your-username>.github.io/my-trading-bro/`.
5. On the phone, open that link →
   - **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*
   - **iPhone (Safari):** Share button → *Add to Home Screen*

It now opens full-screen from the home screen like any app and works offline.

Claude can do these steps for you. Just ask once you have the GitHub account.

### Where is progress saved?
On each device, in the app's local storage. Leon's and Barda's progress are kept separately.
- Same device → both appear on the leaderboard automatically.
- Different phones → **Progress → Copy my share code**, send it to your friend, and they paste it in the leaderboard box.
- Changing phones → **Progress → Settings → Copy backup code**, then **Restore** on the new device.

## ✏️ Customizing

| What | Where |
|---|---|
| App name, learners, Arena rules | `js/config.js` |
| Lessons & quiz questions | `js/content.js` |
| News items | `js/news.js` (Claude can refresh this for you) |
| Look & feel | the `<style>` block in `index.html` |

After changing files on the hosted version, bump `VERSION` in `sw.js` (e.g. `mtb-v2`) so phones pick up the update.

## 🤖 Turning on the AI coach (optional, needs an adult)

The built-in coach works offline. For a real AI coach (Claude), deploy the small server in `server/`:

1. An adult creates an Anthropic API account at console.anthropic.com and an API key. (API accounts require 18+, and usage costs a small amount per message.)
2. Install Node.js, then in the `server` folder:
   ```
   npm install
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler deploy
   ```
3. Put the URL it prints into `aiEndpoint` in `js/config.js`, and the app's address into `ALLOWED_ORIGINS` in `server/wrangler.toml`.

The API key stays on the server and is never in the app. The coach is told who the learners are (age, grades, weak topics), keeps to education only, and never gives stock picks.

## 📚 Sources behind the course
- Chague, De-Losso & Giovannetti (2019), *Day Trading for a Living?* (Brazil)
- Barber, Lee, Liu & Odean, studies of all Taiwan day traders
- Barber & Odean (2000), *Trading Is Hazardous to Your Wealth*
- Zarattini & Aziz (2023), *Can Day Trading Really Be Profitable?*; Zarattini, Barbon & Aziz (2024), *A Profitable Day Trading Strategy for the U.S. Equity Market* (Opening Range Breakout on Stocks in Play)
- Gao, Han, Li & Zhou (2018), *Market Intraday Momentum*, Journal of Financial Economics
- SEC approval of FINRA's Pattern Day Trader rule removal (April 2026)
- Tel Aviv Stock Exchange move to Monday–Friday trading (January 2026)
