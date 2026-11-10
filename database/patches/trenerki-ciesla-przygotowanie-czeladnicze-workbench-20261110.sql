-- Original practice instructions. Idempotent append, retaining quizzes and previous material.
with authored(lesson_no,section) as (values
  (1, $curriculum${"heading": "Kalkulator tarcicy na własnych wymiarach", "text": "Ustaw grubość, szerokość i długość w milimetrach oraz liczbę identycznych sztuk. Kalkulator dzieli każdy wymiar przez 1000, a później mnoży trzy długości w metrach i liczbę sztuk. Przy 40 × 200 × 4000 mm i 80 deskach otrzymasz 2,56 m³. Jeśli deski mają różne przekroje lub długości, policz osobno każdą grupę i zsumuj objętości. Porównaj wynik z listą zamówienia i upewnij się, że użyłeś ustalonych wymiarów materiału."}$curriculum$::jsonb),
  (8, $curriculum${"heading": "Sprawdź dwie przekątne ramy", "text": "Dla prostokątnej ramy o bokach 2,4 i 3,2 m przekątna powinna wynieść 4 m. W kalkulatorze możesz podstawić własne wymiary w metrach. Na szkicu ustal pary przeciwległych narożników i zmierz obie przekątne od tych samych punktów odniesienia. Porównaj je z obliczoną wartością oraz sprawdź obie pary boków. W ocenie wykonania użyj tolerancji właściwej dla dokumentacji i przeznaczenia elementu."}$curriculum$::jsonb),
  (18, $curriculum${"heading": "Przełożenie pasowe na liczbach", "text": "Dla modelu idealnego bez poślizgu mnożysz obroty silnika przez roboczą średnicę jego koła i dzielisz przez docelowe obroty wału. Przy 1200 obr./min, 10 cm i 2400 obr./min obliczona średnica wynosi 5 cm. Zmień wartości w kalkulatorze i sprawdź, jak zmiana prędkości wpływa na wynik. Dobór rzeczywistej przekładni wymaga dokumentacji urządzenia, dopuszczalnych obrotów, danych pasa i oceny osłon przez uprawnioną osobę."}$curriculum$::jsonb),
  (23, $curriculum${"heading": "Wilgotność obliczona z ważenia", "text": "Obie masy wprowadź w tej samej jednostce. Różnica między masą przed suszeniem i masą całkiem suchą to obliczona masa wody. Dzielisz ją przez masę suchą i mnożysz przez 100. Dla 12,4 i 10 kg otrzymasz 24%. Dwie równe masy dadzą 0% w tym modelu. Wynik jest obliczeniem dla tej próbki. Przy porównaniu z pomiarem wilgotnościomierzem sprawdź, gdzie i jak próbka została pobrana."}$curriculum$::jsonb),
  (56, $curriculum${"heading": "Procent od ceny bazowej", "text": "Cena po dodatku wynosi cena bazowa × (1 + procent ÷ 100). Przy 35 zł i 18% otrzymujesz 41,30 zł, w tym 6,30 zł dodatku. Zmień procent na 0, żeby sprawdzić, czy suma wraca do 35 zł. Przy wycenie zapisz, od której podstawy liczysz dodatek. Gdy doliczasz kolejne opłaty, ustal ich podstawy i kolejność. Procent od kwoty bazowej oraz od kwoty już powiększonej daje różne wartości."}$curriculum$::jsonb),
  (58, $curriculum${"heading": "Przekątna z wymiaru modelu i pomiaru", "text": "Podaj oba boki w metrach. Przy bokach 3 i 4 m kalkulator daje 5 m. Jeśli pomiar na rysunku jest podany w skali 1:20, 150 mm na arkuszu odpowiada 3000 mm w rzeczywistości przy poprawnym wydruku. Najpierw odczytaj zapisany wymiar i sprawdź skalę, potem porównaj wynik z pomiarem w terenie. Zapisz, czy wynik pochodzi z rysunku, obliczenia czy pomiaru."}$curriculum$::jsonb)
)
update public.ta_lessons lesson
set material=jsonb_set(lesson.material,'{sections}',
    coalesce(lesson.material->'sections','[]'::jsonb)||jsonb_build_array(authored.section),true),
    updated_at=now()
from authored
where lesson.course_slug='ciesla-przygotowanie-czeladnicze' and lesson.lesson_no=authored.lesson_no
and not exists (
  select 1 from jsonb_array_elements(coalesce(lesson.material->'sections','[]'::jsonb)) as existing(section)
  where existing.section->>'heading'=authored.section->>'heading'
)
returning lesson.lesson_no,authored.section->>'heading' as added_section;
