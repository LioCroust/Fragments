const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packagePath = path.join(projectRoot, 'package.json');
const lockfilePath = path.resolve(projectRoot, '..', '..', 'pnpm-lock.yaml');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lockfile = fs.readFileSync(lockfilePath, 'utf8');
const importerHeader = '  artifacts/fragments-neon:\n';
const importerStart = lockfile.indexOf(importerHeader);
const importerContentStart = importerStart >= 0
  ? importerStart + importerHeader.length
  : -1;
const remainder = importerContentStart >= 0
  ? lockfile.slice(importerContentStart)
  : '';
const nextImporterOffset = remainder.search(/\n  [^ \n]/);
const importer = importerContentStart >= 0
  ? remainder.slice(0, nextImporterOffset >= 0 ? nextImporterOffset : undefined)
  : '';

const trackedPackages = [
  'expo',
  'expo-router',
  'expo-asset',
  'expo-audio',
  'react',
  'react-native',
];

const lockSpecifierFor = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = importer.match(
    new RegExp(`^      ${escapedName}:\\n        specifier: (.+)$`, 'm'),
  );
  return match?.[1] ?? null;
};

const packageSpecFor = (name) => (
  packageJson.dependencies?.[name]
  ?? packageJson.devDependencies?.[name]
  ?? null
);

console.log('[FragmentsNeon][preflight] startup diagnostics');
console.log('[FragmentsNeon][preflight] runtime', {
  node: process.version,
  platform: process.platform,
  cwd: projectRoot,
  port: process.env.PORT ?? null,
  hasExpoProxyDomain: Boolean(process.env.REPLIT_EXPO_DEV_DOMAIN),
  hasDevDomain: Boolean(process.env.REPLIT_DEV_DOMAIN),
  hasReplitId: Boolean(process.env.REPL_ID),
});

for (const name of trackedPackages) {
  const packageSpecifier = packageSpecFor(name);
  const lockSpecifier = lockSpecifierFor(name);
  const aligned = packageSpecifier === lockSpecifier;
  console.log(`[FragmentsNeon][preflight] dependency ${name}`, {
    packageSpecifier,
    lockSpecifier,
    aligned,
  });
  if (!aligned) {
    console.error(
      `[FragmentsNeon][preflight] dependency mismatch for ${name}; ` +
      'package.json and pnpm-lock.yaml may be out of sync',
    );
  }
}

for (const requiredPath of ['app.json', 'app/index.tsx', 'node_modules/expo-router/entry.js']) {
  const exists = fs.existsSync(path.join(projectRoot, requiredPath));
  console.log('[FragmentsNeon][preflight] required path', { path: requiredPath, exists });
  if (!exists) {
    console.error(`[FragmentsNeon][preflight] missing required path: ${requiredPath}`);
  }
}