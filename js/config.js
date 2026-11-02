/* My Trading Bro – settings. Change the name here when you pick a new one. */
window.TQ_CONFIG = {
  appName: 'My Trading Bro',
  // Fixed learners for now. Add more objects here later to open it to friends & family.
  profiles: [
    { id: 'leon', name: 'Leon', avatar: '🦁', color: '#1cb0f6' },
    { id: 'barda', name: 'Barda', avatar: '🐺', color: '#ce82ff' },
  ],
  // Optional AI coach. Leave empty to use the built-in offline coach.
  // After deploying server/coach-worker.js (see README.md), paste its URL here, e.g.
  // 'https://my-trading-bro-coach.<your-subdomain>.workers.dev'
  aiEndpoint: '',
  arena: { startBalance: 25000, maxDailyLossR: 3, maxTradesPerDay: 5, slippagePct: 0.0002 },
  defaultDailyGoal: 30,
};
