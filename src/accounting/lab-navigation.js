/** Guided navigation from one of 100 core topics to an existing practice module.
 * This is only a UI hint: authorization, material visibility and writes stay
 * enforced by the unchanged Supabase RLS + versioned workspace RPC.
 */
export const LAB_TABS=Object.freeze([
 'start','simulator','personnel','payroll','invoices','bank','journal','matches','report','history'
]);
export const LAB_TAB_NAMES=Object.freeze({
 start:'Twoja rola i plan pracy',
 simulator:'Miesiąc firmy D01–D36',
 personnel:'Kadry — dwie osoby',
 payroll:'Lista płac',
 invoices:'Faktury',
 bank:'Wyciąg bankowy',
 journal:'Dziennik Wn/Ma',
 matches:'Rozrachunki',
 report:'Zestawienia',
 history:'Historia zapisów'
});
export function normalizeLabTab(raw){
 return typeof raw==='string'&&LAB_TABS.includes(raw)?raw:'start';
}
export function recommendedLabTab(topicNo){
 if(!Number.isInteger(topicNo)||topicNo<1||topicNo>100)return 'start';
 if(topicNo<=10){
  if([3,4].includes(topicNo))return 'report';
  if([5,6,10].includes(topicNo))return 'journal';
  if(topicNo===8)return 'invoices';
  if(topicNo===9)return 'history';
  return 'start';
 }
 if(topicNo<=20)return topicNo===19?'bank':topicNo===18?'bank':topicNo===20?'matches':'invoices';
 if(topicNo<=30)return topicNo<=24?'invoices':'report';
 if(topicNo<=40)return topicNo===39?'bank':topicNo===40?'report':'invoices';
 if(topicNo<=50){
  if(topicNo<=43||topicNo===47||topicNo===50)return 'personnel';
  return 'payroll';
 }
 if(topicNo<=60){
  if([52,56,57,59,60].includes(topicNo))return 'report';
  return 'journal';
 }
 if(topicNo<=70)return 'start';
 if(topicNo<=80)return topicNo>=79?'report':topicNo===76?'bank':'invoices';
 if(topicNo<=90){
  if([81,86].includes(topicNo))return 'bank';
  if([87,88,89,90].includes(topicNo))return 'matches';
  return 'invoices';
 }
 return topicNo>=96&&topicNo<=99?'simulator':'report';
}
