// Liczniki opierają się na kontrakcie RPC, nie na domniemaniu że RLS zwróciło całą tabelę.
export function materialCoverageKnown(isEditor,materialsReady){
 return isEditor===true&&materialsReady===true;
}
export function materialCount(isEditor,materialsReady,visibleCount,overviewAuthored){
 if(isEditor===true)return materialsReady===true&&Number.isSafeInteger(visibleCount)&&visibleCount>=0?visibleCount:null;
 return Number.isSafeInteger(overviewAuthored)&&overviewAuthored>=0?overviewAuthored:null;
}
