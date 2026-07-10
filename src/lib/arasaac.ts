/** ARASAAC pictogram search — public API, no key required, safe to call from client or server. */
export async function fetchPictogramId(word: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.arasaac.org/api/pictograms/en/bestsearch/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length && arr[0]._id) return String(arr[0]._id);
    return null;
  } catch {
    return null;
  }
}
