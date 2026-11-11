import contacts from './contacts.json';

export const categories = [
 ['kryzys','Kryzys psychiczny i depresja','♡'],
 ['mlodzi','Dzieci i młodzież','☺'],
 ['przemoc','Przemoc domowa','⌂'],
 ['uzaleznienia','Uzależnienia','↻'],
 ['rodzina','Pomoc rodzicom i nauczycielom','◎'],
 ['finanse','Finanse, zadłużenie i pomoc prawna','§'],
 ['przestepstwo','Pomoc pokrzywdzonym przestępstwem','◇'],
 ['alarm','Nagłe zagrożenie życia','!'],
] as const;

export type Contact = typeof contacts[number];
export const defaults: Contact[] = contacts;
export const emergency = {
 id:'112',category:'alarm',name:'Numer alarmowy 112',phone:'112',
 url:'https://www.gov.pl/web/numer-alarmowy-112/numeralarmowy112',
 description:'Gdy życie, zdrowie lub bezpieczeństwo są bezpośrednio zagrożone, zadzwoń po pomoc.',
 hours:'Całodobowo, bezpłatnie.',sort_order:0
};

export const dial = (phone: string) => 'tel:' + phone.replace(/\s/g,'');
export function safeContact(row: Contact) {
 return defaults.some(item=>item.id===row.id && item.category===row.category) &&
  /^https:\/\/[a-z\d.-]+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(row.url) &&
  (row.phone===null || /^(?:\+)?[0-9 ]+$/.test(row.phone) && row.phone.replace(/\D/g,'').length>=6);
}
