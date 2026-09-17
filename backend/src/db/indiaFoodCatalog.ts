export interface IndiaFoodCatalogItem {
  name: string;
  aliases: string[];
  portionGrams: number;
  portionLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  ingredients: string[];
}

/** Conservative reference portions for common Indian foods. Values are reference estimates, not laboratory measurements. */
export const INDIA_FOOD_CATALOG: IndiaFoodCatalogItem[] = [
  {name:'Roti / Chapati',aliases:['roti','chapati','phulka','fulka'],portionGrams:40,portionLabel:'1 medium roti (~40g)',calories:110,protein:3.5,carbs:18,fat:2.5,fiber:3,sugar:0.5,sodium:120,saturatedFat:0.4,ingredients:['whole wheat flour','water','salt']},
  {name:'Cooked Basmati Rice',aliases:['rice','basmati rice','cooked rice','chawal','plain rice'],portionGrams:150,portionLabel:'1 cup cooked (~150g)',calories:195,protein:4,carbs:43,fat:0.4,fiber:0.6,sugar:0.1,sodium:2,saturatedFat:0.1,ingredients:['basmati rice','water']},
  {name:'Dal Tadka',aliases:['dal','daal','dal tadka','yellow dal','toor dal','dal fry'],portionGrams:180,portionLabel:'1 bowl (~180g)',calories:210,protein:11,carbs:29,fat:6,fiber:9,sugar:3,sodium:380,saturatedFat:1.5,ingredients:['lentils','tomato','onion','spices','oil']},
  {name:'Rajma Curry',aliases:['rajma','rajma curry','kidney beans','rajma masala'],portionGrams:180,portionLabel:'1 bowl (~180g)',calories:235,protein:13,carbs:34,fat:5,fiber:10,sugar:4,sodium:360,saturatedFat:0.8,ingredients:['kidney beans','tomato','onion','spices','oil']},
  {name:'Chole / Chana Masala',aliases:['chole','chana','chana masala','chhole','chickpea curry'],portionGrams:180,portionLabel:'1 bowl (~180g)',calories:270,protein:13,carbs:38,fat:7,fiber:10,sugar:5,sodium:420,saturatedFat:1,ingredients:['chickpeas','tomato','onion','spices','oil']},
  {name:'Poha',aliases:['poha','pohe','kanda poha','batata poha','flattened rice'],portionGrams:200,portionLabel:'1 bowl (~200g)',calories:250,protein:5,carbs:42,fat:7,fiber:3,sugar:3,sodium:420,saturatedFat:1,ingredients:['flattened rice','onion','potato','peanuts','spices','oil']},
  {name:'Upma',aliases:['upma','rava upma','suji upma','sooji upma'],portionGrams:200,portionLabel:'1 bowl (~200g)',calories:250,protein:6,carbs:38,fat:8,fiber:3,sugar:3,sodium:420,saturatedFat:1.2,ingredients:['semolina','vegetables','spices','oil']},
  {name:'Idli',aliases:['idli','idly'],portionGrams:120,portionLabel:'3 medium idlis (~120g)',calories:175,protein:6,carbs:36,fat:1,fiber:2,sugar:1,sodium:180,saturatedFat:0.2,ingredients:['rice','urad dal','water','salt']},
  {name:'Plain Dosa',aliases:['dosa','plain dosa','dosai','sada dosa'],portionGrams:100,portionLabel:'1 medium dosa (~100g)',calories:170,protein:4,carbs:30,fat:4,fiber:2,sugar:1,sodium:260,saturatedFat:0.7,ingredients:['rice','urad dal','oil','salt']},
  {name:'Aloo Paratha',aliases:['aloo paratha','aloo parantha','potato paratha'],portionGrams:150,portionLabel:'1 medium aloo paratha (~150g)',calories:300,protein:7,carbs:45,fat:10,fiber:5,sugar:2,sodium:430,saturatedFat:2.5,ingredients:['whole wheat flour','potato','spices','oil or ghee']},
  {name:'Paneer Tikka',aliases:['paneer tikka','tandoori paneer'],portionGrams:150,portionLabel:'1 serving (~150g)',calories:300,protein:20,carbs:9,fat:21,fiber:2,sugar:4,sodium:500,saturatedFat:11,ingredients:['paneer','yogurt','spices','vegetables','oil']},
  {name:'Palak Paneer',aliases:['palak paneer','spinach paneer'],portionGrams:200,portionLabel:'1 bowl (~200g)',calories:300,protein:15,carbs:13,fat:21,fiber:5,sugar:4,sodium:480,saturatedFat:10,ingredients:['paneer','spinach','tomato','onion','spices','oil']},
  {name:'Sambar',aliases:['sambar','sambhar'],portionGrams:180,portionLabel:'1 bowl (~180g)',calories:130,protein:6,carbs:20,fat:3,fiber:6,sugar:4,sodium:480,saturatedFat:0.5,ingredients:['toor dal','vegetables','tamarind','spices']},
  {name:'Curd / Dahi',aliases:['curd','dahi','plain yogurt','yogurt'],portionGrams:150,portionLabel:'1 bowl (~150g)',calories:95,protein:5,carbs:7,fat:5,fiber:0,sugar:7,sodium:70,saturatedFat:3,ingredients:['milk','live cultures']},
  {name:'Vegetable Pulao',aliases:['veg pulao','vegetable pulao','pulao'],portionGrams:220,portionLabel:'1 bowl (~220g)',calories:300,protein:7,carbs:48,fat:9,fiber:4,sugar:4,sodium:430,saturatedFat:1.5,ingredients:['rice','mixed vegetables','spices','oil']},
  {name:'Besan Chilla',aliases:['besan chilla','besan cheela','chilla','cheela'],portionGrams:120,portionLabel:'2 medium chillas (~120g)',calories:220,protein:11,carbs:27,fat:7,fiber:5,sugar:3,sodium:300,saturatedFat:1,ingredients:['gram flour','onion','vegetables','spices','oil']}
];

const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tokens=(value:string)=>new Set(normalize(value).split(/\s+/).filter(t=>t.length>=3));

export const findIndiaFood=(query:string):IndiaFoodCatalogItem|null=>{
  const q=normalize(query); if(!q)return null;
  for(const item of INDIA_FOOD_CATALOG){if(item.aliases.some(a=>q===normalize(a)||q.includes(normalize(a))))return item;}
  const qt=tokens(q); let best:IndiaFoodCatalogItem|null=null; let bestScore=0;
  for(const item of INDIA_FOOD_CATALOG){const it=new Set(item.aliases.flatMap(a=>[...tokens(a)]));let hits=0;for(const t of qt)if(it.has(t))hits++;const score=hits/Math.max(1,Math.min(qt.size,it.size));if(score>=0.75&&score>bestScore){best=item;bestScore=score;}}
  return best;
};
