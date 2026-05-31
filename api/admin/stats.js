const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');
module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Icaze yoxdur.' });
  const { data: orders } = await supabase.from('orders').select('*').order('created_at',{ascending:false});
  const { count: productCount } = await supabase.from('products').select('*',{count:'exact',head:true});
  const list = orders || [];
  res.json({ balance:list.reduce((s,o)=>s+(o.total||0),0), orderCount:list.length, itemsSold:list.reduce((s,o)=>s+((o.items||[]).length),0), productCount:productCount||0, demo:!process.env.STRIPE_SECRET_KEY, recent:list.slice(0,10) });
};
