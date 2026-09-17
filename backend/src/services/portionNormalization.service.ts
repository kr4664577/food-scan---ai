import { IndiaFoodCatalogItem } from '../db/indiaFoodCatalog';

export interface NormalizedPortion { multiplier:number; grams:number; basis:string; }

const fraction=(value:string):number|null=>{const s=value.trim().toLowerCase();if(s==='half'||s==='½')return .5;if(s==='quarter'||s==='¼')return .25;const m=s.match(/^(\d+)\s*\/\s*(\d+)$/);return m&&Number(m[2])?Number(m[1])/Number(m[2]):null;};
const grams=(value:string):number|null=>{const m=value.match(/(?:~|about|approx\.?|around)?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i);return m?Number(m[1]):null;};

export const normalizeServingSize=(portion:string,catalog:IndiaFoodCatalogItem):NormalizedPortion=>{
  const text=(portion||'').toLowerCase().replace(/[–—]/g,'-');
  const g=grams(text);
  if(g!==null&&catalog.portionGrams>0)return {multiplier:g/catalog.portionGrams,grams:g,basis:`${g} g normalized against ${catalog.portionLabel}`};
  const units=['roti','chapati','phulka','idli','dosa','paratha','chilla','cheela','bowl','cup','serving','plate','piece','pieces','katori','scoop'];
  const unit=units.find(u=>text.includes(u));
  if(!unit)return {multiplier:1,grams:catalog.portionGrams,basis:`catalog reference portion: ${catalog.portionLabel}`};
  const before=text.slice(0,text.indexOf(unit)).trim(); const tokens=before.split(/\s+/).filter(Boolean); let qty=1;
  for(let i=tokens.length-1;i>=0;i--){const f=fraction(tokens[i]);if(f!==null){qty=f;break;}const v=Number(tokens[i].replace(/[^0-9.]/g,''));if(Number.isFinite(v)&&v>0){qty=v;break;}}
  if(text.includes('half '+unit)||text.includes('½ '+unit))qty=.5;
  if(text.includes('quarter '+unit)||text.includes('¼ '+unit))qty=.25;
  qty=Math.max(.25,Math.min(qty,20));
  return {multiplier:qty,grams:catalog.portionGrams*qty,basis:`${qty} ${unit} normalized against ${catalog.portionLabel}`};
};