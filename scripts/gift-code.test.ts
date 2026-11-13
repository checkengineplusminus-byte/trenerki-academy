import {giftCodeHash,isGiftCode,legacyGiftCode,normalizeGiftCode,resolveGiftCode,shortGiftCode} from '../supabase/functions/_shared/gift-code.ts';
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const id='12345678-1234-4234-9234-123456789abc';

Deno.test('short gift codes use the fixed 80-bit Base32 format and deterministic independent vectors',async()=>{
 const ta=await shortGiftCode('TA',id),tw=await shortGiftCode('TW',id);
 // Independently computed with SHA-256 + standard Base32 translated to Crockford.
 assert(ta==='TA-WGV9ZNQ8GX6QHKMX','Course code format changed; existing short cards would no longer be recoverable');
 assert(tw==='TW-EG0BSM08S7JD4VFY','Value code format changed; existing short cards would no longer be recoverable');
 assert(ta.slice(3).length===16&&tw.slice(3).length===16,'New codes must have half the former 32-character payload length');
 assert(await shortGiftCode('TA',id.toUpperCase())===ta,'UUID case changed the code');
 assert(await giftCodeHash(ta)==='11a043dfb1cff205aa44946f3d181ab38e3b11ef4fc88f906ec3f76ea77178b8','Stored hash changed');
 assert(await giftCodeHash(tw)==='ec85d716a170dadc898fd0cd3058596e3307812d158b287492cf89d5cf56fef5','Stored value hash changed');
});

Deno.test('gift code input accepts grouping while retaining the same canonical hash',async()=>{
 const grouped=' \t ta-wgv9-znq8 gx6q-hkmx\n';
 assert(normalizeGiftCode(grouped)==='TA-WGV9ZNQ8GX6QHKMX','Grouped short code was not normalized');
 assert(isGiftCode(grouped,'TA')&&!isGiftCode(grouped,'TW'),'Code type routing changed');
 assert(await giftCodeHash(grouped)===await giftCodeHash('TA-WGV9ZNQ8GX6QHKMX'),'Grouping changed the redemption hash');
 const legacy='tw-12345678 1234 4234-9234-123456789abc';
 assert(normalizeGiftCode(legacy)==='TW-12345678123442349234123456789ABC'&&isGiftCode(legacy,'TW'),'Legacy printed grouping no longer works');
 for(const invalid of ['TA-0123456789ABCDE','TA-0123456789ABCDEFG','TA-0123456789ABCDEI','TA-0123456789ABCDEO','TA-0123456789ABCDEL','TA-0123456789ABCDEU','XX-WGV9ZNQ8GX6QHKMX','https://trenerki.com/prezent?code=TA-WGV9ZNQ8GX6QHKMX']){
  assert(!isGiftCode(invalid),'Malformed code was accepted: '+invalid);
 }
});

Deno.test('reprint and webhook reconstruction always retain the code selected by the persisted hash',async()=>{
 for(const prefix of ['TA','TW'] as const){
  const short=await shortGiftCode(prefix,id),legacy=legacyGiftCode(prefix,id);
  assert(await resolveGiftCode(prefix,id,await giftCodeHash(short))===short,'Short code could not be reconstructed');
  assert(await resolveGiftCode(prefix,id,await giftCodeHash(legacy))===legacy,'Previously issued 32-character code was replaced');
  assert(await resolveGiftCode(prefix,id,'0'.repeat(64))===null,'Unrelated stored hash produced a fabricated code');
  assert(await resolveGiftCode(prefix,'not-a-uuid',await giftCodeHash(short))===null,'Invalid ID was used for recovery');
 }
});

Deno.test('older independently random company or course codes remain usable without fake ID recovery',async()=>{
 const oldRandom='TA-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
 assert(isGiftCode(oldRandom,'TA'),'Legacy random company code was rejected');
 assert(await resolveGiftCode('TA',id,await giftCodeHash(oldRandom))===null,'Random legacy code was incorrectly reconstructed from an unrelated ID');
 const companyCode=await shortGiftCode('TA','aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee');
 assert(isGiftCode(companyCode,'TA')&&companyCode.length===19,'New independent company code is malformed');
 assert(await resolveGiftCode('TA',id,await giftCodeHash(companyCode))===null,'Company code was reconstructed from the gift ID instead of its independent seed');
});
