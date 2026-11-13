import assert from 'node:assert/strict';
import {checkExercise,parsePolishNumber,sourceURL} from '../src/accounting/reader-core.js';

// Przykłady są fikcyjnymi danymi testowymi, a nie kluczami płatnego kursu.
const numeric={id:'test-kwota',type:'number',expected:1450.75,tolerance:0.005,unit:'zł',explanation:'Suma dwóch fikcyjnych składników.'};
const choice={id:'test-wybor',type:'choice',choices:['A','B','C'],correctIndex:1,explanation:'Druga odpowiedź jest poprawna.'};
assert.equal(parsePolishNumber('1 450,75'),1450.75,'przecinek i spacja tysięcy');
assert.equal(parsePolishNumber('1450.75'),1450.75,'kropka dziesiętna');
assert.equal(parsePolishNumber('1 45,75'),null,'nieprawidłowe grupowanie');
assert.equal(parsePolishNumber('1e3'),null,'niedozwolony zapis wykładniczy');
assert.equal(parsePolishNumber('Infinity'),null,'niedozwolona nieskończoność');
assert.equal(checkExercise(numeric,'1 450,75').correct,true,'poprawna odpowiedź liczbowa');
assert.equal(checkExercise(numeric,'1 450,74').correct,false,'niepoprawna odpowiedź liczbowa');
assert.equal(checkExercise(numeric,'abc').valid,false,'nieprawidłowe dane nie są zaliczane');
assert.equal(checkExercise(choice,'1').correct,true,'poprawny wybór');
assert.equal(checkExercise(choice,'2').correct,false,'błędny wybór');
assert.equal(checkExercise(choice,'9').valid,false,'odpowiedź spoza zakresu');
assert.equal(checkExercise({type:'opis',explanation:'tekst'},'tekst').valid,false,'nieobsługiwany typ nie jest zaliczany');
assert.equal(sourceURL('https://www.gov.pl/').startsWith('https://'),true,'urzędowy adres HTTPS');
assert.equal(sourceURL('javascript:alert(1)'),null,'niebezpieczny protokół');
console.log('14/14 prób walidatora ćwiczeń core-v3 zakończonych powodzeniem; nie są to próby kont użytkowników.');
