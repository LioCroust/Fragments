const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const projectRoot = require('node:path').resolve(__dirname, '..');
const port = Number(process.env.PORT || 8081);
const host = `http://127.0.0.1:${port}`;
const slowBundleThresholdMs = 10_000;

let metroProcess = null;
let shuttingDown = false;

function log(message, details) {
  if (details === undefined) {
    console.log(`[FragmentsNeon][metro] ${message}`);
    return;
  }
  console.log(`[FragmentsNeon][metro] ${message}`, details);
}

function pipeOutput(stream, label) {
  let pending = '';
  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) console.log(`[Metro ${label}] ${line}`);
    }
  });
  stream.on('end', () => {
    if (pending.trim()) console.log(`[Metro ${label}] ${pending}`);
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForPackager() {
  const startedAt = performance.now();
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${host}/status`, {}, 2_000);
      const body = await response.text();
      if (response.ok && body.includes('packager-status:running')) {
        log('packager ready', {
          elapsedMs: Math.round(performance.now() - startedAt),
          attempt,
          port,
        });
        return;
      }
    } catch {
      // Metro is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Metro did not become ready on port ${port} within 60 seconds`);
}

async function warmAndroidBundle() {
  const startedAt = performance.now();
  const manifestResponse = await fetchWithTimeout(
    `${host}/`,
    {
      headers: {
        Accept: 'application/expo+json, application/json',
        'Expo-Platform': 'android',
      },
    },
    10_000,
  );

  if (!manifestResponse.ok) {
    throw new Error(`Expo manifest returned HTTP ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();
  const launchAssetUrl = manifest.launchAsset?.url;
  if (!launchAssetUrl) {
    throw new Error('Expo manifest did not contain launchAsset.url');
  }

  const assetResponse = await fetchWithTimeout(launchAssetUrl, {}, 120_000);
  if (!assetResponse.ok) {
    throw new Error(`Android bundle returned HTTP ${assetResponse.status}`);
  }

  const bundle = await assetResponse.arrayBuffer();
  const elapsedMs = Math.round(performance.now() - startedAt);
  const bytes = bundle.byteLength;
  const details = { elapsedMs, bytes, launchAssetUrl };

  if (elapsedMs >= slowBundleThresholdMs) {
    console.warn(
      `[FragmentsNeon][metro] SLOW COLD ANDROID BUNDLE (${elapsedMs}ms); ` +
      'Metro cache may have been cleared or invalidated',
      details,
    );
  } else {
    log('Android bundle warmed', details);
  }
}

function stopMetro(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`received ${signal}; stopping Metro`);
  if (metroProcess && !metroProcess.killed) {
    metroProcess.kill('SIGTERM');
  }
}

async function main() {
  log('starting Metro with cache preservation', { port, projectRoot });
  metroProcess = spawn(
    'pnpm',
    ['exec', 'expo', 'start', '--localhost', '--port', String(port)],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  pipeOutput(metroProcess.stdout, 'stdout');
  pipeOutput(metroProcess.stderr, 'stderr');

  metroProcess.once('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[FragmentsNeon][metro] Metro exited unexpectedly`, {
        code,
        signal,
      });
      process.exitCode = code || 1;
    }
  });

  await waitForPackager();
  try {
    await warmAndroidBundle();
  } catch (error) {
    console.error('[FragmentsNeon][metro] bundle warmup failed', error);
  }
}

process.on('SIGINT', () => stopMetro('SIGINT'));
process.on('SIGTERM', () => stopMetro('SIGTERM'));
process.on('SIGHUP', () => stopMetro('SIGHUP'));

main().catch((error) => {
  console.error('[FragmentsNeon][metro] startup failed', error);
  stopMetro('startup failure');
  process.exitCode = 1;
});