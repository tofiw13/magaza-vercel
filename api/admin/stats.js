const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');
module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Icaze yoxdur.' });
  const { data: orders } = await supabase.from('orders').select('*').order('created_at',{ascending:false});
  const { count: productCount } = await supabase.from('products').select('*',{count:'exact',head:true});
  // İstifadəçilər + balansları (balansa görə sıralı)
  const { data: users } = await supabase.from('profiles').select('email,balance,created_at').order('balance',{ascending:false}).limit(100);
  const userList = users || [];
  const totalUserBalance = userList.reduce((s,u)=>s+(u.balance||0),0);
  const list = orders || [];
  res.json({
    balance:list.reduce((s,o)=>s+(o.total||0),0),
    orderCount:list.length,
    itemsSold:list.reduce((s,o)=>s+((o.items||[]).length),0),
    productCount:productCount||0,
    userCount:userList.length,
    totalUserBalance,
    demo:!process.env.STRIPE_SECRET_KEY,
    recent:list.slice(0,10),
    users:userList,
  });
};
