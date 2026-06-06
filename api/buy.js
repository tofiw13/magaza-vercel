// GET  → istifadəçinin tarixçəsi (balans artırma + alınan məhsullar)
// POST → balansla məhsul al
const { supabase } = require('../lib/supabase');
const { getUser, ensureProfile } = require('../lib/user');
const { makeToken } = require('../lib/auth');

const SIGNED_URL_TTL = 3600;

module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Əvvəlcə daxil ol.' });
  await ensureProfile(user);

  // ---------- MƏHSULLARIM (alınan məhsullar + yenidən yükləmə) ----------
  if (req.method === 'GET' && req.query.my === '1') {
    const { data: orders } = await supabase
      .from('orders').select('items,created_at,order_key')
      .like('order_key', `bal_${user.id}_%`).order('created_at', { ascending: false });
    // Təkrarsız məhsul siyahısı (ən son alınma tarixi ilə)
    const seen = {};
    (orders || []).forEach((o) => {
      (o.items || []).forEach((it) => {
        if (!seen[it.id]) seen[it.id] = { id: it.id, name: it.name, emoji: it.emoji, date: o.created_at };
      });
    });
    const ids = Object.keys(seen);
    const owned = [];
    if (ids.length) {
      const { data: products } = await supabase.from('products').select('id,file_path').in('id', ids);
      const fileMap = {};
      (products || []).forEach((p) => { fileMap[p.id] = p.file_path; });
      ids.forEach((id) => {
        const fp = fileMap[id];
        let url = null;
        if (fp) {
          const t = makeToken('file:' + fp, SIGNED_URL_TTL * 1000);
          url = `/api/file?t=${encodeURIComponent(t)}`;
        }
        owned.push({ ...seen[id], url });
      });
    }
    return res.json({ owned });
  }

  // ---------- TARİXÇƏ ----------
  if (req.method === 'GET') {
    const events = [];
    // 1) Balans artırma sorğuları
    const { data: topups } = await supabase
      .from('topups').select('amount,status,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    (topups || []).forEach((t) => {
      events.push({ type: 'topup', amount: t.amount, status: t.status, date: t.created_at });
    });
    // 2) Alışlar (order_key = "bal_<userid>_<time>")
    const { data: orders } = await supabase
      .from('orders').select('items,total,created_at,order_key')
      .like('order_key', `bal_${user.id}_%`).order('created_at', { ascending: false });
    (orders || []).forEach((o) => {
      const names = (o.items || []).map((i) => (i.emoji || '') + ' ' + i.name).join(', ');
      events.push({ type: 'purchase', amount: o.total, names, date: o.created_at });
    });
    // Tarixə görə sırala (yeni → köhnə)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ events });
  }

  // ---------- BALANSLA AL ----------
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(items.map((i) => i.id))];
    if (!ids.length) return res.status(400).json({ error: 'Səbət boşdur.' });

    const { data: products } = await supabase.from('products').select('*').in('id', ids);
    if (!products || !products.length) return res.status(400).json({ error: 'Məhsul tapılmadı.' });
    const subtotal = products.reduce((s, p) => s + p.price, 0);

    // ----- PROMO KOD (varsa) -----
    const promoCodeRaw = (req.body?.promo_code || '').toString().trim().toUpperCase();
    let discount = 0;            // sent ilə endirim
    let appliedPromo = null;     // tətbiq olunan kod
    if (promoCodeRaw) {
      const { data: promo } = await supabase
        .from('promo_codes').select('*').eq('code', promoCodeRaw).maybeSingle();
      const valid = promo && promo.active
        && (!promo.expires_at || new Date(promo.expires_at) >= new Date())
        && (promo.max_uses == null || promo.used_count < promo.max_uses);
      if (valid) {
        discount = Math.floor(subtotal * promo.discount_percent / 100);
        appliedPromo = promo;
      }
    }

    // ----- XAL İSTİFADƏSİ (varsa) -----
    // use_points: istifadəçinin istifadə etmək istədiyi xal sayı (1 xal = 1 qəpik)
    const { data: profile } = await supabase
      .from('profiles').select('balance,points').eq('id', user.id).single();
    const balance = profile?.balance || 0;
    const availablePoints = profile?.points || 0;

    const afterPromo = Math.max(0, subtotal - discount);
    let pointsUsed = parseInt(req.body?.use_points, 10) || 0;
    if (pointsUsed < 0) pointsUsed = 0;
    // Xal nə mövcud xaldan, nə də qiymətdən çox ola bilməz
    pointsUsed = Math.min(pointsUsed, availablePoints, afterPromo);

    const total = Math.max(0, afterPromo - pointsUsed);

    if (balance < total) return res.status(402).json({ error: 'Balans kifayət etmir.', need: total, balance });

    // ----- XAL QAZAN (5% cashback, son ödənilən məbləğdən) -----
    const earnedPoints = Math.floor(total * 0.05);

    // ----- profiles yenilə: balans çıx, xal (istifadə olunan çıx + qazanılan əlavə) -----
    const newBalance = balance - total;
    const newPoints = availablePoints - pointsUsed + earnedPoints;
    const upd = await supabase.from('profiles')
      .update({ balance: newBalance, points: newPoints }).eq('id', user.id);
    if (upd.error) return res.status(500).json({ error: upd.error.message });

    // ----- promo istifadə sayını artır -----
    if (appliedPromo) {
      await supabase.from('promo_codes')
        .update({ used_count: (appliedPromo.used_count || 0) + 1 })
        .eq('code', appliedPromo.code);
    }

    const orderKey = `bal_${user.id}_${Date.now()}`;
    const orderItems = products.map((p) => ({ id: p.id, name: p.name, price: p.price, emoji: p.emoji }));
    await supabase.from('orders').upsert(
      { order_key: orderKey, items: orderItems, total },
      { onConflict: 'order_key', ignoreDuplicates: true }
    );

    const downloads = [];
    for (const p of products) {
      if (!p.file_path) continue;
      const t = makeToken('file:' + p.file_path, SIGNED_URL_TTL * 1000);
      downloads.push({ name: p.name, emoji: p.emoji, url: `/api/file?t=${encodeURIComponent(t)}` });
    }

    res.json({
      ok: true,
      newBalance,
      downloads,
      discount,                       // tətbiq olunan promo endirimi (sent)
      pointsUsed,                     // istifadə olunan xal
      earnedPoints,                   // qazanılan xal
      newPoints,                      // yekun xal balansı
      promoApplied: appliedPromo ? appliedPromo.code : null,
    });
  } catch (e) {
    console.error('buy error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
