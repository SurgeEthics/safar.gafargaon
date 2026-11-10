import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.cwd();
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.aistudio',
  '.playwright-cli',
  'dev-dist',
  'aistudio',
]);
const EXCLUDE_EXTENSIONS = new Set(['.zip', '.log', '.map']);
const EXCLUDE_FILES = new Set(['.DS_Store', 'Thumbs.db']);

const ZIP_NAMES = [
  'safar-gafargaon-clean-source.zip',
  'safar-gafargaon-latest.zip',
  'safar-gafargaon-final.zip',
  'safar-app.zip',
  'safar-gafargaon.zip',
];

// Precompute IEEE 802.3 CRC-32 lookup table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

function collectFiles(dir, relBase = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (EXCLUDE_FILES.has(entry.name)) continue;
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      if (relPath === 'public/assets/aistudio' || relPath.endsWith('/aistudio')) {
        continue;
      }
      results.push(...collectFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXCLUDE_EXTENSIONS.has(ext)) continue;
      results.push({ fullPath, relPath });
    }
  }

  return results;
}

function buildZipBuffer(fileEntries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const item of fileEntries) {
    const raw = fs.readFileSync(item.fullPath);
    const stat = fs.statSync(item.fullPath);
    const { dosTime, dosDate } = toDosTimeDate(stat.mtime);
    const fileCrc = crc32(raw);

    // Compress using raw deflate; fallback to store (0) if compressed isn't smaller
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    const nameBuf = Buffer.from(item.relPath.replace(/\\/g, '/'), 'utf8');

    // Local File Header (30 bytes)
    const localHeader = Buffer.allocUnsafe(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(payload.length >>> 0, 18);
    localHeader.writeUInt32LE(raw.length >>> 0, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, payload);

    // Central Directory File Header (46 bytes)
    const centralHeader = Buffer.allocUnsafe(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(fileCrc, 16);
    centralHeader.writeUInt32LE(payload.length >>> 0, 20);
    centralHeader.writeUInt32LE(raw.length >>> 0, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(((stat.mode & 0xffff) << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(offset >>> 0, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.allocUnsafe(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length >>> 0, 12);
  eocd.writeUInt32LE(offset >>> 0, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function main() {
  // Remove stale zips before scanning files
  for (const dir of ['public', 'dist']) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (file.endsWith('.zip')) {
        fs.rmSync(path.join(dirPath, file), { force: true });
      }
    }
  }

  const files = collectFiles(ROOT_DIR);
  const zipBuffer = buildZipBuffer(files);

  if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
    throw new Error('Generated ZIP failed PK header sanity check');
  }

  const sizeMb = zipBuffer.length / (1024 * 1024);
  if (sizeMb > 24.5) {
    throw new Error(`Generated ZIP (${sizeMb.toFixed(2)} MB) exceeds Cloudflare Pages 25 MB limit`);
  }

  const targetDirs = ['public'];
  if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
    targetDirs.push('dist');
  }

  for (const dir of targetDirs) {
    for (const zipName of ZIP_NAMES) {
      fs.writeFileSync(path.join(ROOT_DIR, dir, zipName), zipBuffer);
    }
  }

  console.log(`✅ Created clean project archives (${sizeMb.toFixed(2)} MB, ${files.length} files) in ${targetDirs.join(' & ')}`);
}

main();
