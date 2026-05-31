// Bütün admin əməliyyatları tək funksiyada (Vercel Hobby limit: 12 funksiya)
// ?action=login | stats | products | topups
const { supabase } = require('../lib/supabase');
const { makeToken, isAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  const action = req.query.action || '';

  // --- LOGIN (auth tələb olunmur) ---
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST lazımdır.' });
    const password = req.body?.password || '';
    if (password !== (process.env.ADMIN_PASSWORD || 'admin123')) {
      return res.status(401).json({ error: 'Parol yanlışdır.' });
    }
    return res.json({ token: makeToken('admin', 12 * 60 * 60 * 1000) });
  }

  // --- Bundan sonrası admin tələb edir ---
  if (!isAdmin(req)) return res.status(401).json({ error: 'İcazə yoxdur.' });

  // --- STATS (+ istifadəçilər və balansları) ---
  if (action === 'stats') {
    const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { data: users } = await supabase.from('profiles').select('email,balance,created_at').order('balance', { ascending: false }).limit(100);
    const userList = users || [];
    const list = orders || [];
    return res.json({
      balance: list.reduce((s, o) => s + (o.total || 0), 0),
      orderCount: list.length,
      itemsSold: list.reduce((s, o) => s + ((o.items || []).length), 0),
      productCount: productCount || 0,
      userCount: userList.length,
      totalUserBalance: userList.reduce((s, u) => s + (u.balance || 0), 0),
      demo: !process.env.STRIPE_SECRET_KEY,
      recent: list.slice(0, 10),
      users: userList,
    });
  }

  // --- PRODUCTS (GET/POST/PUT/DELETE) ---
  if (action === 'products') {
    const b = req.body || {};
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }
    if (req.method === 'POST') {
      const id = (b.id || '').trim() || 'mehsul-' + Date.now();
      const product = { id, name: (b.name || 'Adsız').trim(), description: (b.description || '').trim(), price: Math.max(0, Math.round(Number(b.price) || 0)), currency: (b.currency || 'usd').trim(), emoji: (b.emoji || '📦').trim(), file_path: (b.file_path || '').trim() };
      const { error } = await supabase.from('products').insert(product);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true, product });
    }
    if (req.method === 'PUT') {
      if (!b.id) return res.status(400).json({ error: 'id lazımdır.' });
      const patch = {};
      ['name', 'description', 'emoji', 'file_path'].forEach((k) => { if (b[k] !== undefined) patch[k] = String(b[k]).trim(); });
      if (b.price !== undefined) patch.price = Math.max(0, Math.round(Number(b.price) || 0));
      const { error } = await supabase.from('products').update(patch).eq('id', b.id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const id = b.id || req.query.id;
      if (!id) return res.status(400).json({ error: 'id lazımdır.' });
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    }
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  // --- TOPUPS (GET / POST approve|reject) ---
  if (action === 'topups') {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('topups').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const out = [];
      for (const t of data || []) {
        let receiptUrl = null;
        if (t.receipt_path) {
          const s = await supabase.storage.from('receipts').createSignedUrl(t.receipt_path, 3600);
          receiptUrl = s?.data?.signedUrl || null;
        }
        out.push({ ...t, receiptUrl });
      }
      return res.json(out);
    }
    if (req.method === 'POST') {
      const id = req.body?.id;
      const act = req.body?.action; // approve | reject
      if (!id || !['approve', 'reject'].includes(act)) return res.status(400).json({ error: 'id və action lazımdır.' });
      const { data: topup, error: e1 } = await supabase.from('topups').select('*').eq('id', id).single();
      if (e1 || !topup) return res.status(404).json({ error: 'Sorğu tapılmadı.' });
      if (topup.status !== 'pending') return res.status(400).json({ error: 'Bu sorğu artıq emal olunub.' });
      if (act === 'reject') {
        await supabase.from('topups').update({ status: 'rejected' }).eq('id', id);
        return res.json({ ok: true });
      }
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', topup.user_id).single();
      const newBalance = (profile?.balance || 0) + topup.amount;
      const upd = await supabase.from('profiles').update({ balance: newBalance }).eq('id', topup.user_id);
      if (upd.error) return res.status(500).json({ error: upd.error.message });
      await supabase.from('topups').update({ status: 'approved' }).eq('id', id);
      return res.json({ ok: true, newBalance });
    }
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  res.status(400).json({ error: 'Naməlum action.' });
};
