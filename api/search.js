const { up } = require('./_lib');

module.exports = async (req, res) => {
  const { platform = 'dramabox', q, lang = 'en' } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });

  const paths = {
    dramabox: `/dramabox/api/dramabox/search?query=${encodeURIComponent(q)}&lang=${lang}`,
    reelshort: `/reelshort/search?q=${encodeURIComponent(q)}&lang=${lang}`,
    dramawave: `/dramawave/api/search?q=${encodeURIComponent(q)}&lang=${lang}`,
  };
  if (!paths[platform]) return res.status(400).json({ error: 'bad platform' });

  const r = await up(paths[platform]);
  if (!r.ok) return res.status(502).json({ error: 'upstream', raw: r.raw });

  const out = [];
  const seen = new Set();
  const walk = (n, d = 0) => {
    if (d > 8 || !n || typeof n !== 'object') return;
    if (n.id && n.title && !seen.has(String(n.id))) {
      seen.add(String(n.id));
      out.push({ id: String(n.id), title: String(n.title), cover: n.cover || n.coverUrl || null });
    }
    Object.values(n).forEach((v) =>
      Array.isArray(v) ? v.forEach((x) => walk(x, d + 1)) : walk(v, d + 1)
    );
  };
  walk(r.json);
  res.json({ results: out.slice(0, 24) });
};