// Versioned localStorage. Corrupt or missing data falls back to a fresh save.
import { LEVELS } from './levels.js';

const KEY = 'trapdoor_save_v1';

const fresh = () => ({
  unlocked: 1, cleared: [], deaths: {}, best: {}, total: 0, muted: false, seen: false,
  nerves: {},      // levelIndex -> true, once its nerve has been taken
  nerve: 0,        // unspent nerve, the currency for a glimpse
  bonusSeen: {},   // chapter -> true, so "bonus unlocked" only crows once
  bonusAt: [],     // where the bonus levels sat when this save was written (see migrate)
});

const bonusIndices = () => LEVELS.map((L, i) => (L.bonus ? i : -1)).filter((i) => i >= 0);

// Bonus levels live at the end of the array, so adding a chapter to the main run pushes
// them along — and every per-level record is keyed by index. Saves carry the layout they
// were written under; if it no longer matches, the bonus rows are moved to their new
// homes and the vacated indices are left blank for the new levels that now own them.
function migrate(s) {
  const now = bonusIndices();
  const was = Array.isArray(s.bonusAt) && s.bonusAt.length ? s.bonusAt : [24, 25, 26];
  if (was.length === now.length && was.every((v, k) => v === now[k])) return s;

  const grabbed = was.map((i) => ({
    cleared: s.cleared[i], deaths: s.deaths[i], best: s.best[i], nerves: s.nerves[i],
  }));
  for (const i of was) { delete s.cleared[i]; delete s.deaths[i]; delete s.best[i]; delete s.nerves[i]; }
  grabbed.forEach((g, k) => {
    const j = now[k];
    if (j == null) return;
    if (g.cleared) s.cleared[j] = g.cleared;
    if (g.deaths != null) s.deaths[j] = g.deaths;
    if (g.best != null) s.best[j] = g.best;
    if (g.nerves) s.nerves[j] = g.nerves;
  });
  return s;
}

// `unlocked` is derived, never trusted: clearing main level i is what opens level i + 1.
// Deriving it means a shifted layout (or a hand-edited save) can't hand out free levels.
function derivedUnlocked(s) {
  let u = 1;
  s.cleared.forEach((c, i) => { if (c && LEVELS[i] && !LEVELS[i].bonus) u = Math.max(u, i + 2); });
  return Math.min(LEVELS.length, u);
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const f = fresh();
    const out = migrate({
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
      bonusAt: Array.isArray(s.bonusAt) ? s.bonusAt : f.bonusAt,
    });
    out.unlocked = derivedUnlocked(out);
    return out;
  } catch { return fresh(); }
}

export function save(s) {
  try {
    s.bonusAt = bonusIndices();
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* private mode — play on */ }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
