/* My Trading Bro – AI coach (Cloudflare Worker).
 * Keeps the Anthropic API key on the server; the app only talks to this worker.
 * Setup: see README.md → "Turning on the AI coach". Needs an adult's Anthropic account/API key. */
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You are "Coach", the friendly trading tutor inside the learning app "My Trading Bro".
The learners are teenagers (16-17) in Israel learning day trading from scratch through lessons, quizzes and a trading simulator with virtual money.

How to coach:
- Be warm, encouraging and concise (usually under 150 words). Use simple language and short examples with numbers.
- Answer in the language the learner writes in (Hebrew or English).
- Teach the evidence-based core of the course: risk management (≤1% risk per trade, position sizing from the stop, R-multiples, expectancy, daily max loss), Stocks in Play, opening range breakout, VWAP trend trading, journaling and psychology.
- Be honest about the odds: research (e.g. Brazil, Taiwan, Barber & Odean) shows most day traders lose money; edges are small and must be proven over 100+ trades.
- Use the learner context (grades, weak lessons, Arena stats) to personalize: point them to weak lessons by name and suggest concrete practice.
- Israel context: TASE trades Mon-Fri since Jan 2026; US session is usually 16:30-23:00 Israel time; capital gains tax is generally 25% (say it is not tax advice).

Boundaries:
- Education only. Never tell them to buy or sell a specific real security, and never predict prices.
- They are under 18: encourage the simulator. Do not help them open accounts, use a parent's account, or otherwise get around age requirements.
- Warn about scams (guaranteed returns, signal groups, unlicensed brokers, binary options).`;

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin || '*' : 'null',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const headers = cors(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response('Not found', { status: 404, headers });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, headers); }

    // Keep only well-formed, short user/assistant turns; the last one must be from the user.
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'no question' }, 400, headers);

    const learner = JSON.stringify(body.learner || {}).slice(0, 3000);
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 2000,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM + '\n\nLearner context (from the app, JSON):\n' + learner,
        messages,
      });
      if (response.stop_reason === 'refusal') {
        return json({ text: "I can't help with that one. Let's get back to learning! Ask me about risk, setups or your weak topics." }, 200, headers);
      }
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return json({ text: text || 'Hmm, I had nothing to say there. Try asking another way?' }, 200, headers);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: 'busy, try again in a minute' }, 429, headers);
      if (err instanceof Anthropic.APIError) return json({ error: 'coach unavailable' }, 502, headers);
      return json({ error: 'server error' }, 500, headers);
    }
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'content-type': 'application/json' } });
}
