import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');

test('Paid course reader visibly renders extra independent homework tasks when provided',()=>{
 assert.match(screen,/Array\.isArray\(m\.practice\.homework\)/);
 assert.match(screen,/m\.practice\.homework\.filter\(/);
 assert.match(screen,/Dodatkowe polecenia/);
 assert.match(screen,/showExtraHomework&&/);
 assert.match(screen,/\{h\.task\}/);
 assert.match(screen,/\{h\.deliverable\}/);
 assert.match(screen,/\{h\.id\|\|i\}/);
});

test('Extra homework lives inside the existing authenticated course reader and uses its submission',()=>{
 const start=screen.indexOf('{m.practice&&<View style={s.practice}>');
 const extra=screen.indexOf('Dodatkowe polecenia');
 const input=screen.indexOf('accessibilityLabel="Rozwiązanie pracy domowej"');
 assert.ok(start>=0&&input>start&&extra>input,'Answer field must be shown immediately before optional expanded instructions');
 assert.match(screen,/saveHomework\(true\)/);
 assert.doesNotMatch(screen,/dangerouslySetInnerHTML/);
});
