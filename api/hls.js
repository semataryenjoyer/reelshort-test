module.exports = async (req, res) => {
  const target = decodeURIComponent(req.query.u || '');
  if (!/^https?:\/\//.test(target)) return res.status(400).send('bad url');

  let headers = {};
  try {
    headers = JSON.parse(Buffer.from(String(req.query.t || ''), 'base64url').toString());
  } catch {}
  if (req.headers.range) headers.Range = req.headers.range;

  const r = await fetch(target, { headers });
  if (!r.ok) return res.status(r.status).send(`upstream ${r.status}`);

  if (/\.m3u8(\?|$)/i.test(target)) {
    const base = target.slice(0, target.lastIndexOf('/') + 1);
    const body = await r.text();
    const out = body.replace(/^(?!#)(\S+)$/gm, (line) => {
      const abs = /^https?:\/\//.test(line) ? line : base + line;
      return `/api/hls?u=${encodeURIComponent(abs)}&t=${req.query.t || ''}`;
    });
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.set('Cache-Control', 's-maxage=60');
    return res.send(out);
  }

  res.set('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
  const cr = r.headers.get('content-range');
  if (cr) res.set('Content-Range', cr);
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(Buffer.from(await r.arrayBuffer()));
};