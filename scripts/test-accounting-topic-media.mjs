import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topicPhotoAssetPath} from '../src/accounting/topic-media.js';

// Synthetic metadata only; no learner records, secrets or paid content.
const photo={
 asset_id:'accounting-desk-01',
 origin:'generated_inhouse',
 status:'published',
 alt:'Oryginalne wygenerowane stanowisko księgowego z kalkulatorem i dokumentami'
};
test('Original generated assets resolve to local application paths only',()=>{
 assert.equal(topicPhotoAssetPath(photo),'/accounting/generated/accounting-desk-01.webp');
 assert.equal(topicPhotoAssetPath({...photo,asset_id:'accounting-archive-02'}),
  '/accounting/generated/accounting-archive-02.webp');
});
test('Third-party photos, external URLs, unknown files, and unpublished assets fail closed',()=>{
 const bad=[
  null,undefined,'/accounting/generated/accounting-desk-01.webp',
  {...photo,origin:'external_stock'},
  {...photo,status:'awaiting_asset_deploy'},
  {...photo,status:'draft'},
  {...photo,status:undefined},
  {...photo,asset_id:'other-file'},
  {...photo,asset_id:'../../unsafe'},
  {...photo,asset_id:'https://example.invalid/image.webp'},
  {...photo,alt:''},
  {...photo,alt:'abc'},
  {...photo,alt:'a'.repeat(181)}
 ];
 for(const item of bad) assert.equal(topicPhotoAssetPath(item),null,JSON.stringify(item));
});
test('Reader uses only local generated images with no untrusted remote URL',()=>{
 const screen=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 const gate=readFileSync(new URL('../src/accounting/topic-media.js',import.meta.url),'utf8');
 assert.match(screen,/import \{topicPhotoAssetPath\} from/);
 assert.match(screen,/const assetPath=topicPhotoAssetPath\(photo\)/);
 assert.match(screen,/source=\{\{uri:assetPath\}\}/);
 assert.match(screen,/accessibilityLabel=\{photo\.alt\}/);
 assert.match(screen,/resizeMode="cover"/);
 assert.match(screen,/sectionPhoto:\{width:'100%',aspectRatio:16\/9/);
 assert.match(screen,/<SectionPhoto photo=\{section\.photo\}\/>/);
 assert.doesNotMatch(gate,/https?:\/\//);
 assert.doesNotMatch(screen,/dangerouslySetInnerHTML/);
});
