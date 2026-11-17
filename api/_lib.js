const BASE = 'https://apishort.com/v1';

const DETAIL = {
  dramabox: (id, lang) => `/dramabox/api/dramabox/detail?bookId=${id}&lang=${lang}`,
  reelshort: (id, lang) => `/reelshort/detail/${id}?lang=${lang}`,
  dramawave: (id, lang) => `/dramawave/api/drama/${id}?lang=${lang}`,
};

const EPISODES = {
  dramabox: (id) => `/dramabox/api/dramabox/allepisode?bookId=${id}`,
  reelshort: (id, lang) => `/reelshort/allepisodes/${id}?lang=${lang}`,
  dramawave: (id, lang) => `/dramawave/api/drama/${id}?lang=${lang}`,
};

const MEDIA_RE = /^https?:\/\/.+(\.m3u8|\.mp4|\.webm)(\?|$)/i;
const URL_KEY_RE = /(url|src|play|video|m3u8|mp4|stream)/i;
const EP_KEY_RE = /(ep|chapter|index|sort|order|seq)/i;

async function up(path) {
  const key = process.env.APISHORT_KEY;
  if (!key) return { ok: false, status: 500, raw: 'APISHORT_KEY not set' };
  const r = await fetch(BASE + path, {
    headers: { 'X-API-Key': key, Accept: 'application/json' },
  });
  const text = await r.text();
  try {
    return { ok: r.ok, status: r.status, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: r.status, raw: text.slice(0, 4000) };
  }
}

function mediaUrlOf(node) {
  if (!node || typeof node !== 'object') return null;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && MEDIA_RE.test(v) && URL_KEY_RE.test(k)) return v;
  }
  for (const v of Object.values(node)) {
    if (typeof v === 'string' && MEDIA_RE.test(v)) return v;
  }
  return null;
}

function walk(node, visit, depth = 0) {
  if (depth > 8 || !node || typeof node !== 'object') return;
  visit(node);
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) v.forEach((x) => walk(x, visit, depth + 1));
    else if (v && typeof v === 'object') walk(v, visit, depth + 1);
  }
}

function extractEpisodes(json) {
  let best = null;
  walk(json, (node) => {
    for (const v of Object.values(node)) {
      if (!Array.isArray(v) || v.length < 2) continue;
      const objs = v.filter((x) => x && typeof x === 'object');
      if (objs.length < 2) continue;
      const hasMedia = objs.some((o) => mediaUrlOf(o));
      const hasEpKey = objs.some((o) => Object.keys(o).some((k) => EP_KEY_RE.test(k)));
      if ((hasMedia || hasEpKey) && (!best || v.length > best.length)) best = v;
    }
  });
  if (!best) return [];
  return best.map((o, i) => ({ index: i + 1, url: mediaUrlOf(o) || null }));
}

function normDetail(json) {
  const d = json?.data || json;
  const pick = (re) => {
    let found = null;
    walk(d, (n) => {
      if (found) return;
      for (const [k, v] of Object.entries(n)) {
        if (re.test(k) && (typeof v === 'string' || typeof v === 'number')) found = v;
      }
    });
    return found;
  };
  return {
    title: pick(/^(title|bookName|name|dramaName)$/i) || 'Untitled',
    cover: pick(/^(cover|coverUrl|image|thumbnail|poster)$/i) || null,
    synopsis: pick(/^(synopsis|description|intro|summary)$/i) || '',
    episodes: pick(/^(chapterCount|totalEpisodes|episodeCount|total)$/i) || null,
  };
}

module.exports = { up, extractEpisodes, normDetail, DETAIL, EPISODES };