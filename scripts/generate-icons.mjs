// Erzeugt die PNG-App-Icons (Hantel auf olivgrünem Grund) ohne externe Bibliotheken.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [90, 107, 43];
const FG = [255, 255, 255];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// Hantel in normierten Koordinaten (0..1), mittig; `scale` verkleinert für maskable Icons.
function isDumbbell(x, y, scale) {
  const u = (x - 0.5) / scale + 0.5;
  const v = (y - 0.5) / scale + 0.5;
  const rect = (x0, x1, h) => u >= x0 && u <= x1 && Math.abs(v - 0.5) <= h / 2;
  return (
    rect(0.3, 0.7, 0.06) || // Stange
    rect(0.2, 0.28, 0.44) || rect(0.72, 0.8, 0.44) || // große Scheiben
    rect(0.12, 0.2, 0.3) || rect(0.8, 0.88, 0.3) // kleine Scheiben
  );
}

function png(size, scale) {
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      // 3x3 Supersampling für weiche Kanten
      let hits = 0;
      for (let sy = 0; sy < 3; sy++)
        for (let sx = 0; sx < 3; sx++)
          if (isDumbbell((px + (sx + 0.5) / 3) / size, (py + (sy + 0.5) / 3) / size, scale)) hits++;
      const a = hits / 9;
      for (let c = 0; c < 3; c++) row[1 + px * 3 + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('pwa-192x192.png', out), png(192, 1));
writeFileSync(new URL('pwa-512x512.png', out), png(512, 1));
writeFileSync(new URL('maskable-512x512.png', out), png(512, 0.75));
writeFileSync(new URL('apple-touch-icon.png', out), png(180, 0.85));
console.log('Icons erzeugt.');
