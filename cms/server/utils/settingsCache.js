/**
 * In-memory cache for settings to avoid repeated DB lookups.
 * Invalidated on PUT /api/settings.
 */

let cachedSettings = null;
let lastFetched = 0;
const TTL_MS = 60_000; // 1 minute fallback TTL

export function getCachedSettings() {
  return cachedSettings;
}

export function setCachedSettings(settings) {
  cachedSettings = settings;
  lastFetched = Date.now();
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  lastFetched = 0;
}

export function isSettingsCacheStale() {
  return !cachedSettings || (Date.now() - lastFetched) > TTL_MS;
}

/**
 * Fast section-enabled check using cache, with DB fallback.
 */
export async function isSectionEnabled(db, sectionKey) {
  if (isSettingsCacheStale()) {
    const doc = await db.collection('settings').findOne({ key: 'settings' });
    setCachedSettings(doc);
  }
  return cachedSettings?.sections?.[sectionKey]?.enabled !== false;
}
