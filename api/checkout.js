const { supabase } = require('../lib/supabase');
const { makeToken } = require('../lib/auth');
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST lazimdir.' });
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'Sebet bosdur.' });
    const ids = [...new Set(items.map((i) => i.id))];
    const { data: products, error } = await supabase.from('products').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    if (!products || !products.length) return res.status(400).json({ error: 'Mehsul tapilmadi.' });
    const base = `https://${req.headers.host}`;
    if (!stripe) { const token = makeToken(ids.join('|'), 3600000); return res.json({ url: `${base}/success.html?demo=1&order=${encodeURIComponent(token)}` }); }
    const line_items = ids.map((id)=>products.find((p)=>p.id===id)).filter(Boolean).map((p)=>({ quantity:1, price_data:{ currency:p.currency, unit_amount:p.price, product_data:{ name:p.name, description:p.description||undefined } } }));
    const session = await stripe.checkout.sessions.create({ mode:'payment', line_items, success_url:`${base}/success.html?session_id={CHECKOUT_SESSION_ID}`, cancel_url:`${base}/cancel.html`, metadata:{ product_ids: ids.join(',') } });
    res.json({ url: session.url });
  } catch (e) { console.error('checkout error:', e.message); res.status(500).json({ error: e.message }); }
};
