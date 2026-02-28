/**
 * package.js — build + zip the Electron app without needing Developer Mode.
 *
 * electron-builder's full pipeline (portable/nsis) requires winCodeSign to update
 * the exe's embedded metadata. That tool contains macOS symlinks which Windows
 * blocks without Developer Mode or admin rights. This script works around it by:
 *   1. Compiling main process (tsc) + renderer (vite)
 *   2. Running electron-builder --dir (produces win-unpacked, ignores winCodeSign error)
 *   3. Zipping win-unpacked with PowerShell's Compress-Archive
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const UNPACKED = path.join(ROOT, 'release', 'win-unpacked');
const ZIP_OUT = path.join(ROOT, 'release', 'Improved-Paint.zip');

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runIgnoreError(cmd, args = []) {
  spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: true });
}

console.log('\n── Step 1: Compile main process ──');
run('npx', ['tsc', '-p', 'tsconfig.main.json']);

console.log('\n── Step 2: Build renderer ──');
run('npx', ['vite', 'build']);

console.log('\n── Step 3: Package to directory ──');
runIgnoreError('npx', ['electron-builder', '--win', '--dir', '--publish=never']);

if (!fs.existsSync(UNPACKED)) {
  console.error('\nBuild failed: release/win-unpacked was not created.');
  process.exit(1);
}

console.log('\n── Step 4: Create zip ──');
const ps = [
  `Remove-Item -Path '${ZIP_OUT}' -ErrorAction SilentlyContinue`,
  `Compress-Archive -Path '${UNPACKED}\\*' -DestinationPath '${ZIP_OUT}'`,
  `Write-Host ''`,
  `Write-Host '✓ Done! Share this file with friends:'`,
  `Write-Host '  ${ZIP_OUT}'`,
  `Write-Host ''`,
  `Write-Host 'Friends extract the zip and run: Improved Paint.exe'`,
].join('; ');

run('powershell', ['-NoProfile', '-Command', ps]);
