const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price,currency,emoji,rating_sum,rating_count')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  // Hər məhsula orta reytinqi əlavə et (rating_avg)
  const out = (data || []).map((p) => {
    const count = p.rating_count || 0;
    const avg = count ? (p.rating_sum || 0) / count : 0;
    return {
      id: p.id, name: p.name, description: p.description,
      price: p.price, currency: p.currency, emoji: p.emoji,
      rating_avg: Math.round(avg * 10) / 10, // 1 onluq dəqiqlik
      rating_count: count,
    };
  });
  res.json(out);
};
