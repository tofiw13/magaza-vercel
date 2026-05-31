// Frontend üçün açıq konfiqurasiya (anon açar + ödəniş məlumatı)
module.exports = (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    paymentInfo: process.env.PAYMENT_INFO || 'Kapital Bank · 4169 7388 0083 1020 · Tofig N***',
  });
};
