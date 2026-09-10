const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const UPLOAD_ROOT = '/home/aims/uploads';
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

function authed(req) {
  try {
    let t = (req.headers.authorization || '').replace(/^Bearer /, '') || req.query.token || '';
    if (!t) return false;
    jwt.verify(t, process.env.JWTSECRET);
    return true;
  } catch (e) { return false; }
}

function safeKey(k) {
  if (!k || k.includes('..') || k.startsWith('/') || k.includes('\\')) return null;
  return k;
}

function mountLocalStorage(app) {
  // browser PUT (rewritten by frontend interceptor from S3 presigned PUT)
  app.put('/api/put/localBinary', express.raw({ type: () => true, limit: '200mb' }), (req, res) => {
    if (!authed(req)) return res.status(401).end();
    const key = safeKey(req.query.key);
    if (!key) return res.status(400).end();
    const fp = path.join(UPLOAD_ROOT, key);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, req.body);
    res.status(200).end(); // mimic S3 PUT success (empty 200)
  });

  // download/view local files
  app.get('/api/get/localFile', (req, res) => {
    if (!authed(req)) return res.status(401).json({ response: false });
    const key = safeKey(req.query.key);
    if (!key) return res.status(400).json({ response: false });
    const fp = path.join(UPLOAD_ROOT, key);
    if (!fs.existsSync(fp)) return res.status(404).json({ response: false });
    res.sendFile(fp);
  });
}

module.exports = { mountLocalStorage, UPLOAD_ROOT };
