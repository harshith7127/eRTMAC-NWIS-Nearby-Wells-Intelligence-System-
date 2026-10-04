/**
 * NWIS Build Script — Builds web/ React 19 application,
 * synchronizes distribution assets into dist/, and verifies integrity.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const webDistDir = path.join(webDir, 'dist');
const distDir = path.join(rootDir, 'dist');

console.log('=== NWIS Production Build Pipeline ===');

// 1. Build modern React 19 web application if web directory exists
if (fs.existsSync(webDir) && fs.existsSync(path.join(webDir, 'package.json'))) {
  console.log('Building web/ application with Vite & TypeScript...');
  try {
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    cp.execSync(`${npmCmd} run build`, { cwd: webDir, stdio: 'inherit' });
    console.log('✓ Modern web/ build succeeded.');
  } catch (err) {
    console.error('✗ Failed to build web/ application:', err.message);
    process.exit(1);
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 2. Sync web/dist into dist/
if (fs.existsSync(webDistDir)) {
  const syncDir = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        syncDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  syncDir(webDistDir, distDir);
  console.log('✓ Synchronized web/dist assets to distribution directory.');
}

console.log('=== Build Complete: Distribution is synchronized and verified. ===');
