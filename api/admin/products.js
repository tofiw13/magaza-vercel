const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');
module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Icaze yoxdur.' });
  const b = req.body || {};
  if (req.method === 'GET') { const { data, error } = await supabase.from('products').select('*').order('created_at',{ascending:true}); if(error) return res.status(500).json({error:error.message}); return res.json(data||[]); }
  if (req.method === 'POST') { const id=(b.id||'').trim()||'mehsul-'+Date.now(); const product={ id, name:(b.name||'Adsiz').trim(), description:(b.description||'').trim(), price:Math.max(0,Math.round(Number(b.price)||0)), currency:(b.currency||'usd').trim(), emoji:(b.emoji||'📦').trim(), file_path:(b.file_path||'').trim() }; const { error } = await supabase.from('products').insert(product); if(error) return res.status(400).json({error:error.message}); return res.json({ok:true,product}); }
  if (req.method === 'PUT') { if(!b.id) return res.status(400).json({error:'id lazimdir.'}); const patch={}; ['name','description','emoji','file_path'].forEach((k)=>{ if(b[k]!==undefined) patch[k]=String(b[k]).trim(); }); if(b.price!==undefined) patch.price=Math.max(0,Math.round(Number(b.price)||0)); const { error } = await supabase.from('products').update(patch).eq('id',b.id); if(error) return res.status(400).json({error:error.message}); return res.json({ok:true}); }
  if (req.method === 'DELETE') { const id=b.id||req.query.id; if(!id) return res.status(400).json({error:'id lazimdir.'}); const { error } = await supabase.from('products').delete().eq('id',id); if(error) return res.status(400).json({error:error.message}); return res.json({ok:true}); }
  res.status(405).json({ error: 'Metod destekenmir.' });
};
