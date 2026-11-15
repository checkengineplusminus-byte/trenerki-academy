// Pure, bounded input classification. Learner text is data, never executable code.
export function normalize(x:string){
 return x.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l")
  .replace(/\s+/g," ").trim();
}
export function kindOf(message:string):"bug"|"content"|"confusion"|null{
 const s=normalize(message);
 // Keep profanity within constructive reports. Reject unrelated chatter rather than
 // accidentally converting a chat message into a technical incident.
 const broken=/\b(nie dziala|nie reaguje|nie uruchamia|blad|bug|awaria|zawiesza|crash|zepsut|nie zapisuje|nie laduje|nie otwiera|nie przenosi|nie przechodzi|nie moge przejsc|nie moge kliknac|nie mozna kliknac|przycisk nie|guzik nie|klikam i nic|naciskam i nic|nie pokazuje|nie wyswietla|zly link|niedostepn|nie da sie|nie pozwala|wyskakuje blad|nie zalicza|nie liczy)\b/u.test(s);
 const wrong=/\b(zly wynik|zle oblicz|bledna odpowiedz|blad w tresci|niewlasciwa odpowiedz|nieprawdziwa informacja|niezgodn|bledne dane|sprzeczn|niepoprawny wynik|brakuje przykladu|brakuje wyjasnienia|brakuje instrukcji|za malo wyjasn|zbyt ogoln)\b/u.test(s);
 const unclear=/\b(nie rozumiem|nie wiem jak|nie mam pojecia|wytlumacz|wyjasnij|niejasn|nie ogarniam|za trudn|zbyt trudn|skad sie bierze|co mam zrobic|nie wiem o co chodzi|krok po kroku|podaj przyklad|poprosze przyklad)\b/u.test(s);
 if(broken)return "bug";
 if(wrong)return "content";
 if(unclear)return "confusion";
 return null;
}
export function redact(x:string){
 return x.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[adres e-mail]")
  .replace(/https?:\/\/\S+/gi,"[link]")
  .replace(/\b(?:\d[ -]?){11,19}\b/g,"[numer]")
  .replace(/\b(?:\+?\d[\s-]?){9,14}\b/g,"[telefon]")
  .replace(/\s+/g," ").trim().slice(0,600);
}
