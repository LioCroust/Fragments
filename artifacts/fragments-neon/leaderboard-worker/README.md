# Fragments leaderboard Worker

This Worker is the only component allowed to write scores to the private
`LioCroust/fragments-scores` repository.

## Endpoints

- `GET /leaderboard?limit=10` returns the public top scores.
- `POST /scores` accepts `{ "pseudo": "ABC", "score": 1234, "sector": 4 }`.

Pseudos are normalized to uppercase and must use 3–8 letters, digits, `_`, or
`-`. A pseudo keeps only its best score. The Worker keeps the repository token
server-side and never sends it to the mobile app.

## Cloudflare secrets

Create the Worker secret without committing it:

```sh
wrangler secret put GITHUB_TOKEN
```

The token needs `Contents: Read and write` access to the private
`LioCroust/fragments-scores` repository only. The Worker uses an in-memory
per-IP rate limit as a first anti-abuse layer. The public client is not treated
as an authoritative game referee, so suspicious scores should still be
reviewable before being treated as definitive records.

## Local preview

```sh
wrangler dev
```

After deployment, set the Expo public variable
`EXPO_PUBLIC_LEADERBOARD_API_URL` to the Worker URL.