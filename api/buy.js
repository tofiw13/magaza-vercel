// GET  → istifadəçinin tarixçəsi
// POST → balansla məhsul al (promo + loyalty points ilə)
const { supabase } = require('../lib/supabase');
const { getUser, ensureProfile } = require('../lib/user');
const { makeToken } = require('../lib/auth');

const SIGNED_URL_TTL = 3600;
const POINTS_PER_MANAT = 1; // Hər 1₼ üçün 1 xal
const POINTS_TO_MANAT = 100; // 100 xal = 1₼

module.exports = async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Əvvəlcə daxil ol.' });
  await ensureProfile(user);

  // ---------- MƏHSULLARIM ----------
  if (req.method === 'GET' && req.query.my === '1') {
    const { data: orders } = await supabase
      .from('orders').select('items,created_at,order_key')
      .like('order_key', `bal_${user.id}_%`).order('created_at', { ascending: false });
    
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
    const { data: topups } = await supabase
      .from('topups').select('amount,status,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    (topups || []).forEach((t) => {
      events.push({ type: 'topup', amount: t.amount, status: t.status, date: t.created_at });
    });
    const { data: orders } = await supabase
      .from('orders').select('items,total,created_at,order_key,status')
      .like('order_key', `bal_${user.id}_%`).order('created_at', { ascending: false });
    (orders || []).forEach((o) => {
      const names = (o.items || []).map((i) => (i.emoji || '') + ' ' + i.name).join(', ');
      events.push({ type: 'purchase', amount: o.total, names, date: o.created_at, status: o.status });
    });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ events });
  }

  // ---------- BALANSLA AL ----------
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const promoCode = req.body?.promo_code || null;
    const usePoints = req.body?.use_points || 0; // İstifadə ediləcək xallar
    
    const ids = [...new Set(items.map((i) => i.id))];
    if (!ids.length) return res.status(400).json({ error: 'Səbət boşdur.' });

    const { data: products } = await supabase.from('products').select('*').in('id', ids);
    if (!products || !products.length) return res.status(400).json({ error: 'Məhsul tapılmadı.' });
    
    // Flash sale qiymətlərini yoxla
    const now = new Date().toISOString();
    const { data: sales } = await supabase
      .from('flash_sales')
      .select('product_id, sale_price')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now);
    
    const saleMap = {};
    (sales || []).forEach(s => { saleMap[s.product_id] = s.sale_price; });

    let total = products.reduce((s, p) => {
      const price = saleMap[p.id] || p.price;
      return s + price;
    }, 0);
    let originalTotal = total;

    // Promo kod endirimi
    let discount = 0;
    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (promo) {
        if (!promo.expires_at || new Date(promo.expires_at) > new Date()) {
          if (promo.max_uses === null || promo.used_count < promo.max_uses) {
            if (total >= promo.min_order) {
              discount = Math.floor(total * promo.discount_percent / 100) + promo.discount_fixed;
              total = Math.max(0, total - discount);
              
              // Promo kod istifadə sayını artır
              await supabase
                .from('promo_codes')
                .update({ used_count: (promo.used_count || 0) + 1 })
                .eq('id', promo.id);
            }
          }
        }
      }
    }

    // Xalları yoxla və endirim et
    let pointsUsed = 0;
    let pointsDiscount = 0;
    if (usePoints > 0) {
      const { data: lp } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('user_id', user.id)
        .single();
      
      const availablePoints = lp?.points || 0;
      pointsUsed = Math.min(usePoints, availablePoints, Math.floor(total / POINTS_TO_MANAT) * POINTS_TO_MANAT);
      
      if (pointsUsed > 0) {
        pointsDiscount = Math.floor(pointsUsed / POINTS_TO_MANAT);
        total = Math.max(0, total - pointsDiscount);
      }
    }

    // Balans yoxla
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    const balance = profile?.balance || 0;
    if (balance < total) return res.status(402).json({ error: 'Balans kifayət etmir.', need: total, balance });

    // Balansdan çıx
    const upd = await supabase.from('profiles').update({ balance: balance - total }).eq('id', user.id);
    if (upd.error) return res.status(500).json({ error: upd.error.message });

    // Sifariş yarat
    const orderKey = `bal_${user.id}_${Date.now()}`;
    const orderItems = products.map((p) => ({ id: p.id, name: p.name, price: saleMap[p.id] || p.price, emoji: p.emoji }));
    const { data: order } = await supabase.from('orders').insert(
      { order_key: orderKey, items: orderItems, total, user_id: user.id, promo_code: promoCode, discount_amount: discount, points_used: pointsUsed },
      { returning: 'representation' }
    ).single();

    // Xal qazan
    const pointsEarned = Math.floor(total / 100 * POINTS_PER_MANAT);
    if (pointsEarned > 0) {
      await supabase.from('loyalty_points').upsert(
        { user_id: user.id },
        { onConflict: 'user_id' }
      );
      const { data: currentPoints } = await supabase
        .from('loyalty_points')
        .select('points, total_earned')
        .eq('user_id', user.id)
        .single();
      
      await supabase.from('loyalty_points').update({
        points: (currentPoints?.points || 0) + pointsEarned - pointsUsed,
        total_earned: (currentPoints?.total_earned || 0) + pointsEarned,
        total_spent: (currentPoints?.total_spent || 0) + pointsUsed
      }).eq('user_id', user.id);

      // Xal transaksiyası
      if (pointsEarned > 0) {
        await supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          points: pointsEarned,
          type: 'earned',
          description: `${products.map(p => p.name).join(', ')} alışı`,
          order_id: order?.id
        });
      }
      if (pointsUsed > 0) {
        await supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          points: -pointsUsed,
          type: 'spent',
          description: 'Endirim üçün istifadə edildi',
          order_id: order?.id
        });
      }
    }

    // Download linkləri
    const downloads = [];
    for (const p of products) {
      if (!p.file_path) continue;
      const t = makeToken('file:' + p.file_path, SIGNED_URL_TTL * 1000);
      downloads.push({ name: p.name, emoji: p.emoji, url: `/api/file?t=${encodeURIComponent(t)}` });
    }

    // Telegram/Email bildiriş (async)
    sendNotification(user, products, total, pointsEarned).catch(() => {});

    res.json({ 
      ok: true, 
      newBalance: balance - total, 
      downloads,
      points_earned: pointsEarned,
      discount,
      original_total: originalTotal
    });
  } catch (e) {
    console.error('buy error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// Telegram/Email bildiriş funksiyası
async function sendNotification(user, products, total, points) {
  const TG = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT = process.env.TELEGRAM_CHAT_ID;
  
  if (!TG || !ADMIN_CHAT) return;

  const text = `🛒 **Yeni Sifariş!**

👤 İstifadəçi: ${user.email}
📦 Məhsullar: ${products.map(p => p.name).join(', ')}
💰 Məbləğ: ${(total/100).toFixed(2)} ₼
⭐ Qazanılan xal: ${points}

📅 ${new Date().toLocaleString('az-AZ')}`;

  try {
    await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.error('Telegram notification error:', e.message);
  }
}
