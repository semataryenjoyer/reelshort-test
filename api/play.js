const { up, extractEpisodes, EPISODES } = require('./_lib');

module.exports = async (req, res) => {
  const { platform, id, ep = '1', lang = 'en', debug } = req.query;
  if (!EPISODES[platform]) return res.status(400).json({ error: 'bad platform' });

  const r = await up(EPISODES[platform](id, lang));
  if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status, raw: r.raw });

  const list = extractEpisodes(r.json);
  if (debug) return res.json({ count: list.length, sample: list.slice(0, 3), raw: r.json });

  const hit = list[Number(ep) - 1];
  if (!hit?.url) {
    return res.status(404).json({
      error: 'no media url found',
      found: list.length,
      hint: 'add ?debug=1 and inspect raw JSON',
    });
  }

  const headers = {
    Referer: 'https://www.reelshort.com/',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  };
  const token = Buffer.from(JSON.stringify(headers)).toString('base64url');
  res.json({
    url: `/api/hls?u=${encodeURIComponent(hit.url)}&t=${token}`,
    kind: hit.url.includes('.m3u8') ? 'hls' : 'file',
    episode: hit.index,
    total: list.length,
  });
};