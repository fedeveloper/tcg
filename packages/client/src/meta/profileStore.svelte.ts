import { newProfile, parseProfile, serializeProfile, type Profile } from "@tcg/meta";

const KEY = "tcg.profile";

function load(): Profile {
  try {
    const p = parseProfile(localStorage.getItem(KEY));
    if (p) return p;
  } catch {
    // No storage (private window): the profile lives only in memory.
  }
  return newProfile(Date.now() >>> 0);
}

/**
 * The profile of the player: collection, decks and the current run.
 * The browser storage keeps it. There is no server before phase 4 of the plan.
 */
class ProfileStore {
  profile = $state.raw<Profile>(load());

  /** Changes a copy of the profile, then saves it. The function can return a value. */
  update<T>(f: (p: Profile) => T): T {
    const p = structuredClone(this.profile);
    const out = f(p);
    this.profile = p;
    try {
      localStorage.setItem(KEY, serializeProfile(p));
    } catch {
      // Storage full or blocked: keep the profile in memory.
    }
    return out;
  }

  reset(): void {
    this.update((p) => Object.assign(p, newProfile(Date.now() >>> 0)));
  }
}

export const profileStore = new ProfileStore();
