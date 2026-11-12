-- Public catalogue metadata for Zaufany wolontariusz.
-- The lesson payload is stored in enrollment-protected course data.
begin;

with course_price(slug, price_grosze) as (values ('zaufany-wolontariusz', 0))
insert into public.ta_courses (
  slug, title_pl, title_en, description_pl, category_pl,
  certificate_pl, certificate_en, price_grosze, currency, published
)
select slug, 'Zaufany wolontariusz', 'Trusted Volunteer',
  'Bezpłatny kurs o bezpiecznym wolontariacie. Wybierz rolę, przygotuj pierwszy dyżur, przećwicz reakcję na agresję i naucz się zgłaszać incydenty.',
  'Rodzina i rozwój', 'Zaufany wolontariusz', 'Trusted Volunteer', price_grosze, 'PLN', false
from course_price
on conflict (slug) do update set
  title_pl = excluded.title_pl,
  title_en = excluded.title_en,
  description_pl = excluded.description_pl,
  category_pl = excluded.category_pl,
  certificate_pl = excluded.certificate_pl,
  certificate_en = excluded.certificate_en,
  price_grosze = excluded.price_grosze,
  currency = excluded.currency;

commit;
