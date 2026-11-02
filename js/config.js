/* My Trading Cuh – settings. Change the name here when you pick a new one. */
window.TQ_CONFIG = {
  appName: 'My Trading Cuh',
  // Old built-in profiles. Their saved progress can be brought into a new account when signing up.
  profiles: [
    { id: 'leon', name: 'Leon', avatar: '🦁', color: '#4c8dff' },
    { id: 'barda', name: 'Barda', avatar: '🐺', color: '#9b6bff' },
  ],
  // The boss gets the 🧪 Lab (approve teaching-style changes, reset passwords on this device).
  // The boss is the account whose email matches this SHA-256 hash (so the email itself isn't in the code),
  // or the account that brought over the old "leon" progress.
  owner: 'leon',
  ownerEmailHash: '8dd4669a0705065a9b332013cfccc8be75dd757db079bfa760acda8c28eb1859',
  // Used to make approval codes (so a code only works for its own request). Change it to any random text.
  ownerSecret: 'bro-desk-2026',
  // Invite-only testing: the online version asks for an invite code once per device (SHA-256 of the code).
  // Set to '' to open the app to everyone. Running it on your own PC (localhost) never asks.
  inviteHash: '734a25e2b6afc71e3ff532b79e1d81d45ff6d0390eba38f77437abf692b3f8a1',
  // Online accounts (same account on every device). Paste the Firebase web config here, e.g.
  // cloud: { apiKey: '...', authDomain: '....firebaseapp.com', projectId: '...', appId: '...' },
  // Leave it as null to keep accounts saved on each device only.
  cloud: null,
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
