// Faylı düzgün content-type ilə servis edir (HTML → səhifə kimi açılır, CSV → endirilir)
const { supabase } = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');

const TYPES = {
  html: { ct: 'text/html; charset=utf-8', inline: true },
  csv:  { ct: 'text/csv; charset=utf-8', inline: false },
  md:   { ct: 'text/html; charset=utf-8', inline: true }, // markdown → gözəl HTML
  pdf:  { ct: 'application/pdf', inline: true },
  txt:  { ct: 'text/plain; charset=utf-8', inline: true },
};

// Sadə markdown → HTML çevirici (oxunaqlı e-kitab üçün)
function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = md.split('\n');
  let html = '', inList = false;
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  for (let raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) { if (inList){html+='</ul>';inList=false;} html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`; }
    else if (/^##\s+/.test(line)) { if (inList){html+='</ul>';inList=false;} html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`; }
    else if (/^#\s+/.test(line)) { if (inList){html+='</ul>';inList=false;} html += `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`; }
    else if (/^>\s+/.test(line)) { if (inList){html+='</ul>';inList=false;} html += `<blockquote>${inline(line.replace(/^>\s+/, ''))}</blockquote>`; }
    else if (/^[-*]\s+/.test(line)) { if (!inList){html+='<ul>';inList=true;} html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`; }
    else if (/^---+$/.test(line)) { if (inList){html+='</ul>';inList=false;} html += '<hr>'; }
    else if (line === '') { if (inList){html+='</ul>';inList=false;} }
    else { if (inList){html+='</ul>';inList=false;} html += `<p>${inline(line)}</p>`; }
  }
  if (inList) html += '</ul>';
  return `<!DOCTYPE html><html lang="az"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-kitab</title>
<style>@media print{.bar{display:none}}body{background:#f1f5f9;margin:0;color:#1e293b;font-family:'Segoe UI',system-ui,sans-serif;line-height:1.7}
.bar{position:sticky;top:0;background:#1e293b;padding:12px 20px;text-align:center}.bar button{background:#22c55e;color:#06231a;border:none;padding:9px 18px;border-radius:8px;font-weight:700;cursor:pointer}
.doc{max-width:760px;margin:18px auto 30px;background:#fff;padding:50px 56px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
h1{font-size:30px;color:#0f172a;margin:18px 0 10px}h2{font-size:21px;color:#2563eb;margin:26px 0 10px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
h3{font-size:16px;color:#1e293b;margin:18px 0 8px}p{margin:9px 0}ul{margin:9px 0 9px 22px}li{margin:5px 0}
blockquote{border-left:4px solid #2563eb;background:#eff6ff;padding:12px 16px;margin:14px 0;border-radius:6px;color:#1e40af}
hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0}code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.9em}</style></head>
<body><div class="bar"><button onclick="window.print()">PDF kimi yukle</button></div><div class="doc">${html}</div></body></html>`;
}

module.exports = async (req, res) => {
  const token = req.query.t || '';
  const payload = verifyToken(token);
  if (payload === null || !payload.startsWith('file:')) {
    return res.status(403).send('Keçərsiz və ya vaxtı bitmiş link.');
  }
  const path = payload.slice(5);
  const ext = (path.split('.').pop() || '').toLowerCase();
  const conf = TYPES[ext] || { ct: 'application/octet-stream', inline: false };

  try {
    const { data, error } = await supabase.storage.from('downloads').download(path);
    if (error || !data) return res.status(404).send('Fayl tapılmadı.');
    let buf = Buffer.from(await data.arrayBuffer());

    if (ext === 'md') {
      buf = Buffer.from(mdToHtml(buf.toString('utf8')), 'utf8');
    }

    const fname = path.split('/').pop();
    res.setHeader('Content-Type', conf.ct);
    res.setHeader('Content-Disposition', `${conf.inline ? 'inline' : 'attachment'}; filename="${fname}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(200).send(buf);
  } catch (e) {
    console.error('file error:', e.message);
    res.status(500).send('Fayl servis edilmədi.');
  }
};
