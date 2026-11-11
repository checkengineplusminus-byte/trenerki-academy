DO $update_catalogue_translations$
DECLARE
 catalogue jsonb := $translations$[{"slug":"dostepne-pdf","old_title_pl":"Dostępne PDF i materiały cyfrowe","title_pl":"Dostępne PDF i materiały cyfrowe","title_en":"Accessible PDFs and Digital Materials"},{"slug":"dziennik-kota","old_title_pl":"Organizacja małego hoteliku dla kotów","title_pl":"Organizacja małego hoteliku dla kotów","title_en":"Running a Small Cat Boarding Facility"},{"slug":"koordynator","old_title_pl":"Pierwsze zlecenie w małej firmie sprzątającej","title_pl":"Pierwsze zlecenie w małej firmie sprzątającej","title_en":"Your First Job in a Small Cleaning Business"},{"slug":"lepsza-mama","old_title_pl":"Bądź lepszą mamą — bliskość, spokój i zaufanie","title_pl":"Bądź lepszą mamą — bliskość, spokój i zaufanie","title_en":"Motherhood: Connection, Calm and Trust"},{"slug":"lepszy-tata","old_title_pl":"Bądź lepszym tatą — obecność, rozmowa i zaufanie","title_pl":"Bądź lepszym tatą — obecność, rozmowa i zaufanie","title_en":"Fatherhood: Presence, Conversation and Trust"},{"slug":"nie-marnuj-jedzenia","old_title_pl":"Nie wyrzucaj jedzenia — gotuj z tego, co masz","title_pl":"Nie wyrzucaj jedzenia — gotuj z tego, co masz","title_en":"Cooking with What You Have and Reducing Food Waste"},{"slug":"odbiory","old_title_pl":"Dokumentowanie usterek mieszkań","title_pl":"Dokumentowanie usterek mieszkań","title_en":"Documenting Defects in Residential Properties"},{"slug":"partner-z-uzaleznieniem","old_title_pl":"Moja druga połówka ma problem z alkoholem lub narkotykami — jak żyć, pomagać i chronić siebie","title_pl":"Uzależnienie bliskiej osoby — wsparcie i ochrona siebie","title_en":"Supporting a Loved One Affected by Addiction"},{"slug":"trawnik-jestem-ogrodnikiem","old_title_pl":"Trawnik — jestem swoim ogrodnikiem","title_pl":"Trawnik — jestem swoim ogrodnikiem","title_en":"Practical Lawn Care for Home Gardeners"}]$translations$::jsonb;
 changes integer;
BEGIN
 UPDATE public.ta_courses c SET title_pl=p.title_pl,title_en=p.title_en
 FROM jsonb_to_recordset(catalogue) AS p(slug text,old_title_pl text,title_pl text,title_en text)
 WHERE c.slug=p.slug AND c.published AND c.title_pl IN (p.old_title_pl,p.title_pl);
 GET DIAGNOSTICS changes=ROW_COUNT;
 IF changes <> jsonb_array_length(catalogue) THEN RAISE EXCEPTION 'Unexpected translated course count'; END IF;
END
$update_catalogue_translations$;
