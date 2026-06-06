// Telegram webhook: "Təsdiqlə/Rədd et" düymələrini və Chat cavablarını emal edir
const { supabase } = require('../lib/supabase');

const TG = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = String(process.env.TELEGRAM_CHAT_ID || '');
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const TELEGRAM_USERNAME = process.env.TELEGRAM_USERNAME || 'onlinebeledci';
const SITE_URL = process.env.SITE_URL || 'https://onlinebeledci.vercel.app';

async function tg(method, body) {
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

module.exports = async (req, res) => {
  const hdr = req.headers['x-telegram-bot-api-secret-token'];
  if (SECRET && hdr && hdr !== SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let update = req.body || {};
  if (typeof update === 'string') { 
    try { update = JSON.parse(update); } 
    catch { update = {}; } 
  }

  const cq = update.callback_query;
  const msg = update.message;

  // Adi mesaj
  if (msg && !cq) {
    const chatId = String(msg.chat.id);
    const text = msg.text || '';
    
    // Start komandası
    if (text === '/start') {
      await tg('sendMessage', {
        chat_id: chatId,
        text: `👋 Salam!

🛒 **OnlineBələdçi Rəqəmsal Mağazası**

📦 Hazır şablonlar və e-kitablar
💰 Təhlükəsiz ödəniş
⚡ Dərhal yükləmə

🌐 Sayt: ${SITE_URL}

Suallarınızı yazın!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 Mağazaya keç', url: SITE_URL }],
            [{ text: '❓ Kömək', callback_data: 'help' }]
          ]
        }
      });
    }
    else if (text === '/help' || text.toLowerCase().includes('kömək')) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: `📖 **Kömək**

**Balans artırmaq:**
Sayta daxil ol → "+" → Ödəniş et

**Məhsul almaq:**
Səbətə at → "Al" → Yüklə

**Xal sistemi:**
• 1₼ = 1 xal
• 100 xal = 1₼ endirim

📱 @${TELEGRAM_USERNAME}`,
        parse_mode: 'Markdown'
      });
    }
    else if (chatId !== ADMIN_CHAT && text) {
      // Admin-ə yönləndir
      const userName = msg.from?.first_name || '';
      await tg('sendMessage', {
        chat_id: ADMIN_CHAT,
        text: `📩 **Yeni mesaj!**

👤 ${userName} (${chatId})

📝 ${text}`,
        parse_mode: 'Markdown'
      });
      await tg('sendMessage', {
        chat_id: chatId,
        text: '✅ Mesajınız qəbul edildi!'
      });
    }
    return res.json({ ok: true });
  }

  // Callback query
  if (!cq) return res.json({ ok: true });

  const fromId = String(cq.from?.id || '');
  if (!ADMIN_CHAT || fromId !== ADMIN_CHAT) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: '⛔ Yalnız admin.' });
    return res.json({ ok: true });
  }

  const [action, idStr] = String(cq.data || '').split(':');
  const id = Number(idStr);
  let result = 'Naməlum';

  // Help
  if (action === 'help') {
    await tg('sendMessage', {
      chat_id: cq.message.chat.id,
      text: `📖 Kömək üçün @${TELEGRAM_USERNAME}`
    });
    await tg('answerCallbackQuery', { callback_query_id: cq.id });
    return res.json({ ok: true });
  }

  // Topup approve/reject
  if (['approve', 'reject'].includes(action) && id) {
    const { data: topup } = await supabase.from('topups').select('*').eq('id', id).single();
    if (!topup) result = 'Tapılmadı';
    else if (topup.status !== 'pending') result = 'Artıq emal olunub';
    else if (action === 'reject') {
      await supabase.from('topups').update({ status: 'rejected' }).eq('id', id);
      result = '❌ Rədd edildi';
    } else {
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', topup.user_id).single();
      const nb = (prof?.balance || 0) + topup.amount;
      await supabase.from('profiles').update({ balance: nb }).eq('id', topup.user_id);
      await supabase.from('topups').update({ status: 'approved' }).eq('id', id);
      result = `✅ +${(topup.amount / 100).toFixed(2)} ₼`;
    }
  }

  await tg('answerCallbackQuery', { callback_query_id: cq.id, text: result });
  
  if (cq.message) {
    await tg('editMessageText', {
      chat_id: cq.message.chat.id,
      message_id: cq.message.message_id,
      text: (cq.message.text || '') + '\n\n➡️ ' + result,
      reply_markup: { inline_keyboard: [] }
    });
  }
  
  res.json({ ok: true });
};
