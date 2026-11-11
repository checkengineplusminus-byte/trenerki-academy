create table public.ta_support_contacts (
 id text primary key,
 category text not null check (category in ('kryzys','mlodzi','przemoc','uzaleznienia','rodzina','finanse','przestepstwo')),
 name text not null check (char_length(btrim(name)) between 2 and 160),
 phone text check (phone ~ '^\+?[0-9 ]{6,24}$' and char_length(regexp_replace(phone,'[^0-9]','','g')) between 6 and 15),
 url text not null check (char_length(url)<=350 and url ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?([/?#][^[:space:]]*)?$'),
 description text not null check (char_length(btrim(description)) between 5 and 600),
 hours text not null check (char_length(btrim(hours)) between 3 and 280),
 sort_order integer not null check (sort_order between 0 and 10000),
 updated_at timestamptz not null default now()
);
alter table public.ta_support_contacts enable row level security;
revoke all on public.ta_support_contacts from public, anon, authenticated;
grant select on public.ta_support_contacts to anon, authenticated;
create policy ta_support_public_read on public.ta_support_contacts for select to anon, authenticated using (true);

create function public.ta_update_support_contact(
 p_id text, p_name text, p_phone text, p_url text, p_description text, p_hours text, p_sort_order integer
) returns public.ta_support_contacts
language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := auth.uid();
 item public.ta_support_contacts;
begin
 if actor is null or not exists (
  select 1 from public.ta_admins a where a.user_id=actor and a.role in ('owner','admin')
 ) then
  raise exception 'admin_required' using errcode='42501';
 end if;
 update public.ta_support_contacts
 set name=btrim(p_name), phone=nullif(btrim(p_phone),''),
     url=btrim(p_url),description=btrim(p_description),hours=btrim(p_hours),
     sort_order=p_sort_order,updated_at=now()
 where id=p_id returning * into item;
 if not found then raise exception 'unknown_contact' using errcode='22023'; end if;
 return item;
end;
$$;
revoke all on function public.ta_update_support_contact(text,text,text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.ta_update_support_contact(text,text,text,text,text,text,integer) to authenticated;

insert into public.ta_support_contacts (id,category,name,phone,url,description,hours,sort_order) values
 ('centrum-wsparcia','kryzys','Centrum Wsparcia – Fundacja ITAKA','800 70 2222','https://centrumwsparcia.pl/','Bezpłatna rozmowa dla dorosłych w kryzysie psychicznym. Na stronie znajdziesz też czat i grafik dyżurów specjalistów.','Telefon całodobowo, codziennie.',10),
 ('116-sos','kryzys','116sos.pl – wsparcie emocjonalne dla dorosłych','116 123','https://116sos.pl/','Bezpłatne, anonimowe wsparcie dla dorosłych w trudnej sytuacji życiowej. Możesz zadzwonić lub skorzystać z czatu.','Telefon i czat całodobowo, codziennie.',20),
 ('dzieci-116111','mlodzi','Telefon zaufania dla dzieci i młodzieży – Fundacja Dajemy Dzieciom Siłę','116 111','https://116111.pl/','Bezpłatna i anonimowa rozmowa z konsultantami dla osób poniżej 18 lat. Na stronie możesz także napisać lub rozpocząć czat.','Telefon całodobowo, codziennie.',30),
 ('niebieska-linia','przemoc','Ogólnopolskie Pogotowie „Niebieska Linia”','800 120 002','https://niebieskalinia.info/kontakt/telefon/','Bezpłatne wsparcie dla osób doznających przemocy domowej i jej świadków. Konsultanci informują też o procedurach i miejscach pomocy.','Telefon całodobowo, codziennie.',40),
 ('uzaleznienia','uzaleznienia','Ogólnopolski Telefon Zaufania „Uzależnienia”','800 199 990','https://poradniauzaleznienia.pl/telefony-zaufania/','Bezpłatne wsparcie dla osób zmagających się z uzależnieniem od substancji i ich bliskich. Informacje o leczeniu i miejscach pomocy.','Codziennie 16.00–21.00.',50),
 ('bezpieczenstwo-dzieci','rodzina','Telefon dla dorosłych w sprawie bezpieczeństwa dzieci – Fundacja Dajemy Dzieciom Siłę','800 100 100','https://800100100.pl/strona-glowna/','Bezpłatna pomoc dla rodziców, nauczycieli i innych dorosłych, których niepokoi bezpieczeństwo osoby poniżej 18 lat.','Poniedziałek–czwartek 10.00–14.00, piątek 12.00–15.00. Sprawdź aktualny grafik dyżurów.',60),
 ('pomoc-prawna','finanse','Nieodpłatna pomoc prawna i poradnictwo obywatelskie',null,'https://zapisy-np.ms.gov.pl/','Dla osób, które nie mogą ponieść kosztu odpłatnej pomocy prawnej. Doradca obywatelski może pomóc ustalić możliwe kroki m.in. przy zadłużeniu.','Terminy zależą od punktu. Wybierz punkt i umów wizytę w oficjalnym systemie zapisów.',70),
 ('pokrzywdzeni','przestepstwo','Ogólnopolska Linia Pomocy Pokrzywdzonym','116 006','https://www.gov.pl/web/sprawiedliwosc/linia-pomocy-pokrzywdzonym','Bezpłatna, anonimowa pomoc psychologiczna i prawna dla osób pokrzywdzonych przestępstwem, świadków i ich bliskich.','Telefon całodobowo, codziennie. Godziny dyżurów w innych językach sprawdzisz w menu infolinii.',80);
