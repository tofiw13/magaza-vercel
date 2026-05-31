const crypto = require('crypto');
const SECRET = process.env.APP_SECRET || 'dev-secret-deyis-meni';
function sign(data){ return crypto.createHmac('sha256', SECRET).update(data).digest('hex'); }
function makeToken(payload, ttlMs){ const exp = Date.now()+ttlMs; const body = `${payload}::${exp}`; return Buffer.from(`${body}::${sign(body)}`).toString('base64url'); }
function verifyToken(token){ try{ const d=Buffer.from(token,'base64url').toString('utf8'); const p=d.split('::'); if(p.length!==3) return null; const [payload,exp,sig]=p; if(sign(`${payload}::${exp}`)!==sig) return null; if(Date.now()>Number(exp)) return null; return payload; }catch{ return null; } }
function isAdmin(req){ const a=req.headers.authorization||''; const t=a.startsWith('Bearer ')?a.slice(7):''; return verifyToken(t)==='admin'; }
module.exports = { sign, makeToken, verifyToken, isAdmin };
