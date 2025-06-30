/**
 * Best-effort loader to populate missing process.env values by reading a .env.local
 * file at runtime. This is mainly for development where Next.js sometimes fails
 * to pick up the env file (e.g. wrong filename/location or when scripts are run
 * outside the Next.js context such as API routes executed in isolation).
 *
 * It does nothing if the requested keys are already present.
 */
export function ensureFirebaseEnv() {
  // We only run this on the server (Node) side.
  if (typeof window !== 'undefined') return;

  // If variables already exist, no need to proceed.
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) return;

  try {
      const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      // Ignore comments and empty lines
      if (!line || line.trim().startsWith('#')) continue;

      const idx = line.indexOf('=');
      if (idx === -1) continue;

      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();

      // Remove surrounding quotes if they exist
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')) ) {
        value = value.slice(1, -1);
      }

      // Unescape \n so that multiline private keys work
      value = value.replace(/\\n/g, '\n');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log('[loadEnv] Environment variables loaded from .env.local');
  } catch (err) {
    console.error('[loadEnv] Failed to load .env.local', err);
  }
}
