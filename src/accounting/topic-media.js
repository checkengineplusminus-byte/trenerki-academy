/**
 * Media added to the existing private course reader.
 * No learner records or answer keys are processed here.
 * Only explicitly licensed, curated photo URLs may be rendered.
 * A rejected URL must render nothing, never an arbitrary remote resource.
 */
const PHOTO_URL=/^https:\/\/images\.unsplash\.com\/photo-\d{13}-[a-f0-9]{12}(?:\?auto=format&fit=crop&w=(?:[6-9]\d{2}|1[0-6]\d{2})&q=(?:[5-8]\d|90))?$/;
const SOURCE_URL=/^https:\/\/unsplash\.com\/photos\/[a-z0-9-]+-[A-Za-z0-9_-]{11}$/i;

export function topicPhotoUrl(photo){
 if(!photo||typeof photo!=='object'||Array.isArray(photo))return null;
 if(typeof photo.src!=='string'||!PHOTO_URL.test(photo.src))return null;
 if(typeof photo.alt!=='string'||photo.alt.trim().length<12||photo.alt.length>180)return null;
 if(photo.license!=='Unsplash License'||typeof photo.source_page!=='string'||
    !SOURCE_URL.test(photo.source_page))return null;
 return photo.src;
}
