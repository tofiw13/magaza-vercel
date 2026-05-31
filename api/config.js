// Frontend üçün açıq konfiqurasiya (anon açar + ödəniş məlumatı)
module.exports = (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    paymentInfo: process.env.PAYMENT_INFO || 'Ödəniş məlumatı admin tərəfindən əlavə olunmayıb.',
  });
};
