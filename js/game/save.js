// Versioned localStorage. Corrupt or missing data falls back to a fresh save.
const KEY = 'trapdoor_save_v1';

const fresh = () => ({
  unlocked: 1, cleared: [], deaths: {}, best: {}, total: 0, muted: false, seen: false,
  nerves: {},      // levelIndex -> true, once its nerve has been taken
  nerve: 0,        // unspent nerve, the currency for a glimpse
  bonusSeen: {},   // chapter -> true, so "bonus unlocked" only crows once
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const f = fresh();
    return {
      unlocked: Number.isFinite(s.unlocked) ? s.unlocked : f.unlocked,
      cleared: Array.isArray(s.cleared) ? s.cleared : f.cleared,
      deaths: s.deaths && typeof s.deaths === 'object' ? s.deaths : f.deaths,
      best: s.best && typeof s.best === 'object' ? s.best : f.best,
      total: Number.isFinite(s.total) ? s.total : 0,
      muted: !!s.muted,
      seen: !!s.seen,
      nerves: s.nerves && typeof s.nerves === 'object' ? s.nerves : f.nerves,
      nerve: Number.isFinite(s.nerve) ? s.nerve : f.nerve,
      bonusSeen: s.bonusSeen && typeof s.bonusSeen === 'object' ? s.bonusSeen : f.bonusSeen,
    };
  } catch { return fresh(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode — play on */ }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
