import { POKEAPI_BASE } from "./constants";

const jaNameCache = new Map<string, string | null>();

function extractBaseName(englishName: string): string {
  // Remove suffixes like "ex", "V", "VSTAR", etc.
  let base = englishName.split(/\s+(ex|EX|V|VSTAR|VMAX|GX|Tag Team|MEGA|BREAK|δ)/)[0].trim();
  // Remove possessive (e.g., "Rocket's Mewtwo" -> "Mewtwo")
  if (base.includes("'s ")) {
    base = base.split("'s ").pop()!;
  }
  return base;
}

export async function getJapaneseName(
  englishName: string
): Promise<string | null> {
  const base = extractBaseName(englishName);
  const cacheKey = base.toLowerCase();

  if (jaNameCache.has(cacheKey)) {
    return jaNameCache.get(cacheKey)!;
  }

  try {
    const slug = base.toLowerCase().replace(/ /g, "-").replace(/\./g, "").replace(/'/g, "");
    const resp = await fetch(`${POKEAPI_BASE}/${slug}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      const data = await resp.json();
      const jaEntry = data.names?.find(
        (n: { language: { name: string }; name: string }) =>
          n.language.name === "ja"
      );
      if (jaEntry) {
        jaNameCache.set(cacheKey, jaEntry.name);
        return jaEntry.name;
      }
    }
  } catch {
    // timeout or network error
  }

  jaNameCache.set(cacheKey, null);
  return null;
}

export function clearCache() {
  jaNameCache.clear();
}
