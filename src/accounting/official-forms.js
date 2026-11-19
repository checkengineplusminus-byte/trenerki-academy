/** Ministry of Finance official form index. Original documents are NOT re-created or modified. */
export const OFFICIAL_FORMS=Object.freeze([
 {code:'PIT-37',category:'PIT',icon:'👤',description:'Rozliczenie wybranych dochodów osób fizycznych',source:'https://podatki.gov.pl/podatki-osobiste/pit/formularze-pit'},
 {code:'PIT-36',category:'PIT',icon:'🏠',description:'Rozliczenie dochodów, m.in. działalności według skali',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT-36L',category:'PIT',icon:'📈',description:'Działalność opodatkowana liniowo',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT-28',category:'PIT',icon:'🧮',description:'Ryczałt od przychodów ewidencjonowanych',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT-11',category:'PIT',icon:'👥',description:'Informacja o dochodach pracownika',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT-4R',category:'PIT',icon:'💼',description:'Roczna deklaracja płatnika zaliczek',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT-8AR',category:'PIT',icon:'🗂️',description:'Roczna deklaracja zryczałtowanego podatku',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'PIT/B',category:'PIT',icon:'📚',description:'Załącznik dotyczący działalności gospodarczej',source:'https://podatki.gov.pl/podatki-firmowe/pit/formularze-pit'},
 {code:'CIT-8',category:'CIT',icon:'🏢',description:'Roczne rozliczenie podatku dochodowego osób prawnych',source:'https://podatki.gov.pl/podatki-firmowe/cit/formularze-cit',pdf:'https://www.gov.pl/attachment/b6901dbb-05bf-4d5b-b1be-52fd86fc753d',edition:'CIT-8 (34) – druk za 2025'},
 {code:'CIT-8/O',category:'CIT',icon:'🧾',description:'Załącznik CIT – odliczenia i zwolnienia',source:'https://podatki.gov.pl/podatki-firmowe/cit/formularze-cit',pdf:'https://podatki.gov.pl/media/czfdxieo/cit-8o-20-07.pdf',edition:'CIT-8/O (20)'},
 {code:'CIT-8E',category:'CIT',icon:'💰',description:'Ryczałt od dochodów spółek (estoński CIT)',source:'https://podatki.gov.pl/podatki-firmowe/cit/formularze-cit'},
 {code:'CIT-D',category:'CIT',icon:'🎁',description:'Informacja o otrzymanych i przekazanych darowiznach',source:'https://podatki.gov.pl/podatki-firmowe/cit/formularze-cit'},
 {code:'VAT-R',category:'VAT',icon:'🪪',description:'Zgłoszenie rejestracyjne podatnika VAT',source:'https://podatki.gov.pl/podatki-firmowe/vat/formularze-vat'},
 {code:'VAT-UE',category:'VAT',icon:'🌍',description:'Informacja podsumowująca transakcje unijne',source:'https://podatki.gov.pl/podatki-firmowe/vat/formularze-vat'},
 {code:'VAT-8',category:'VAT',icon:'💳',description:'Deklaracja dla podatku od towarów i usług',source:'https://podatki.gov.pl/podatki-firmowe/vat/formularze-vat'},
 {code:'VAT-9M',category:'VAT',icon:'🗓️',description:'Deklaracja dla określonych rozliczeń podatku VAT',source:'https://podatki.gov.pl/podatki-firmowe/vat/formularze-vat'},
 {code:'VAT-UEK',category:'VAT',icon:'✏️',description:'Korekta informacji podsumowującej VAT-UE',source:'https://podatki.gov.pl/podatki-firmowe/vat/formularze-vat'},
 {code:'JPK',category:'JPK',icon:'🖥️',description:'Struktury Jednolitego Pliku Kontrolnego',source:'https://podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat-z-deklaracja'}
]);
export function officialFormFor(code){return OFFICIAL_FORMS.find(f=>f.code===code)||null;}
export function officialFormUrl(item,preferPdf=false){if(!item)return null;const link=preferPdf&&item.pdf?item.pdf:item.source;try{const u=new URL(link);return u.protocol==='https:'&&['podatki.gov.pl','www.gov.pl'].includes(u.hostname)?u.toString():null}catch{return null}}
