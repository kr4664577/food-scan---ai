export interface NormalizedServing { grams: number | null; multiplier: number; basis: 'GRAMS' | 'CATALOG_PORTION' | 'COUNT' | 'FRACTION' | 'UNKNOWN'; confidence: number; warning?: string; }

const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,v):0;

/** Converts common meal-photo serving language into a catalog multiplier. It never claims photo-derived weights are exact. */
export function normalizeServingText(text:string, referenceGrams:number):NormalizedServing {
  const s=(text||'').toLowerCase().trim();
  const ref=n(referenceGrams);
  const g=s.match(/(?:~|about|approx\.?|around)?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/);
  if(g&&ref>0){const grams=Number(g[1]);return {grams,multiplier:grams/ref,basis:'GRAMS',confidence:0.92};}
  const fraction=s.match(/\b(1\/2|1\/3|1\/4|half|quarter|third)\b/);
  const fractionValue=fraction?({'1/2':0.5,'half':0.5,'1/3':1/3,'third':1/3,'1/4':0.25,'quarter':0.25} as Record<string,number>)[fraction[1]]:null;
  if(fractionValue!==null){return {grams:ref?Math.round(ref*fractionValue):null,multiplier:fractionValue,basis:'FRACTION',confidence:0.84};}
  const count=s.match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:pieces?|piece|items?|servings?|rotis?|roti|chapatis?|chapati|idlis?|idli|dosas?|dosa|parathas?|paratha|chillas?|chilla)\b/);
  if(count){const multiplier=Number(count[1]);return {grams:ref?Math.round(ref*multiplier):null,multiplier,basis:'COUNT',confidence:0.86};}
  if(/\b(one|1)\s*(?:serving|bowl|cup|plate|portion)\b/.test(s))return {grams:ref||null,multiplier:1,basis:'CATALOG_PORTION',confidence:0.72,warning:'Serving unit mapped to the catalog reference portion; actual portion may differ.'};
  if(/\b(?:half|1\/2)\s*(?:bowl|cup|plate|serving|portion)\b/.test(s))return {grams:ref?Math.round(ref*0.5):null,multiplier:0.5,basis:'FRACTION',confidence:0.8};
  if(/\b(?:two|2)\s*(?:bowls?|cups?|plates?|servings?|portions?)\b/.test(s))return {grams:ref?ref*2:null,multiplier:2,basis:'COUNT',confidence:0.72};
  if(/\b(?:three|3)\s*(?:bowls?|cups?|plates?|servings?|portions?)\b/.test(s))return {grams:ref?ref*3:null,multiplier:3,basis:'COUNT',confidence:0.7};
  return {grams:ref||null,multiplier:1,basis:ref?'CATALOG_PORTION':'UNKNOWN',confidence:ref?0.55:0.2,warning:ref?'Could not reliably parse the serving text; using the catalog reference portion.':'Portion could not be normalized reliably.'};
}
