// Wishlist (Sevimlilər) API
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Daxil olun.' });

  // GET - Wishlist-i göstər
  if (req.method === 'GET') {
    try {
      const { data } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id);
      
      const items = (data || []).map(w => w.product_id);
      res.json({ items });
    } catch (e) {
      res.status(500).json({ error: 'Xəta baş verdi.' });
    }
  }

  // POST - Wishlist-ə əlavə et
  else if (req.method === 'POST') {
    const { product_id } = req.body || {};
    if (!product_id) return res.status(400).json({ error: 'Məhsul ID lazımdır.' });

    try {
      // Məhsulun olub-olmadığını yoxla
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .single();
      
      if (!product) return res.status(404).json({ error: 'Məhsul tapılmadı.' });

      // Wishlist-ə əlavə et
      const { error } = await supabase
        .from('wishlists')
        .insert({ user_id: user.id, product_id })
        .onConflict('user_id,product_id')
        .ignoreDuplicates();

      if (error) throw error;
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Əlavə edilərkən xəta.' });
    }
  }

  // DELETE - Wishlist-dən sil
  else if (req.method === 'DELETE') {
    const { product_id } = req.body || {};
    if (!product_id) return res.status(400).json({ error: 'Məhsul ID lazımdır.' });

    try {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product_id);
      
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Silinərkən xəta.' });
    }
  }

  else {
    res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }
};
