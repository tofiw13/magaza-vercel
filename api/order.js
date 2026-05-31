const { supabase } = require('../lib/supabase');
const { verifyToken } = require('../lib/auth');
const crypto = require('crypto');
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
const TTL = 3600;
module.exports = async (req, res) => {
  const { session_id, order } = req.query;
  let ids = [], orderKey = '';
  if (order) {
    const payload = verifyToken(order);
    if (payload === null) return res.status(403).json({ error: 'Sifaris etibarsizdir ve ya vaxti bitib.' });
    ids = payload ? payload.split('|') : [];
    orderKey = 'demo_' + crypto.createHash('sha1').update(order).digest('hex').slice(0,16);
  } else if (session_id) {
    if (!stripe) return res.status(400).json({ error: 'Stripe konfiqurasiya olunmayib.' });
    try { const s = await stripe.checkout.sessions.retrieve(session_id); if (s.payment_status !== 'paid') return res.status(402).json({ error: 'Odenis tamamlanmayib.' }); ids = (s.metadata?.product_ids||'').split(',').filter(Boolean); orderKey = session_id; }
    catch (e) { return res.status(404).json({ error: 'Sifaris tapilmadi.' }); }
  } else return res.status(400).json({ error: 'session_id ve ya order lazimdir.' });
  const { data: products } = await supabase.from('products').select('*').in('id', ids);
  const items = (products||[]).map((p)=>({ id:p.id, name:p.name, price:p.price, emoji:p.emoji }));
  const total = items.reduce((s,p)=>s+p.price,0);
  await supabase.from('orders').upsert({ order_key: orderKey, items, total }, { onConflict:'order_key', ignoreDuplicates:true });
  const downloads = [];
  for (const id of ids) { const p=(products||[]).find((x)=>x.id===id); if(!p||!p.file_path) continue; const { data, error } = await supabase.storage.from('downloads').createSignedUrl(p.file_path, TTL); if(!error && data) downloads.push({ name:p.name, emoji:p.emoji, url:data.signedUrl }); }
  res.json({ downloads });
};
