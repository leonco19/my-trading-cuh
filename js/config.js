/* My Trading Bro – settings. Change the name here when you pick a new one. */
window.TQ_CONFIG = {
  appName: 'My Trading Bro',
  // Fixed learners for now. Add more objects here later to open it to friends & family.
  profiles: [
    { id: 'leon', name: 'Leon', avatar: '🦁', color: '#4c8dff' },
    { id: 'barda', name: 'Barda', avatar: '🐺', color: '#9b6bff' },
  ],
  // The boss: this learner gets the 🧪 Lab, where they approve or decline teaching-method changes.
  owner: 'leon',
  // Used to make approval codes (so a code only works for its own request). Change it to any random text.
  ownerSecret: 'bro-desk-2026',
  // Teaching method every learner starts with (see js/methods.js): 'chat' | 'predict' | 'cards' | 'rush'
  defaultMethod: 'chat',
  // After each lesson, a rating BELOW this many stars makes the app ask "why?".
  expectedRating: 4,
  // Optional AI coach. Leave empty to use the built-in offline coach.
  // After deploying server/coach-worker.js (see README.md), paste its URL here, e.g.
  // 'https://my-trading-bro-coach.<your-subdomain>.workers.dev'
  aiEndpoint: '',
  arena: { startBalance: 25000, maxDailyLossR: 3, maxTradesPerDay: 5, slippagePct: 0.0002 },
  defaultDailyGoal: 30,
};
