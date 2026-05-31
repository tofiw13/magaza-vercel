-- ============================================================
--  Məhsul adlarını və təsvirlərini Azərbaycan dilində yenilə
--  Supabase -> SQL Editor -> yapışdır -> RUN
-- ============================================================

update public.products set
  name = 'Peşəkar CV / Rezümə Şablonu',
  description = 'İnteraktiv, redaktə oluna bilən müasir CV şablonu. Şəkil əlavə et, mətnləri dəyiş, bir kliklə PDF kimi yüklə.'
where id = 'cv-template';

update public.products set
  name = 'Ağıllı Həftəlik Dərs Cədvəli',
  description = 'Fənləri və həftədəki saylarını yaz — sistem boş vaxtlarına uyğun avtomatik planlasın. Çap üçün hazır.'
where id = 'study-schedule';

update public.products set
  name = 'Şəxsi Büdcə Hesablama Şablonu',
  description = 'Avtomatik hesablamalı (gəlir, xərc, qalıq, yığım faizi) aylıq büdcə cədvəli. Excel/Google Sheets-də açılır.'
where id = 'budget-sheet';

update public.products set
  name = '30 Instaqram Post Önərisi',
  description = '30 hazır post ideyası: dizayn şablonu + başlıq mətni (caption) + heşteq dəsti. Kopyala və paylaş.'
where id = 'instagram-pack';

update public.products set
  name = 'E-kitab: Sıfırdan Onlayn Pul Qazanmaq',
  description = 'Tələbələr üçün praktiki bələdçi: 5 real qazanc yolu, ödəniş üsulları və 30 günlük fəaliyyət planı.'
where id = 'ebook-freelance';
