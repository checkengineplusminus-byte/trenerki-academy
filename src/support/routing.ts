import '../../public/academy/support-routing.js';
import {categories} from './directory';

export type SupportResult={categories:string[];urgent:boolean;atRisk:boolean;text:string};
export const routeSupport=(message:string,previous?:SupportResult|null):SupportResult|null=>
 (globalThis as typeof globalThis & {TrenerkiSupport:{route:(message:string,previous?:SupportResult|null)=>SupportResult|null}})
 .TrenerkiSupport.route(message,previous);
export const categoryLabel=(id:string)=>categories.find(([key])=>id===key)?.[1]||'Znajdź bezpłatną pomoc';
