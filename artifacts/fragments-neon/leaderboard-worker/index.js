const LEADERBOARD_FILE = 'leaderboard.json';
const DEFAULT_BRANCH = 'main';
const MAX_ENTRIES = 100;
const MAX_SCORE = 1_000_000_000;
const MAX_SECTOR = 50;
const REQUEST_WINDOW_MS = 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 8;
const PSEUDO_PATTERN = /^[A-Z0-9_-]{3,8}$/;
const requestBuckets = new Map();

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/leaderboard') {
        const limit = clampInteger(url.searchParams.get('limit'), 10, 1, 50);
        const entries = await readLeaderboard(env);
        return json({ entries: entries.slice(0, limit) }, 200, origin);
      }

      if (request.method === 'POST' && url.pathname === '/scores') {
        if (!rateLimitAllows(request)) {
          return json({ error: 'rate_limited' }, 429, origin);
        }
        const body = await request.json();
        const submission = validateSubmission(body);
        if (!submission.ok) {
          return json({ error: submission.error }, 400, origin);
        }
        const result = await recordScore(env, submission.value);
        return json(result, 200, origin);
      }

      return json({ error: 'not_found' }, 404, origin);
    } catch (error) {
      console.error('leaderboard-worker-error', error);
      return json({ error: 'service_unavailable' }, 503, origin);
    }
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
}

function json(value, status, origin) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function clampInteger(rawValue, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function rateLimitAllows(request) {
  const now = Date.now();
  const key = request.headers.get('CF-Connecting-IP') || 'anonymous';
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + REQUEST_WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_SUBMISSIONS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function validateSubmission(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_body' };
  }
  const pseudo = String(body.pseudo ?? '').trim().toUpperCase();
  const score = Number(body.score);
  const sector = Number(body.sector);
  if (!PSEUDO_PATTERN.test(pseudo)) {
    return { ok: false, error: 'pseudo_must_be_3_to_8_characters' };
  }
  if (!Number.isSafeInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: 'invalid_score' };
  }
  if (!Number.isSafeInteger(sector) || sector < 1 || sector > MAX_SECTOR) {
    return { ok: false, error: 'invalid_sector' };
  }
  return { ok: true, value: { pseudo, score, sector } };
}

async function recordScore(env, submission) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readLeaderboardDocument(env);
    const previous = current.entries.find((entry) => entry.pseudo === submission.pseudo);
    const nextEntry = {
      pseudo: submission.pseudo,
      score: submission.score,
      sector: submission.sector,
      updatedAt: new Date().toISOString(),
    };
    if (previous && previous.score >= submission.score) {
      return { entries: publicEntries(current.entries), improved: false };
    }

    const nextEntries = publicEntries([
      ...current.entries.filter((entry) => entry.pseudo !== submission.pseudo),
      nextEntry,
    ]).slice(0, MAX_ENTRIES);
    const document = `${JSON.stringify({ version: 1, entries: nextEntries }, null, 2)}\n`;
    const response = await writeLeaderboardDocument(env, document, current.sha);
    if (response.ok) {
      return { entries: nextEntries.slice(0, 10), improved: true };
    }
    if (response.status !== 409) {
      throw new Error(`github-write-${response.status}`);
    }
  }
  throw new Error('github-write-conflict');
}

function publicEntries(entries) {
  return entries
    .filter((entry) => entry && PSEUDO_PATTERN.test(entry.pseudo))
    .sort((left, right) => right.score - left.score || left.pseudo.localeCompare(right.pseudo))
    .map((entry, index) => ({
      rank: index + 1,
      pseudo: entry.pseudo,
      score: entry.score,
    }));
}

async function readLeaderboard(env) {
  const document = await readLeaderboardDocument(env);
  return publicEntries(document.entries).slice(0, 50);
}

async function readLeaderboardDocument(env) {
  const response = await githubRequest(
    env,
    `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/contents/${LEADERBOARD_FILE}?ref=${env.GITHUB_BRANCH || DEFAULT_BRANCH}`,
  );
  if (response.status === 404) {
    return { sha: null, entries: [] };
  }
  if (!response.ok) throw new Error(`github-read-${response.status}`);
  const payload = await response.json();
  const decoded = decodeBase64(payload.content || '');
  let document;
  try {
    document = JSON.parse(decoded);
  } catch {
    throw new Error('leaderboard-document-invalid');
  }
  return {
    sha: payload.sha || null,
    entries: Array.isArray(document.entries) ? document.entries : [],
  };
}

async function writeLeaderboardDocument(env, document, sha) {
  const path = `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/contents/${LEADERBOARD_FILE}`;
  const body = {
    message: 'Update Fragments leaderboard',
    content: encodeBase64(document),
    branch: env.GITHUB_BRANCH || DEFAULT_BRANCH,
  };
  if (sha) body.sha = sha;
  return githubRequest(env, path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function githubRequest(env, path, options = {}) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPOSITORY) {
    throw new Error('github-worker-secrets-missing');
  }
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fragments-leaderboard-worker',
      ...(options.headers || {}),
    },
  });
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}