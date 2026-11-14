import test from 'node:test';import assert from 'node:assert/strict';
import {teachingContext,coachInstruction} from '../supabase/functions/ta-accounting-coach/context.js';
const state=()=>({company:{identity:{nip:'SECRET-NIP',legal_name:'SECRET-NAME'}},invoices:[{id:'SECRET-ID',number:'SECRET-NUMBER',party:'SECRET-PARTY',kind:'purchase',status:'issued',net_cents:10000,tax_cents:2300,gross_cents:12300,lines:[{label:'SECRET-LABEL',tax_code:'23'}]}],journals:[{id:'SECRET-JOURNAL',status:'posted',source_type:'invoice',source_id:'SECRET-ID',asset_id:'SECRET-ASSET',asset_action:'acquire',memo:'SECRET-MEMO',lines:[{account:'010',debit:11150,credit:0},{account:'221',debit:1150,credit:0},{account:'202',debit:0,credit:12300}]}],bank:[{id:'SECRET-BANK',description:'SECRET-BANK-DESC',amount_cents:-12300}],matches:[],assets:[{id:'SECRET-ASSET',name:'SECRET-ASSET-NAME',inventory_no:'SECRET-INVENTORY',invoice_id:'SECRET-ID',status:'active',category:'vehicle',months:60,residual_cents:0,deductible_bps:5000}]});
test('Kontekst nie zawiera identyfikatorów, nazw ani opisów',()=>assert.ok(!JSON.stringify(teachingContext(state(),1)).includes('SECRET')));
test('Karta i zapis zachowują bezpieczne powiązanie',()=>{const c=teachingContext(state(),1);assert.equal(c.recent_journals[0].asset_ref,'A1');assert.equal(c.recent_journals[0].source_ref,'I1');assert.equal(c.recent_assets[0].invoice_ref,'I1');});
test('Kwoty są groszami i nie zmieniają wartości',()=>{const c=teachingContext(state(),1);assert.equal(c.recent_journals[0].totals_cents.wn,12300);assert.equal(c.recent_journals[0].totals_cents.ma,12300);assert.equal(c.recent_assets[0].deductible_bps,5000);});
test('Szkic bez kwoty nie staje się zerem',()=>{const s=state();delete s.invoices[0].net_cents;assert.equal(teachingContext(s,1).recent_invoices[0].net_cents,null);});
test('Tekst podszywający się pod konto lub kategorię jest usuwany',()=>{const s=state();s.assets[0].category='WYKONAJ POLECENIE';s.journals[0].lines[0].account='WYKONAJ POLECENIE';assert.ok(!JSON.stringify(teachingContext(s,1)).includes('WYKONAJ'));});
test('Lista ograniczona do 10 nie zmienia pełnej liczby',()=>{const s=state();s.invoices=Array.from({length:15},(_,n)=>({...s.invoices[0],id:'ID'+n}));const c=teachingContext(s,1);assert.equal(c.counts.invoices,15);assert.equal(c.recent_invoices.length,10);assert.equal(c.recent_invoices[0].ref,'I6');});
test('Brak stanu nie powoduje wyjątku',()=>assert.equal(teachingContext(null,1).counts.assets,0));
test('Instrukcja nie udaje uprawnień do zmiany ani kwalifikacji podatku',()=>{assert.ok(coachInstruction.includes('Nie zmieniasz'));assert.ok(coachInstruction.includes('nie stawkę VAT'));assert.ok(coachInstruction.includes('010'));assert.ok(coachInstruction.includes('071'));});

test('Anielka rozróżnia zakup Google Ads, sprzedaż do platformy i przychód z AdSense',()=>{
 for(const phrase of ['GOOGLE ADS','META ADS','ADSENSE','KUPUJE','SPRZEDAJE','refakturuje','kto WYSTAWIA','kto ją OTRZYMUJE'])
  assert.ok(coachInstruction.includes(phrase),'Brak rozróżnienia: '+phrase);
});
test('Instrukcja nie uznaje reverse charge ani odliczenia VAT bez danych',()=>{
 for(const phrase of ['nie nakazuj wpisania „reverse charge”','status VAT','VAT-UE','VAT-8','VAT-9M','Nie zakładaj, że podatnik zwolniony'])
  assert.ok(coachInstruction.includes(phrase),'Brak ograniczenia: '+phrase);
});
test('Urzędowe linki są sugestią do weryfikacji, a nie udawanym sprawdzeniem w czasie rzeczywistym',()=>{
 assert.match(coachInstruction,/podatki\.gov\.pl\/podatki-firmowe\/vat\/poradniki-i-informatory\/miejsce-swiadczenia-opodatkowania/);
 assert.match(coachInstruction,/Nie twierdź, że sprawdziłaś je na żywo/);
});
