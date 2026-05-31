const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  const { data, error } = await supabase.from('products').select('id,name,description,price,currency,emoji').order('created_at',{ascending:true});
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
};
