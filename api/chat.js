// Real-time Chat API - Telegram ilə inteqrasiya
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');

const TG = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = process.env.TELEGRAM_CHAT_ID;

// Telegram API-yə sorğu
async function tg(method, body) {
  if (!TG) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await r.json();
  } catch (e) {
    console.error('tg error:', e.message);
    return null;
  }
}

// Avtomatik cavablar
const AUTO_ANSWERS = [
  { keywords: ['salam', 'hello', 'hi', 'hey'], answer: 'Salam! 👋 Sizə necə kömək edə bilərəm?' },
  { keywords: ['balans', 'artır', 'pul', 'ödəniş'], answer: '💰 Balans artırmaq üçün: 1) Hesabınıza daxil olun 2) "+" düyməsinə basın 3) Ödəniş məlumatlarını daxil edin 4) Qəbz şəklini yükləyin. Təsdiqdən sonra balansınız avtomatik artacaq.' },
  { keywords: ['al', 'məhsul', 'səbət', 'alış'], answer: '🛒 Məhsul almaq üçün: 1) Məhsulu seçin və "Səbətə at" düyməsinə basın 2) "Al (balansla)" düyməsinə basın 3) Yükləmə linkini alın.' },
  { keywords: ['telegram', 'əlaqə', 'yaz'], answer: '📱 Telegram-da bizimlə əlaqə saxlamaq üçün: @onlinebeledci' },
  { keywords: ['xal', 'point', 'sadiqlik'], answer: '⭐ Hər 1₼ alış üçün 1 xal qazanırsınız. 100 xal = 1₼ dəyərində endirim! Xalları ödəniş zamanı istifadə edə bilərsiniz.' },
  { keywords: ['promo', 'kod', 'endirim'], answer: '🎁 Promo kodları axtarış çubuğunun yanındakı "Promo kod" sahəsinə daxil edin və "Tətbiq et" düyməsinə basın.' },
  { keywords: ['flash', 'sale', 'kampaniya'], answer: '🔥 Flash Sale kampaniyaları zamanında məhsullar endirimli olur! Banner-də geri sayım taymerini izləyin.' },
  { keywords: ['wishlist', 'sevimli'], answer: '❤️ Məhsul kartındakı ürək işarəsinə basaraq sevimlilərə əlavə edə bilərsiniz.' },
  { keywords: ['çatdırılma', 'yüklə', 'download'], answer: '📥 Alışdan dərhal sonra yükləmə linki alacaqsınız. Link 1 saat etibarlıdır.' },
  { keywords: ['problem', 'xəta', 'işləm'], answer: '⚠️ Problem yaşayırsınız? Telegram-da @onlinebeledci ilə əlaqə saxlayın, dərhal kömək edəcəyik!' },
  { keywords: ['saat', 'vaxt', 'iş'], answer: '🕐 Dəstək saatları: Hər gün 09:00-22:00. Gecə də mesaj yazın, səhər cavab verəcəyik!' }
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Chat tarixçəsi (istifadəçi üçün)
  if (req.method === 'GET') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Daxil olun.' });
    
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      
      res.json({ messages: data || [] });
    } catch (e) {
      // Cədvəl yoxdursa boş qaytar
      res.json({ messages: [] });
    }
  }

  // POST - Yeni mesaj
  if (req.method === 'POST') {
    const user = await getUser(req);
    const { message, name, email } = req.body || {};
    
    if (!message) return res.status(400).json({ error: 'Mesaj boşdur.' });

    // Avtomatik cavab tap
    const lowerMsg = message.toLowerCase();
    let autoAnswer = null;
    
    for (const item of AUTO_ANSWERS) {
      if (item.keywords.some(k => lowerMsg.includes(k))) {
        autoAnswer = item.answer;
        break;
      }
    }

    // Telegram-a göndər (admin-ə)
    if (TG && ADMIN_CHAT) {
      const userInfo = user ? user.email : (email || 'Qonaq');
      const userName = name || userInfo;
      
      await tg('sendMessage', {
        chat_id: ADMIN_CHAT,
        text: `💬 **Yeni Mesaj!**\n\n👤 **${userName}**\n📧 ${userInfo}\n\n📝 **Mesaj:**\n${message}\n\n${autoAnswer ? '✅ Avtomatik cavab verildi.' : '⏳ Cavab gözləyir...'}`,
        parse_mode: 'Markdown',
        reply_markup: user ? {
          inline_keyboard: [
            [{ text: '📨 Cavabla', callback_data: `reply:${user.id}` }],
            [{ text: '✓ Həll olundu', callback_data: `resolved:${user.id}` }]
          ]
        } : undefined
      });
    }

    // Mesajı saxla (cədvəl varsa)
    try {
      if (user) {
        await supabase.from('chat_messages').insert({
          user_id: user.id,
          message,
          is_admin: false
        });
      }
    } catch (e) {}

    res.json({ 
      ok: true, 
      auto_answer: autoAnswer,
      telegram_sent: !!(TG && ADMIN_CHAT)
    });
  }

  // PUT - Admin cavabı (telegram webhook-dan)
  if (req.method === 'PUT') {
    const { user_id, message } = req.body || {};
    
    if (!user_id || !message) {
      return res.status(400).json({ error: 'user_id və message lazımdır.' });
    }

    try {
      await supabase.from('chat_messages').insert({
        user_id,
        message,
        is_admin: true
      });
      
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Mesaj saxlanılmadı.' });
    }
  }

  else {
    res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }
};
