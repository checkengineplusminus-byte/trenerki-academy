// Codes are bearer values. Normalization is only for entry/navigation;
// the backend still validates the code, owner/recipient and redemption state.
const giftCodePattern=/^(TA|TW)-(?:[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{16}|[0-9A-F]{32})$/;

export function normalizeGiftCode(input:unknown):string{
 if(typeof input!=='string')return '';
 const value=input.trim().toUpperCase().replace(/\s/g,'');
 return /^(?:TA|TW)-/.test(value)?value.slice(0,3)+value.slice(3).replace(/-/g,''):value;
}

export function validGiftCode(input:unknown):string{
 const code=normalizeGiftCode(input);
 return giftCodePattern.test(code)?code:'';
}

export function formatGiftCode(input:unknown):string{
 const code=validGiftCode(input);
 if(!code)return typeof input==='string'?input:'';
 const body=code.slice(3),size=body.length===16?4:8;
 const groups:string[]=[];
 for(let offset=0;offset<body.length;offset+=size)groups.push(body.slice(offset,offset+size));
 return code.slice(0,3)+groups.join(' ');
}

export const giftCodeEntryError='Sprawdź pełny kod z prefiksem TA- lub TW-. Nowe kody mają 16 znaków po prefiksie; starsze kody z 32 znakami również działają.';
