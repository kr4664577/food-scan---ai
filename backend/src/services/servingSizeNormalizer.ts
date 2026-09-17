export interface NormalizedServing { grams: number | null; multiplier: number; basis: 'GRAMS' | 'CATALOG_PORTION' | 'COUNT' | 'FRACTION' | 'UNKNOWN'; confidence: number; warning?: string; }

const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,v):0;
const fractionValue=(value:string)=>({'1/2':0.5,'half':0.5,'aadha':0.5,'aadhi':0.5,'1/3':1/3,'third':1/3,'tihai':1/3,'1/4':0.25,'quarter':0.25,'pauna':0.75} as Record<string,number>)[value] ?? null;

/** Converts English, Hindi and common Hinglish serving language into a catalog multiplier. It never claims photo-derived weights are exact. */
export function normalizeServingText(text:string, referenceGrams:number):NormalizedServing {
  const raw=(text||'').toLowerCase().trim();
  const s=raw.replace(/[।,]/g,' ').replace(/\s+/g,' ');
  const ref=n(referenceGrams);
  const g=s.match(/(?:~|about|approx\.?|around|lagbhag|karib)?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?|gram|gm|ग्राम)\b/);
  if(g&&ref>0){const grams=Number(g[1]);return {grams,multiplier:grams/ref,basis:'GRAMS',confidence:0.94};}
  const fraction=s.match(/\b(1\/2|1\/3|1\/4|half|quarter|third|aadha|aadhi|tihai|pauna)\b/);
  const fv=fraction?fractionValue(fraction[1]):null;
  if(fv!==null){return {grams:ref?Math.round(ref*fv):null,multiplier:fv,basis:'FRACTION',confidence:0.86};}
  const count=s.match(/\b(\d+(?:\.\d+)?)\s*(?:x\s*)?(?:pieces?|piece|items?|servings?|rotis?|roti|chapatis?|chapati|idlis?|idli|dosas?|dosa|parathas?|paratha|chillas?|chilla|puris?|puri|katoris?|katori|कटोरी|रोटी|चपाती|इडली|डोसा|पराठा)\b/);
  if(count){const multiplier=Number(count[1]);const unit=count[0].replace(/^\s*\d+(?:\.\d+)?\s*/,'').trim();const catalogUnit=/^(?:servings?|bowls?|bowl|cups?|cup|plates?|plate|portions?|portion|katoris?|katori|कटोरी)$/.test(unit);if(multiplier===1&&catalogUnit)return {grams:ref||null,multiplier:1,basis:'CATALOG_PORTION',confidence:0.72,warning:'Serving unit mapped to the catalog reference portion; actual portion may differ.'};return {grams:ref?Math.round(ref*multiplier):null,multiplier,basis:'COUNT',confidence:0.88};}
  const wordCount=s.match(/\b(one|two|three|four|five|ek|do|teen|char|chaar|paanch|एक|दो|तीन|चार|पाँच)\b\s*(?:bowls?|bowl|cups?|cup|plates?|plate|servings?|serving|portions?|portion|katoris?|katori|कटोरी|कटोरियां|कटोरियाँ)\b/);
  if(wordCount){const map:Record<string,number>={one:1,two:2,three:3,four:4,five:5,ek:1,do:2,teen:3,char:4,chaar:4,paanch:5,'एक':1,'दो':2,'तीन':3,'चार':4,'पाँच':5};const multiplier=map[wordCount[1]]||1;return {grams:ref?Math.round(ref*multiplier):null,multiplier,basis:multiplier===1?'CATALOG_PORTION':'COUNT',confidence:multiplier===1?0.72:0.76,warning:multiplier===1?'Serving unit mapped to the catalog reference portion; actual portion may differ.':undefined};}
  if(/\b(?:one|1|ek|एक)\s*(?:serving|bowl|cup|plate|portion|katori|कटोरी)\b/.test(s))return {grams:ref||null,multiplier:1,basis:'CATALOG_PORTION',confidence:0.74,warning:'Serving unit mapped to the catalog reference portion; actual portion may differ.'};
  if(/\b(?:half|1\/2|aadha|aadhi)\s*(?:bowl|cup|plate|serving|portion|katori|कटोरी)\b/.test(s))return {grams:ref?Math.round(ref*0.5):null,multiplier:0.5,basis:'FRACTION',confidence:0.84};
  if(/\b(?:two|2|do|दो)\s*(?:bowls?|cups?|plates?|servings?|portions?|katoris?|katori|कटोरी)\b/.test(s))return {grams:ref?ref*2:null,multiplier:2,basis:'COUNT',confidence:0.76};
  if(/\b(?:three|3|teen|तीन)\s*(?:bowls?|cups?|plates?|servings?|portions?|katoris?|katori|कटोरी)\b/.test(s))return {grams:ref?ref*3:null,multiplier:3,basis:'COUNT',confidence:0.74};
  return {grams:ref||null,multiplier:1,basis:ref?'CATALOG_PORTION':'UNKNOWN',confidence:ref?0.55:0.2,warning:ref?'Could not reliably parse the serving text; using the catalog reference portion.':'Portion could not be normalized reliably.'};
}
