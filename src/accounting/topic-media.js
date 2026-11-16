/**
 * Generated-only image gate for the existing paid accounting course.
 * No stock photos, third-party licences, hotlinks, learner data or keys.
 * Only files hosted by the app itself can be displayed once published.
 */
const GENERATED_PHOTO_PATHS=Object.freeze({
 'accounting-desk-01':'/accounting/generated/accounting-desk-01.webp',
 'accounting-archive-02':'/accounting/generated/accounting-archive-02.webp',
});

export function topicPhotoAssetPath(photo){
 if(!photo||typeof photo!=='object'||Array.isArray(photo))return null;
 if(photo.origin!=='generated_inhouse'||photo.status!=='published')return null;
 if(typeof photo.alt!=='string'||photo.alt.trim().length<12||photo.alt.length>180)return null;
 const id=typeof photo.asset_id==='string'?photo.asset_id:'';
 return Object.prototype.hasOwnProperty.call(GENERATED_PHOTO_PATHS,id)
  ?GENERATED_PHOTO_PATHS[id]:null;
}
