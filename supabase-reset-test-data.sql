-- ============================================================
--  TEST DATASINI SIFIRLA
--  Supabase -> SQL Editor -> lazım olan hissəni yapışdır -> RUN
--  DİQQƏT: Bu əməliyyat geri qaytarıla bilməz!
-- ============================================================

-- 1) Bütün sifarişləri sil (son sifarişlər boşalacaq, admin balansı 0 olacaq)
delete from public.orders;

-- 2) Balans artırma sorğularını sil (qəbz tarixçəsi təmizlənir)
delete from public.topups;

-- 3) İSTƏYƏ GÖRƏ: bütün istifadəçilərin balansını sıfırla
--    (Yalnız test balanslarını silmək istəyirsənsə bu sətrin başındakı -- işarələrini sil)
-- update public.profiles set balance = 0;

-- ============================================================
--  Yoxlama (təmizləndimi?)
-- ============================================================
-- select count(*) as sifaris_sayi from public.orders;
-- select count(*) as sorgu_sayi  from public.topups;
-- select email, balance from public.profiles order by balance desc;
