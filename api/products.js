const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price,currency,emoji,rating_sum,rating_count,sale_price,sale_ends_at')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const now = Date.now();
  const out = (data || []).map((p) => {
    const count = p.rating_count || 0;
    const avg = count ? (p.rating_sum || 0) / count : 0;
    // Müddətli endirim aktivdirmi? (sale_price var və (sale_ends_at yoxdur və ya gələcəkdədir))
    const saleActive = p.sale_price != null && p.sale_price < p.price &&
      (!p.sale_ends_at || new Date(p.sale_ends_at).getTime() > now);
    return {
      id: p.id, name: p.name, description: p.description,
      price: p.price, currency: p.currency, emoji: p.emoji,
      rating_avg: Math.round(avg * 10) / 10,
      rating_count: count,
      sale_price: saleActive ? p.sale_price : null,
      sale_ends_at: saleActive ? p.sale_ends_at : null,
    };
  });
  res.json(out);
};
