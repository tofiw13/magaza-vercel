// Reytinq (Ulduzlu qiymətləndirmə) API
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Məhsulun reytinqləri
  if (req.method === 'GET') {
    const { product_id } = req.query;
    if (!product_id) return res.status(400).json({ error: 'product_id lazımdır.' });

    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating, review, created_at')
        .eq('product_id', product_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const avg = data.length > 0 
        ? data.reduce((s, r) => s + r.rating, 0) / data.length 
        : 0;
      
      res.json({ ratings: data, average: avg.toFixed(1), count: data.length });
    } catch (e) {
      res.status(500).json({ error: 'Xəta baş verdi.' });
    }
  }

  // POST - Reytinq əlavə et / yenilə
  else if (req.method === 'POST') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Daxil olun.' });

    const { product_id, rating, review } = req.body || {};
    if (!product_id || !rating) {
      return res.status(400).json({ error: 'product_id və rating lazımdır.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating 1-5 arası olmalıdır.' });
    }

    try {
      // Məhsulun alınıb-alınmadığını yoxla (optional)
      // const { data: owned } = await supabase...

      // Upsert (varsa yenilə, yoxdursa yarat)
      const { error } = await supabase
        .from('ratings')
        .upsert(
          { 
            user_id: user.id, 
            product_id, 
            rating, 
            review: review || '',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,product_id' }
        );

      if (error) throw error;
      res.json({ ok: true, rating, review });
    } catch (e) {
      res.status(500).json({ error: 'Reytinq verilərkən xəta.' });
    }
  }

  else {
    res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }
};
