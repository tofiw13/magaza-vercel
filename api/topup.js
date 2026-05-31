// Balans artırma sorğusu: qəbz şəklini yüklə + Telegram-a göndər + pending yarat
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST lazımdır.' });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Əvvəlcə daxil ol.' });

  try {
    const amountManat = Number(req.body?.amount) || 0;
    const amount = Math.round(amountManat * 100); // sentə çevir
    if (amount <= 0) return res.status(400).json({ error: 'Düzgün məbləğ daxil et.' });

    const dataUrl = req.body?.receipt || '';
    const m = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: 'Qəbz şəkli lazımdır.' });
    const contentType = m[1];
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'Şəkil 5MB-dan kiçik olmalıdır.' });

    const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${user.id}/${Date.now()}.${ext}`;

    const up = await supabase.storage.from('receipts').upload(path, buffer, { contentType, upsert: false });
    if (up.error) return res.status(500).json({ error: 'Şəkil yüklənmədi: ' + up.error.message });

    const ins = await supabase.from('topups').insert({
      user_id: user.id, user_email: user.email, amount, receipt_path: path, status: 'pending',
    }).select().single();
    if (ins.error) return res.status(500).json({ error: ins.error.message });

    // Telegram bildirişi (token varsa)
    const TG = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT = process.env.TELEGRAM_CHAT_ID;
    if (TG && CHAT) {
      try {
        const signed = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
        const caption = `💰 Yeni balans sorğusu\n👤 ${user.email}\n💵 ${amountManat} ₼\n🆔 topup #${ins.data.id}\nTəsdiq və ya rədd üçün aşağıdakı düymələrə bas.`;
        const kb = { inline_keyboard: [[
          { text: '✅ Təsdiqlə', callback_data: `approve:${ins.data.id}` },
          { text: '❌ Rədd et', callback_data: `reject:${ins.data.id}` },
        ]] };
        const photoUrl = signed?.data?.signedUrl;
        if (photoUrl) {
          await fetch(`https://api.telegram.org/bot${TG}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT, photo: photoUrl, caption, reply_markup: kb }),
          });
        } else {
          await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT, text: caption, reply_markup: kb }),
          });
        }
      } catch (e) { console.error('telegram error:', e.message); }
    }

    res.json({ ok: true, message: 'Sorğun göndərildi. Admin təsdiqlədikdən sonra balansın artacaq.' });
  } catch (e) {
    console.error('topup error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
