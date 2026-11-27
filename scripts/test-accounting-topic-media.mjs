import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {topicPhotoAssetId} from '../src/accounting/topic-media.js';

// Synthetic fixture, not paid course content or real user data.
const photo={
 asset_id:'accounting-desk-01',
 origin:'generated_inhouse',
 status:'published',
 alt:'Wygenerowane stanowisko księgowego z kalkulatorem i fikcyjnymi dokumentami'
};
const assetPaths=[
 ['accounting-desk-01','../assets/accounting/generated/accounting-desk-01.webp'],
 ['accounting-archive-02','../assets/accounting/generated/accounting-archive-02.webp'],
 ['accounting-sales-document-2026','../assets/accounting/generated/accounting-sales-document-2026.webp'],
 ['accounting-digital-receipt-2026','../assets/accounting/generated/accounting-digital-receipt-2026.webp'],
 ['accounting-advance-and-settlement-2026','../assets/accounting/generated/accounting-advance-and-settlement-2026.webp'],
 ['accounting-invoice-correction-2026','../assets/accounting/generated/accounting-invoice-correction-2026.webp'],
 ['accounting-retail-close-2026','../assets/accounting/generated/accounting-retail-close-2026.webp'],
 ['accounting-stock-receipt-2026','../assets/accounting/generated/accounting-stock-receipt-2026.webp'],
 ['accounting-purchase-match-2026','../assets/accounting/generated/accounting-purchase-match-2026.webp'],
];
test('Every image is an original local WebP file, small enough for mobile',()=>{
 for(const [id,path] of assetPaths){
  assert.equal(topicPhotoAssetId({...photo,asset_id:id}),id);
  const bytes=readFileSync(new URL(path,import.meta.url));
  const size=statSync(new URL(path,import.meta.url)).size;
  assert.equal(bytes.toString('ascii',0,4),'RIFF',id);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',id);
  assert.ok(size>10000 && size<200000, id+': '+size+' bytes');
 }
});
test('Whitelisted original generated asset IDs resolve without fetching URLs',()=>{
 assert.equal(topicPhotoAssetId(photo),'accounting-desk-01');
 assert.equal(topicPhotoAssetId({...photo,asset_id:'accounting-archive-02'}),'accounting-archive-02');
});
test('Reject external/stock photos, unknown names and unpublished material',()=>{
 const bad=[
  null,undefined,42,[],{},'https://images.unsplash.invalid/photo',
  {...photo,origin:'external_stock'},
  {...photo,origin:'licensed_photo'},
  {...photo,origin:'generated_inhouse',status:'awaiting_asset_deploy'},
  {...photo,status:'draft'}, {...photo,status:undefined},
  {...photo,asset_id:'unknown-asset'},
  {...photo,asset_id:'../../unsafe'},
  {...photo,asset_id:'https://example.invalid/photo.webp'},
  {...photo,alt:''},{...photo,alt:'abc'},
  {...photo,alt:'x'.repeat(181)}
 ];
 for(const value of bad)assert.equal(topicPhotoAssetId(value),null,JSON.stringify(value));
});
test('Reader uses static Expo image bundling with alt, responsive 16:9 and no remote URLs',()=>{
 const reader=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 const gate=readFileSync(new URL('../src/accounting/topic-media.js',import.meta.url),'utf8');
 assert.match(reader,/import \{topicPhotoAssetId\} from/);
 assert.match(reader,/const assetId=topicPhotoAssetId\(photo\)/);
 assert.match(reader,/require\('\.\.\/assets\/accounting\/generated\/accounting-desk-01\.webp'\)/);
 assert.match(reader,/require\('\.\.\/assets\/accounting\/generated\/accounting-archive-02\.webp'\)/);
 assert.match(reader,/source=\{source\}/);
 assert.match(reader,/accessibilityLabel=\{photo\.alt\}/);
 assert.match(reader,/resizeMode="cover"/);
 assert.match(reader,/sectionPhoto:\{width:'100%',aspectRatio:16\/9/);
 assert.match(reader,/<SectionPhoto photo=\{(?:section|currentSection)\.photo\}\/>/);
 for(const [,path] of assetPaths)assert.ok(reader.includes(`require('${path}')`),path);
 assert.doesNotMatch(reader,/source=\{\{uri:.*?\}\}/);
 assert.doesNotMatch(gate,/https?:\/\//);
});
