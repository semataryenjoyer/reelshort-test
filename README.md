# ShortDrama Test

Static page + Vercel serverless functions over the APIShort aggregator
(DramaBox / ReelShort / DramaWave). Streams are served from third-party
CDNs via a reverse-engineered API; links may break without notice.

## Setup
1. Get a key at http://apishort.com/login (Gmail only).
2. Vercel → Settings → Environment Variables → `APISHORT_KEY`, all environments.
3. Redeploy.

## Debug
`/api/play?platform=dramabox&id=42000024934&ep=1&debug=1` dumps raw upstream JSON.