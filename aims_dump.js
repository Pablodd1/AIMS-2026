const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const dbjs = fs.readFileSync('/home/aims/aims-backend-node.js/config/db.js', 'utf8');
const m = dbjs.match(/mongodb\+srv:\/\/[^"\s]+/);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `/home/aims/backups/${stamp}`;
fs.mkdirSync(outDir, { recursive: true });

// type-preserving serialization without bson EJSON: wrap specials in markers
function ser(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof ObjectId) return { $oid: v.toHexString() };
  if (v instanceof Date) return { $date: v.toISOString() };
  if (typeof v === 'number' && !isFinite(v)) return { $num: String(v) };
  if (Buffer.isBuffer(v)) return { $binary: v.toString('base64') };
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = ser(v[k]);
    return o;
  }
  return v;
}

(async () => {
  await mongoose.connect(m[0], { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  let total = 0;
  for (const c of cols) {
    const name = c.name;
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(docs.map(ser)));
    total += docs.length;
    console.log(`dumped ${name}: ${docs.length} docs`);
  }
  console.log(`TOTAL: ${total} docs -> ${outDir}`);
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
