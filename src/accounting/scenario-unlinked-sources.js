/**
 * Kontrola pokrycia wszystkich 36 fikcyjnych dowodów, NIE tylko faktur,
 * banku i korekt. Trzy istniejące mosty dowodzą wyłącznie wskazanych
 * kategorii; poprawny quiz Wn/Ma nie jest zapisem źródła w biurze.
 *
 * Bez danych kursanta, bez kluczy odpowiedzi i bez zapisu. Gdy zabraknie
 * osobnego, sprawdzalnego mostu dla pozostałych typów, wynik fail-closed.
 */
import {readScenario} from './simulator-core.js';

const LINKED_BY_DEDICATED_BRIDGE = new Set([
  'sale','purchase','correction','bank_in','bank_out'
]);
const empty = (status, issues=[]) => ({
  passed:false,status,total:0,covered_by_existing_bridge:0,pending:0,
  pending_doc_ids:[],pending_by_kind:{},issues
});

export function inspectScenarioUnlinkedSources(rawScenario) {
  if(!rawScenario)return empty('not_tested');
  let scenario;
  try{scenario=readScenario(rawScenario);}
  catch{return empty('manifest_invalid',[{code:'scenario_unlinked_manifest_invalid'}]);}
  const pendingDocuments=scenario.documents.filter(
    doc=>!LINKED_BY_DEDICATED_BRIDGE.has(doc.kind)
  );
  const pendingByKind=Object.create(null);
  for(const doc of pendingDocuments)pendingByKind[doc.kind]=(pendingByKind[doc.kind]||0)+1;
  const pendingIds=pendingDocuments.map(doc=>doc.id);
  return {
    passed:pendingIds.length===0,
    status:pendingIds.length?'source_bridges_not_implemented':'categories_covered_by_existing_bridges',
    total:scenario.documents.length,
    covered_by_existing_bridge:scenario.documents.length-pendingIds.length,
    pending:pendingIds.length,
    pending_doc_ids:pendingIds,
    pending_by_kind:{...pendingByKind},
    issues:pendingIds.map(id=>({code:'scenario_unlinked_document_kind',invoice:id})),
    // KSeF/JPK, prawo i E2E pozostają odrębnymi bramkami nawet przy 0 braków.
    legal_review:'not_tested'
  };
}
