import {orderTerms,termsVersion} from './order-terms-2026-11-11.ts';

export {termsVersion};

export function contractAttachments(version: string | undefined) {
 if(version!==termsVersion)return undefined;
 const bytes=new TextEncoder().encode(orderTerms);
 const content=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
 return [{filename:'TRENERKI-warunki-'+termsVersion+'.txt',content}];
}

export function money(amount: number) {
 return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(amount/100);
}
