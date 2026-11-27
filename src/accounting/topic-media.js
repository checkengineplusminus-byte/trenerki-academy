/**
 * Whitelisted identifiers of original generated images bundled in the application.
 * No customer data, external image servers, remote addresses, or stock photos.
 * The reader owns static require() expressions so Expo can bundle the binaries.
 */
const GENERATED_ASSET_IDS=new Set([
 'accounting-desk-01',
 'accounting-archive-02',
 'accounting-sales-document-2026',
 'accounting-digital-receipt-2026',
 'accounting-advance-and-settlement-2026',
 'accounting-invoice-correction-2026',
 'accounting-retail-close-2026',
 'accounting-stock-receipt-2026',
 'accounting-purchase-match-2026',
]);

export function topicPhotoAssetId(photo){
 if(!photo||typeof photo!=='object'||Array.isArray(photo))return null;
 if(photo.origin!=='generated_inhouse'||photo.status!=='published')return null;
 if(typeof photo.alt!=='string'||photo.alt.trim().length<12||photo.alt.length>180)return null;
 const id=typeof photo.asset_id==='string'?photo.asset_id:'';
 return GENERATED_ASSET_IDS.has(id)?id:null;
}
