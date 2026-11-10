import { json } from "../../lib/http.js";

// Lecteur Spotify (facultatif). Sans les secrets SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET,
// la réponse est { lecteur: "deezer" } et le site garde le lecteur Deezer.
// Avec : GET /api/spotify?upc=...&artiste=...&titre=... renvoie l'album Spotify et ses morceaux.
let jeton = null, expire = 0;

async function token(env) {
  if (jeton && Date.now() < expire) return jeton;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + btoa(`${env.SPOTIFY_CLIENT_ID.trim()}:${env.SPOTIFY_CLIENT_SECRET.trim()}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`Spotify refuse les identifiants (${r.status})`);
  const d = await r.json();
  jeton = d.access_token;
  expire = Date.now() + ((d.expires_in || 3600) - 60) * 1000;
  return jeton;
}

async function api(env, path) {
  const r = await fetch("https://api.spotify.com/v1/" + path, { headers: { authorization: "Bearer " + (await token(env)) } });
  if (r.status === 401) { jeton = null; }
  if (!r.ok) throw new Error(`Spotify ${r.status}`);
  return r.json();
}

const albums = (s) => (s && s.albums && s.albums.items) || [];
const resume = (a) => ({ id: a.id, titre: a.name, artistes: (a.artists || []).map((x) => x.name), image: a.images && a.images[0] && a.images[0].url });

export async function onRequestGet({ request, env }) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return json({ lecteur: "deezer" });
  const u = new URL(request.url);
  const upc = (u.searchParams.get("upc") || "").replace(/\D/g, "");
  const artiste = (u.searchParams.get("artiste") || "").replace(/"/g, "").trim();
  const titre = (u.searchParams.get("titre") || "").replace(/"/g, "").trim();
  const id = (u.searchParams.get("album") || "").replace(/[^A-Za-z0-9]/g, "");
  if (!upc && !artiste && !titre && !id) return json({ lecteur: "spotify" });
  try {
    // Morceaux d'un album choisi par le navigateur
    if (id) {
      const a = await api(env, `albums/${id}?market=FR`);
      const tr = ((a.tracks && a.tracks.items) || []).map((t) => ({ id: t.id, title: t.name, duration: Math.round((t.duration_ms || 0) / 1000) || null }));
      return json({ lecteur: "spotify", album: { ...resume(a), morceaux: tr } });
    }
    // Candidats : d'abord par code-barres, puis par artiste + titre (le navigateur vérifie la correspondance)
    const out = [];
    if (upc.length >= 8) {
      try { out.push(...albums(await api(env, `search?type=album&market=FR&limit=5&q=${encodeURIComponent("upc:" + upc)}`)).map((a) => ({ ...resume(a), upc: true }))); } catch (e) {}
    }
    if (artiste || titre) {
      const q = [titre && `album:"${titre}"`, artiste && `artist:"${artiste}"`].filter(Boolean).join(" ");
      out.push(...albums(await api(env, `search?type=album&market=FR&limit=10&q=${encodeURIComponent(q)}`)).map(resume));
      if (!out.length) out.push(...albums(await api(env, `search?type=album&market=FR&limit=10&q=${encodeURIComponent(`${artiste} ${titre}`)}`)).map(resume));
    }
    return json({ lecteur: "spotify", albums: out });
  } catch (e) {
    return json({ lecteur: "spotify", erreur: e.message }, 502);
  }
}
