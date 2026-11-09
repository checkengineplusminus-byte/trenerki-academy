# Plecionkarz — audyt przebudowy, 9 listopada 2026

**Stan przed:** 8 lekcji o przewadze historii, bez pełnego warsztatu materiałowego i liczb.
**Stan po:** 16 osobno opracowanych lekcji o pięciu sekcjach, pytaniach, przykładach liczbowych i zadaniach. Zapis w Supabase zachowuje identyfikator kursu i istniejące postępy uczniów.

## Zakres
1. Anatomia kosza i kierunki przenoszenia sił.
2. Dobór wikliny i różnica względem leszczyny oraz rattanu.
3. Rodzaje obróbki brown, buff, white, green.
4. Moczenie, mellowing i próby elastyczności.
5. Dno, krzyżak, rozstaw słupków.
6. Upsett i stabilizacja przejścia dna w ściany.
7. Randing, pairing, waling.
8. Stożkowatość prętów, tension i deformacje.
9. Obrzeże i zabezpieczenie końców.
10. Uchwyty i model statyczny obciążenia.
11. Dno owalne i okrągłe.
12. Diagnostyka pęknięć, luzów i wilgoci.
13. Konserwacja historycznych koszy.
14. Ergonomia i bezpieczeństwo narzędzi.
15. Kalkulacja surowca i robocizny.
16. Samodzielny projekt kosza Ø30 cm.

**Przykłady obliczeniowe:** obwód Ø30 cm ≈94,25 cm; dla 24 słupków odstęp ≈3,93 cm; ciężar 4 kg ≈39,2 N; elipsa 40×24 cm ma pole ≈754 cm²; 72 m użytkowego materiału przy uzysku 80% wymaga 90 m surowca.

## Źródła
- https://heritagecrafts.org.uk/craft/basket-making/
- https://www.basketryandbeyond.org.uk/wp-content/uploads/2013/10/Techniques-Panels-1.pdf
- https://www.basketryandbeyond.org.uk/willow-basketmaking-structures/
- https://smallfarms.cornell.edu/2013/06/willow-a-new-old-crop/
- https://www.canada.ca/en/conservation-institute/services/preventive-conservation/guidelines-collections/basketry-plant-materials.html

## Technika
- GitHub: `content/plecionkarz-masterclass-20261109-part1.json` i `part2.json`
- Powtarzalny SQL: `database/patches/trenerki-plecionkarz-content-20261109.sql`
- Pięć nowych edukacyjnych schematów SVG: `plecionkarz-anatomia`, `-material`, `-dno`, `-splot`, `-uchwyt`
- Rejestr SVG: `src/LessonIllustratedSections.tsx`
- Nie zmieniono `published`, zakupów, danych kont, postępu ani RLS.

**Pozostałe kontrole:** recenzja zawodowego plecionkarza, weryfikacja odpowiedzi i scenariuszy na użytkownikach początkujących, test drogi lekcja→egzamin→certyfikat, potwierdzenie dostępności grafik w faktycznie wdrożonej aplikacji Expo. Oznaczenie `review_needed` nie oznacza formalnego zatwierdzenia kursu ani nadania kwalifikacji.
