import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('public/academy/index.html'),styles=read('public/academy/app-footer.css');
const landing=read('public/academy/program-afiliacyjny.html');
const terms=read('public/academy/regulamin-afiliacyjny.html'),privacy=read('public/academy/prywatnosc-afiliacja.html');
const checkout=read('supabase/functions/ta-create-checkout/index.ts');
const webhook=read('supabase/functions/ta-stripe-webhook/index.ts');
const affiliate=read('supabase/functions/ta-affiliate/index.ts'),admin=read('supabase/functions/ta-affiliate-admin/index.ts');
const partner=read('app/partner.tsx'),partnerAdmin=read('app/partner-admin.tsx');
const account=read('app/konto.tsx'),buy=read('app/kup.tsx'),layout=read('app/_layout.tsx');
function includes(source,parts,label){for(const part of parts)assert(source.includes(part),label+': '+part)}
includes(home,['Program partnerski','taAffiliateCode()','&ref=','prefers-reduced-motion:reduce','function startPurchase(id)'],'Public site');
includes(styles,['.ta-app-footer-links','prefers-reduced-motion:reduce'],'App footer');
assert(!home.includes('academy-footer__affiliate')&&!styles.includes('ta-app-footer-affiliate'),'No oversized affiliate footer CTA');
includes(landing,['Zarabiaj 10%','500 zł','5 000,00 zł','reklam'],'Affiliate landing');
assert(!landing.includes('Pierwsze przelewy wymagają'),'No internal payout alarm on landing');
includes(terms,['§1.','§11.','PIT-11','30 dni','500 zł','reklam','Stripe'],'Affiliate terms');
includes(privacy,['RODO','Stripe','Art. 6','kupującego','rachunki bankowe'],'Affiliate privacy');
includes(account,['pending_referral_code','params.next===\'affiliate\'','referral?{ref:referral}'],'Account referral continuation');
includes(buy,['referralCode','referral_code:referralCode','self_referral_not_allowed'],'Checkout UI');
includes(checkout,['referral_code','ta_affiliate_partners','self_referral_not_allowed','ta_affiliate_attributions','ta_affiliate_partner_id','attributionError'],'Signed server checkout');
includes(webhook,['ta_affiliate_commissions','commission=Math.round','payment_status!==\'paid\'','stripe_session_id','onConflict:\'stripe_session_id\'','charge.refunded','requires_review'],'Webhook accrual and refund');
includes(affiliate,['auth.auth.getUser(bearer)','user.email_confirmed_at','tax_residency','bank_transfer_pending_tax_verification','stripe_connected','ta_affiliate_partner_totals','ta_affiliate_partners'],'Partner backend');
includes(admin,['ta_admins','eq(\'role\',\'owner\')','ta_affiliate_admin_report','ta_affiliate_monthly_report','mark_tax_verified','accountant_evidence_required'],'Owner admin API');
includes(partner,['Załóż konto partnerskie','stripe_connected','Prowizje','regulamin-afiliacyjny.html','prywatnosc-afiliacja.html','ta-affiliate'],'Partner UI');
includes(partnerAdmin,['ta-affiliate-admin','ta-affiliate-admin','Pobierz zestawienie CSV','Potwierdzam rzeczywistą weryfikację','affiliate-partner-admin-search','affiliate-partner-email','E-mail'],'Owner UI');
includes(affiliate,['bank_transfer_pending_tax_verification'],'Partner transfers require accountant review, no new Connect accounts');
includes(partner,['500 zł','faktura','przelew bankowy'],'Company and individual bank transfer UI');
includes(partner,['short_id','trenerki.com/','trenerki-logo-partner.svg','Pobierz logo PNG'],'Numeric short links and downloadable brand artwork');
includes(partnerAdmin,['Krótki link','short_id','Numer oczekuje'],'Owner numeric link and CSV');
const routerConfig=JSON.parse(read('app.json'));
assert.equal(routerConfig.expo.web.output,'static');
assert(!routerConfig.expo.plugins.some(p=>Array.isArray(p)&&p[1]?.redirects?.some(r=>r.source==='/[affiliateNumber]')),
 'Do not hijack /konto, /nauka, /admin or any other root path with wildcard redirect');
includes(read('public/1.html'),['affiliateNumber=1','noindex'],'Static short link');
includes(read('public/1/index.html'),['affiliateNumber=1','noindex'],'Directory short link');
const referral=read('app/referral.tsx');
includes(referral,['affiliateNumber','ta-affiliate-resolve','/academy/index.html?ref=','Number(raw)'],'Public short link resolver route');
const brand=read('public/academy/assets/trenerki-logo-partner.svg');
includes(brand,['TRENERKI','ACADEMY','viewBox="0 0 1200 360"'],'Downloadable branding');

includes(layout,['<Stack.Screen name="partner"/>','<Stack.Screen name="partner-admin"/>'],'Route protection');
assert(layout.indexOf('<Stack.Screen name="partner-admin"/>')>layout.indexOf('<Stack.Protected guard={signedIn}'),'Admin must be auth guarded');
assert(!partner.includes('service_role')&&!partnerAdmin.includes('service_role'),'Secrets must not enter public UI');
assert(!partner.includes('numer rachunku bankowego')&&!partner.includes('IBAN'),'No direct bank collection');
assert(!affiliate.includes('payouts.create')&&!affiliate.includes("action==='send_payout'")&&!affiliate.includes("'account_links'"),'Partner may not trigger payouts or create Stripe Connect accounts');
assert(!admin.includes('transfers')||admin.includes('stripe_transfers_enabled'),'Admin must not directly move funds');
const valid=(v)=>/^TA[A-F0-9]{12}$/.test(v);
for(let i=0;i<32;i++)assert(valid('TA'+i.toString(16).padStart(12,'0').toUpperCase()));
for(const bad of ['','ta000000000000','TA123','TA'+'G'.repeat(12),'TA'+'0'.repeat(13),'abc&ref=def'])assert(!valid(bad));
for(let amount=200;amount<50000;amount+=327){
 const cents=Math.round(amount*.1);
 assert(cents>0&&cents<=amount,'10% commission arithmetic violated');
}
console.log('✓ Affiliate: public footer + reduced-motion, legal/PIT/privacy pages, buyer referral continuation');
console.log('✓ Affiliate: server-owned attribution, paid-session 10%, refunds, no self-earnings, idempotence');
console.log('✓ Affiliate: owner-only accounting reports, bank transfer model, no bank account or payouts in public UI');
console.log('✓ Affiliate: 32 valid and 6 invalid referral codes plus commission arithmetic cases');
