export interface FoodCatalogItem {
  category: 'HOME_FOOD' | 'RESTAURANT_FOOD' | 'OUTSIDE_PACKAGED' | 'FRUITS' | 'VEGETABLES';
  name: string;
  brandName?: string;
  barcode?: string;
  keywords: string[];
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number; // in mg
  saturatedFat: number;
  truthScore: number; // 0.0 to 5.0
  novaLevel: 1 | 2 | 3 | 4;
  ratingCategory: 'GOOD' | 'MODERATE' | 'BAD';
  healthySwaps: Array<{
    name: string;
    brand: string;
    calories: number;
    rating: number;
    reason: string;
  }>;
  ingredients: string[];
  allergens: string[];
  healthSummary: string;
}

export const FOOD_MASTER_CATALOG: FoodCatalogItem[] = [
  // ==================== 1. HOME FOOD ====================
  {
    category: 'HOME_FOOD',
    name: 'Whole Wheat Rotis with Spiced Vegetable Bhaji',
    keywords: ['roti', 'bhaji', 'rotis and bhaji', 'chapati and bhaji', 'sabzi', 'sabji', 'roti bhaji', 'chapati'],
    portion: '2 Rotis + 1 Bowl Bhaji (~220g)',
    calories: 340,
    protein: 11,
    carbs: 48,
    fat: 12,
    fiber: 9,
    sugar: 4,
    sodium: 480,
    saturatedFat: 2.2,
    truthScore: 4.6,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [
      { name: 'Multigrain Methi Rotis with Lauki Sabzi', brand: 'Home Kitchen', calories: 280, rating: 4.9, reason: 'Higher fiber and less oil.' }
    ],
    ingredients: ['Whole Wheat Atta Flour', 'Mixed Vegetables (Potatoes, Cauliflower, Peas)', 'Tomatoes', 'Onions', 'Sunflower Oil', 'Turmeric', 'Garam Masala'],
    allergens: ['Wheat (Gluten)'],
    healthSummary: 'Balanced wholesome home meal. Whole wheat rotis supply complex carbs while vegetable bhaji delivers essential vitamins.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Steamed Basmati Rice with Yellow Dal Tadka',
    keywords: ['dal rice', 'dal tadka', 'dal chawal', 'yellow dal', 'daal rice', 'rice and dal'],
    portion: '1 Bowl Rice + 1 Bowl Dal (~250g)',
    calories: 360,
    protein: 13,
    carbs: 62,
    fat: 6.5,
    fiber: 7.5,
    sugar: 2,
    sodium: 420,
    saturatedFat: 1.8,
    truthScore: 4.5,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [
      { name: 'Brown Rice with Palak Moong Dal', brand: 'Home Kitchen', calories: 310, rating: 4.9, reason: 'Lower glycemic index and higher iron content.' }
    ],
    ingredients: ['Basmati Rice', 'Toor Dal (Pigeon Pea)', 'Moong Dal', 'Tomatoes', 'Ghee (Clarified Butter)', 'Cumin Seeds', 'Garlic', 'Turmeric'],
    allergens: ['Milk / Dairy (Ghee)'],
    healthSummary: 'Classic complete protein pair: lentils combine with rice to provide all essential amino acids with gut-friendly spices.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Punjabi Rajma Chawal with Fresh Salad',
    keywords: ['rajma', 'rajma chawal', 'kidney beans', 'rajma rice'],
    portion: '1 Plate (~280g)',
    calories: 410,
    protein: 16,
    carbs: 68,
    fat: 8,
    fiber: 12,
    sugar: 3.5,
    sodium: 520,
    saturatedFat: 1.5,
    truthScore: 4.7,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Red Kidney Beans (Rajma)', 'Basmati Rice', 'Onions', 'Tomatoes', 'Ginger-Garlic', 'Mustard Oil', 'Coriander'],
    allergens: [],
    healthSummary: 'High-fiber, plant-protein powerhouse. Promotes sustained energy and supports cardiovascular health.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Chole Masala with Fluffy Bhature',
    keywords: ['chole bhature', 'chana bhatura', 'bhature', 'chhole'],
    portion: '2 Bhature + 1 Bowl Chole (~300g)',
    calories: 620,
    protein: 15,
    carbs: 78,
    fat: 28,
    fiber: 8,
    sugar: 5,
    sodium: 820,
    saturatedFat: 7.5,
    truthScore: 2.7,
    novaLevel: 3,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Pindi Chole with Tandoori Whole Wheat Roti', brand: 'Home Kitchen', calories: 380, rating: 4.5, reason: 'Saves 240 kcal & avoids deep-fried refined maida oil.' },
      { name: 'Boiled Chickpea Chaat with Veggies', brand: 'Home Kitchen', calories: 220, rating: 4.8, reason: 'Zero deep frying with high dietary fiber.' }
    ],
    ingredients: ['Chickpeas (Kabuli Chana)', 'Refined Flour (Maida)', 'Hydrogenated Vegetable Oil', 'Tomatoes', 'Garam Masala', 'Baking Powder'],
    allergens: ['Wheat (Gluten)'],
    healthSummary: 'Deep-fried high-calorie meal. Enjoy as an occasional treat; swap to tandoori whole wheat rotis to cut excess fats.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Moong Dal Khichdi with Pure Cow Ghee',
    keywords: ['khichdi', 'kitchari', 'moong khichdi', 'dal khichdi'],
    portion: '1 Bowl (~220g)',
    calories: 290,
    protein: 10,
    carbs: 46,
    fat: 7,
    fiber: 5.5,
    sugar: 1.5,
    sodium: 380,
    saturatedFat: 2.8,
    truthScore: 4.8,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Yellow Moong Dal', 'Rice', 'Cow Ghee', 'Cumin Seeds', 'Asafoetida (Hing)', 'Turmeric', 'Ginger'],
    allergens: ['Milk / Ghee'],
    healthSummary: 'Extremely easy-to-digest soothing Ayurvedic meal rich in light plant proteins and anti-inflammatory turmeric.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Steamed Idli with Lentil Sambhar & Coconut Chutney',
    keywords: ['idli', 'idly', 'idli sambar', 'idli chutney'],
    portion: '3 Idlis + Sambhar (~220g)',
    calories: 260,
    protein: 9,
    carbs: 48,
    fat: 3.5,
    fiber: 6,
    sugar: 3,
    sodium: 460,
    saturatedFat: 1.2,
    truthScore: 4.7,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Fermented Rice Batter', 'Urad Dal', 'Toor Dal', 'Tamarind', 'Curry Leaves', 'Mustard Seeds'],
    allergens: [],
    healthSummary: 'Steam-cooked fermented delicacy rich in natural gut-friendly probiotics, low in oil, and high in digestible carbs.'
  },
  {
    category: 'HOME_FOOD',
    name: 'Stuffed Aloo Paratha with Fresh Curd',
    keywords: ['aloo paratha', 'paratha', 'paratha with curd', 'aloo parantha'],
    portion: '1 Large Paratha + 1 Cup Curd (~200g)',
    calories: 380,
    protein: 9.5,
    carbs: 54,
    fat: 14,
    fiber: 5,
    sugar: 3,
    sodium: 490,
    saturatedFat: 4.5,
    truthScore: 3.8,
    novaLevel: 2,
    ratingCategory: 'MODERATE',
    healthySwaps: [
      { name: 'Paneer & Methi Tawa Paratha (Light Oil)', brand: 'Home Kitchen', calories: 310, rating: 4.6, reason: 'Doubles protein and lowers starch intake.' }
    ],
    ingredients: ['Whole Wheat Flour', 'Mashed Spiced Potatoes', 'Green Chillies', 'Butter / Ghee', 'Plain Yogurt Curd'],
    allergens: ['Wheat (Gluten)', 'Milk / Dairy'],
    healthSummary: 'Comforting traditional breakfast. Good probiotic benefits from curd; control butter/ghee for optimal heart health.'
  },

  // ==================== 2. RESTAURANT FOOD ====================
  {
    category: 'RESTAURANT_FOOD',
    name: 'Paneer Butter Masala with Garlic Naan',
    keywords: ['paneer butter masala', 'paneer makhani', 'garlic naan', 'paneer and naan', 'shahi paneer'],
    portion: '1 Bowl Paneer + 1 Naan (~260g)',
    calories: 560,
    protein: 21,
    carbs: 46,
    fat: 32,
    fiber: 3.5,
    sugar: 7,
    sodium: 740,
    saturatedFat: 14,
    truthScore: 3.2,
    novaLevel: 3,
    ratingCategory: 'MODERATE',
    healthySwaps: [
      { name: 'Tandoori Paneer Tikka with Whole Wheat Roti', brand: 'Restaurant Kitchen', calories: 370, rating: 4.6, reason: 'Saves 190 kcal & 18g heavy cream fats.' },
      { name: 'Palak Paneer with Tandoori Roti', brand: 'Restaurant Kitchen', calories: 340, rating: 4.7, reason: 'Iron-rich spinach gravy with unrefined whole wheat.' }
    ],
    ingredients: ['Paneer (Cottage Cheese)', 'Heavy Cream', 'Butter', 'Cashew Paste', 'Tomatoes', 'Refined Wheat Flour Naan', 'Garlic'],
    allergens: ['Wheat (Gluten)', 'Milk / Dairy', 'Tree Nuts (Cashew)'],
    healthSummary: 'High protein restaurant meal with rich cream and butter gravy. Pair with tandoori roti instead of refined naan.'
  },
  {
    category: 'RESTAURANT_FOOD',
    name: 'Hyderabadi Dum Biryani with Cooling Raita',
    keywords: ['biryani', 'chicken biryani', 'veg biryani', 'dum biryani', 'hyderabadi biryani'],
    portion: '1 Plate (~300g)',
    calories: 520,
    protein: 22,
    carbs: 64,
    fat: 19,
    fiber: 4,
    sugar: 3.5,
    sodium: 680,
    saturatedFat: 5.5,
    truthScore: 3.5,
    novaLevel: 3,
    ratingCategory: 'MODERATE',
    healthySwaps: [
      { name: 'Brown Rice Veg Pulao with Sprouted Salad', brand: 'Healthy Bistro', calories: 340, rating: 4.7, reason: '40% less oil and lower glycemic load.' }
    ],
    ingredients: ['Aromatic Aged Basmati Rice', 'Spices (Cardamom, Saffron, Cloves)', 'Onions (Fried Barista)', 'Ghee', 'Yogurt Curd', 'Mint & Coriander'],
    allergens: ['Milk / Dairy'],
    healthSummary: 'Flavorsome layered rice dish with natural digestive spices. High in carbohydrates and moderate in fats.'
  },
  {
    category: 'RESTAURANT_FOOD',
    name: 'Artisan Wood-Fired Margherita Pizza',
    keywords: ['pizza', 'margherita pizza', 'cheese pizza', 'italian pizza'],
    portion: '2 Slices (~180g)',
    calories: 490,
    protein: 19,
    carbs: 56,
    fat: 21,
    fiber: 3,
    sugar: 6,
    sodium: 760,
    saturatedFat: 9.5,
    truthScore: 3.1,
    novaLevel: 3,
    ratingCategory: 'MODERATE',
    healthySwaps: [
      { name: 'Thin Crust Multigrain Veggie Pizza', brand: 'Healthy Bistro', calories: 320, rating: 4.3, reason: 'High fiber whole grain crust with extra veggies.' }
    ],
    ingredients: ['Wheat Dough Crust', 'San Marzano Tomato Sauce', 'Mozzarella Cheese', 'Fresh Basil', 'Extra Virgin Olive Oil'],
    allergens: ['Wheat (Gluten)', 'Milk / Dairy'],
    healthSummary: 'Classic Italian pizza with simple ingredients. Watch portion sizes due to calorie density and sodium.'
  },
  {
    category: 'RESTAURANT_FOOD',
    name: 'Veg Hakka Noodles with Fried Manchurian',
    keywords: ['noodles', 'hakka noodles', 'manchurian', 'chinese', 'chowmein'],
    portion: '1 Plate (~260g)',
    calories: 580,
    protein: 11,
    carbs: 76,
    fat: 26,
    fiber: 4.5,
    sugar: 9,
    sodium: 1150,
    saturatedFat: 6.5,
    truthScore: 2.1,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Stir-Fried Whole Wheat Soba Noodles with Tofu', brand: 'Asian Bistro', calories: 340, rating: 4.7, reason: 'Reduces sodium by 65% and doubles protein.' },
      { name: 'Steamed Vegetable Dim Sum / Momos', brand: 'Asian Bistro', calories: 210, rating: 4.5, reason: 'Zero deep frying with fresh vegetable filling.' }
    ],
    ingredients: ['Refined Wheat Noodles', 'Refined Palm Oil', 'Soy Sauce', 'Monosodium Glutamate (MSG)', 'Fried Veggie Balls', 'Cornstarch'],
    allergens: ['Wheat (Gluten)', 'Soy'],
    healthSummary: 'Very high sodium and refined carbohydrate restaurant meal. Eat occasionally; prefer steamed dumplings or soba noodles.'
  },

  // ==================== 3. OUTSIDE / PACKAGED FOOD ====================
  {
    category: 'OUTSIDE_PACKAGED',
    name: 'Britannia Good Day Butter Cookies',
    brandName: 'Britannia Industries',
    barcode: '8901063012345',
    keywords: ['good day', 'britannia good day', 'butter cookie', 'goodday', 'butter biscuits'],
    portion: '1 Pack (~100g / 6 Cookies)',
    calories: 480,
    protein: 6.0,
    carbs: 66,
    fat: 22,
    fiber: 2.2,
    sugar: 24,
    sodium: 260,
    saturatedFat: 11,
    truthScore: 2.6,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Organic Whole Grain Oats Cookies', brand: 'NutriChoice Clean', calories: 310, rating: 4.6, reason: 'Zero palm oil, 70% less sugar & high oat fiber.' },
      { name: 'Roasted Multigrain Makhana / Foxnuts', brand: 'Farm Fresh', calories: 180, rating: 4.9, reason: 'Zero added sugar, high protein & clean ingredients.' }
    ],
    ingredients: ['Refined Wheat Flour (Maida)', 'Sugar', 'Edible Vegetable Oil (Palm)', 'Butter (3%)', 'Invert Sugar Syrup', 'Raising Agents (E500ii, E503ii)', 'Emulsifier (Soy Lecithin E322)'],
    allergens: ['Wheat (Gluten)', 'Milk / Dairy', 'Soy'],
    healthSummary: 'Ultra-processed bakery cookies containing refined palm oil, high invert sugar syrup, and artificial flavorings.'
  },
  {
    category: 'OUTSIDE_PACKAGED',
    name: 'Parle-G Original Glucose Biscuits',
    brandName: 'Parle Products',
    barcode: '8901719101010',
    keywords: ['parle g', 'parle-g', 'parle biscuit', 'glucose biscuit', 'parleg'],
    portion: '1 Pack (~80g)',
    calories: 360,
    protein: 5.2,
    carbs: 61,
    fat: 10.4,
    fiber: 1.8,
    sugar: 20.8,
    sodium: 176,
    saturatedFat: 4.8,
    truthScore: 2.9,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Multi-Millet Ragi Biscuits', brand: 'Early Foods', calories: 240, rating: 4.7, reason: 'Naturally sweetened with jaggery, rich in calcium.' },
      { name: 'Whole Wheat Marie Light', brand: 'Britannia Clean', calories: 260, rating: 4.1, reason: 'Lower sugar and lower saturated fat.' }
    ],
    ingredients: ['Wheat Flour (67%)', 'Sugar', 'Edible Vegetable Oil (Palm)', 'Invert Sugar Syrup', 'Raising Agents (E503ii, E500ii)', 'Milk Solids', 'Salt'],
    allergens: ['Wheat (Gluten)', 'Milk'],
    healthSummary: 'Industrial mass-market glucose biscuit with high sugar content (over 25% of weight is sugar) and palm oil.'
  },
  {
    category: 'OUTSIDE_PACKAGED',
    name: 'Oreo Original Vanilla Cream Sandwich Cookies',
    brandName: 'Mondelez International',
    barcode: '8901233024501',
    keywords: ['oreo', 'oreo biscuit', 'vanilla cream cookie', 'chocolate sandwich'],
    portion: '1 Roll (~120g / 10 Biscuits)',
    calories: 564,
    protein: 6.0,
    carbs: 84,
    fat: 22.8,
    fiber: 3.0,
    sugar: 45.6,
    sodium: 456,
    saturatedFat: 11.4,
    truthScore: 1.7,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Dark Chocolate Almond Bark (70% Cacao)', brand: 'Clean Bites', calories: 210, rating: 4.7, reason: 'High antioxidants, zero trans fat & 80% less sugar.' },
      { name: 'Baked Whole Wheat Choco Cookies', brand: 'Open Secret', calories: 280, rating: 4.5, reason: 'Made with real nuts and unrefined jaggery.' }
    ],
    ingredients: ['Wheat Flour', 'Sugar', 'Un-hydrogenated Vegetable Oil (Palm)', 'Cocoa Powder (4.5%)', 'Fructose Syrup', 'Cornstarch', 'Salt', 'Soy Lecithin'],
    allergens: ['Wheat (Gluten)', 'Soy'],
    healthSummary: 'High-hazard ultra-processed snack. Contains 45g of sugar (almost 9 teaspoons) with heavy palm oil content.'
  },
  {
    category: 'OUTSIDE_PACKAGED',
    name: 'Maggi 2-Minute Masala Instant Noodles',
    brandName: 'Nestlé India',
    barcode: '8901058852309',
    keywords: ['maggi', 'maggi noodles', 'masala noodles', 'instant noodles', '2 minute noodles'],
    portion: '1 Single Cake (~70g)',
    calories: 310,
    protein: 6.0,
    carbs: 44.5,
    fat: 12.0,
    fiber: 2.5,
    sugar: 1.8,
    sodium: 860,
    saturatedFat: 5.6,
    truthScore: 2.1,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Millet & Whole Wheat Hakka Noodles', brand: 'WickedGud', calories: 240, rating: 4.6, reason: '100% steam baked, zero maida, zero palm oil.' },
      { name: 'Oats & Veggie Instant Bowl', brand: 'Saffola Fittify', calories: 190, rating: 4.4, reason: 'High dietary fiber with 50% less sodium.' }
    ],
    ingredients: ['Refined Wheat Flour (Maida)', 'Palm Oil', 'Iodised Salt', 'Wheat Gluten', 'Spices (Coriander, Cumin, Red Chilli)', 'Flavor Enhancers (E635)'],
    allergens: ['Wheat (Gluten)'],
    healthSummary: 'High in sodium (provides ~40% of daily limit in one small snack) and fried in refined palm oil.'
  },
  {
    category: 'OUTSIDE_PACKAGED',
    name: "Lay's India's Magic Masala Potato Chips",
    brandName: 'PepsiCo India',
    barcode: '8901491101234',
    keywords: ['lays', "lay's", 'magic masala', 'potato chips', 'blue lays', 'chips'],
    portion: '1 Pouch (~50g)',
    calories: 270,
    protein: 3.5,
    carbs: 26,
    fat: 16.5,
    fiber: 1.8,
    sugar: 1.8,
    sodium: 390,
    saturatedFat: 6.5,
    truthScore: 2.3,
    novaLevel: 4,
    ratingCategory: 'BAD',
    healthySwaps: [
      { name: 'Vacuum-Fried Sweet Potato Crisps', brand: 'To Be Honest', calories: 160, rating: 4.7, reason: '50% less oil, high Vitamin A & clean ingredients.' },
      { name: 'Roasted Spiced Chickpeas (Chana)', brand: 'Farmley', calories: 140, rating: 4.9, reason: 'High plant protein with zero saturated fats.' }
    ],
    ingredients: ['Potatoes', 'Edible Vegetable Oil (Palmolein)', 'Chilli, Onion Powder, Garlic Powder, Spices', 'Iodised Salt', 'Acidity Regulators (E330)'],
    allergens: ['May contain Milk'],
    healthSummary: 'Deep-fried potato crisps with high saturated fat and refined palmolein oil.'
  },
  {
    category: 'OUTSIDE_PACKAGED',
    name: 'Amul Pasteurised Salted Butter',
    brandName: 'Amul (GCMMF)',
    barcode: '8901262010058',
    keywords: ['amul butter', 'butter', 'salted butter', 'amul'],
    portion: '1 Serving (~10g)',
    calories: 72,
    protein: 0.1,
    carbs: 0.1,
    fat: 8.0,
    fiber: 0.0,
    sugar: 0.0,
    sodium: 84,
    saturatedFat: 5.1,
    truthScore: 3.8,
    novaLevel: 2,
    ratingCategory: 'MODERATE',
    healthySwaps: [
      { name: 'Cold-Pressed Olive Oil or Avocado Spread', brand: 'Borges', calories: 60, rating: 4.8, reason: 'Rich in monounsaturated healthy omega-9 fatty acids.' }
    ],
    ingredients: ['Butter (Milk Fat 80%)', 'Iodised Salt (2%)'],
    allergens: ['Milk / Dairy'],
    healthSummary: 'Pure dairy butter with natural ingredients and zero artificial additives. High in saturated fat; enjoy in moderation.'
  },

  // ==================== 4. FRESH FRUITS ====================
  {
    category: 'FRUITS',
    name: 'Fresh Crisp Red Apple Slices',
    keywords: ['apple', 'red apple', 'apple slices', 'fresh apple', 'apples'],
    portion: '1 Medium Apple (~120g)',
    calories: 62,
    protein: 0.4,
    carbs: 16.5,
    fat: 0.2,
    fiber: 3.0,
    sugar: 12.0,
    sodium: 1,
    saturatedFat: 0.0,
    truthScore: 5.0,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['100% Fresh Raw Apple'],
    allergens: [],
    healthSummary: 'Natural whole superfood packed with prebiotic pectin fiber, quercetin antioxidants, and Vitamin C.'
  },
  {
    category: 'FRUITS',
    name: 'Fresh Ripe Robusta Banana',
    keywords: ['banana', 'ripe banana', 'fresh banana', 'bananas', 'kela'],
    portion: '1 Medium Banana (~110g)',
    calories: 98,
    protein: 1.2,
    carbs: 25.0,
    fat: 0.3,
    fiber: 3.1,
    sugar: 14.0,
    sodium: 1,
    saturatedFat: 0.1,
    truthScore: 4.9,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['100% Fresh Raw Banana'],
    allergens: [],
    healthSummary: 'Instant natural electrolyte booster rich in Potassium, Vitamin B6, and prebiotic gut-fueling fiber.'
  },
  {
    category: 'FRUITS',
    name: 'Fresh Mixed Fruit Salad Platter',
    keywords: ['fruit salad', 'mixed fruit', 'fruit bowl', 'fruits', 'cut fruits', 'fruit platter'],
    portion: '1 Bowl (~180g)',
    calories: 110,
    protein: 1.4,
    carbs: 28.0,
    fat: 0.4,
    fiber: 4.5,
    sugar: 18.0,
    sodium: 2,
    saturatedFat: 0.0,
    truthScore: 5.0,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Fresh Apple', 'Ripe Banana', 'Sweet Papaya', 'Pomegranate Arils', 'Mint Leaves'],
    allergens: [],
    healthSummary: 'Unmatched spectrum of natural bioflavonoids, Vitamin C, and hydration with zero added sugars.'
  },

  // ==================== 5. FRESH VEGETABLES ====================
  {
    category: 'VEGETABLES',
    name: 'Garden Fresh Green Salad with Lemon & Salt',
    keywords: ['salad', 'green salad', 'vegetable salad', 'cucumber tomato salad', 'kachumber'],
    portion: '1 Large Plate (~160g)',
    calories: 45,
    protein: 1.8,
    carbs: 9.0,
    fat: 0.3,
    fiber: 3.5,
    sugar: 4.0,
    sodium: 65,
    saturatedFat: 0.0,
    truthScore: 5.0,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Crisp Cucumber', 'Fresh Tomatoes', 'Baby Carrots', 'Red Onions', 'Lemon Juice', 'Pinch of Black Salt'],
    allergens: [],
    healthSummary: 'Ultra-low calorie, nutrient-dense natural hydration. Loaded with Vitamin A, Vitamin K, and digestive enzymes.'
  },
  {
    category: 'VEGETABLES',
    name: 'Crisp English Cucumber & Fresh Tomato Slices',
    keywords: ['cucumber', 'tomato', 'cucumber slices', 'fresh tomato', 'kheera'],
    portion: '1 Plate (~140g)',
    calories: 30,
    protein: 1.2,
    carbs: 6.5,
    fat: 0.2,
    fiber: 2.2,
    sugar: 3.5,
    sodium: 8,
    saturatedFat: 0.0,
    truthScore: 5.0,
    novaLevel: 1,
    ratingCategory: 'GOOD',
    healthySwaps: [],
    ingredients: ['Fresh Cucumbers', 'Vine Tomatoes'],
    allergens: [],
    healthSummary: '95% water content with lycopene antioxidants from tomatoes and silica for skin hydration from cucumbers.'
  }
];

/**
 * Fuzzy Search & Matcher against Master Food Catalog
 */
export const findFoodInCatalog = (query: string, category?: string): FoodCatalogItem | null => {
  const clean = query.toLowerCase().trim();
  if (!clean) return null;

  // 1. Exact or Keyword Match
  const directMatch = FOOD_MASTER_CATALOG.find(item => {
    if (category && item.category !== category) return false;
    if (item.name.toLowerCase() === clean) return true;
    return item.keywords.some(kw => clean.includes(kw) || kw.includes(clean));
  });

  if (directMatch) return directMatch;

  // 2. Fallback search across all categories if not matched within category
  return FOOD_MASTER_CATALOG.find(item =>
    item.keywords.some(kw => clean.includes(kw) || kw.includes(clean))
  ) || null;
};
