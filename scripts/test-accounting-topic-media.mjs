import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {topicPhotoUrl} from '../src/accounting/topic-media.js';

// Publicly licensed, synthetic metadata only. No course materials or learner records.
const photo={
 src:'https://images.unsplash.com/photo-1758876201660-103984519266?auto=format&fit=crop&w=1200&q=75',
 alt:'Osoba przegląda dokumenty przy biurku i komputerze',
 license:'Unsplash License',
 source_page:'https://unsplash.com/photos/woman-working-with-documents-at-office-desk-Vvn0OD0IxBM'
};
test('Photographs with verified Unsplash licence and descriptive alt can render',()=>{
 assert.equal(topicPhotoUrl(photo),photo.src);
 assert.equal(topicPhotoUrl({...photo,src:'https://images.unsplash.com/photo-1762341122023-3aac65b1d787?auto=format&fit=crop&w=1200&q=75'}),
  'https://images.unsplash.com/photo-1762341122023-3aac65b1d787?auto=format&fit=crop&w=1200&q=75');
});
test('Unknown, unsafe or unlicensed images fail closed rather than load',()=>{
 const bad=[
  null,undefined,'https://images.unsplash.com/photo-1758876201660-103984519266',
  {...photo,src:'http://images.unsplash.com/photo-1758876201660-103984519266'},
  {...photo,src:'https://images.unsplash.com.attacker.tld/photo-1758876201660-103984519266'},
  {...photo,src:'https://images.unsplash.com/photo-1758876201660-103984519266?token=secret'},
  {...photo,src:'data:image/svg+xml,%3Csvg%3E'},
  {...photo,src:'https://images.unsplash.com/photo-1758876201660-103984519266#tracking'},
  {...photo,src:'https://images.unsplash.com/photo-1758876201660-103984519266?w=99999'},
  {...photo,license:'Unsplash+'},
  {...photo,source_page:'https://evil.example/photos/abc'},
  {...photo,alt:''},
  {...photo,alt:'a'.repeat(181)}
 ];
 for(const item of bad) assert.equal(topicPhotoUrl(item),null,JSON.stringify(item));
});
test('Only existing core topic reader displays responsive accessible photographs without overlays',()=>{
 const screen=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.match(screen,/import \{topicPhotoUrl\} from/);
 assert.match(screen,/source=\{\{uri:src\}\}/);
 assert.match(screen,/accessibilityLabel=\{photo\.alt\}/);
 assert.match(screen,/resizeMode="cover"/);
 assert.match(screen,/sectionPhoto:\{width:'100%',aspectRatio:16\/9/);
 assert.match(screen,/<SectionPhoto photo=\{section\.photo\}\/>/);
 assert.doesNotMatch(screen,/dangerouslySetInnerHTML/);
});
