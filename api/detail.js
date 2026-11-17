const { up, extractEpisodes, normDetail, DETAIL, EPISODES } = require('./_lib');

module.exports = async (req, res) => {
  const { platform, id, lang = 'en' } = req.query;
  if (!DETAIL[platform]) return res.status(400).json({ error: 'bad platform' });

  const d = await up(DETAIL[platform](id, lang));
  if (!d.ok) return res.status(502).json({ error: 'upstream', status: d.status, raw: d.raw });

  const meta = normDetail(d.json);
  const eps = await up(EPISODES[platform](id, lang));
  const list = eps.ok ? extractEpisodes(eps.json) : [];

  res.set('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.json({
    ...meta,
    episodeCount: list.length || Number(meta.episodes) || 0,
    platform,
    id,
    hasUrls: list.some((e) => e.url),
  });
};