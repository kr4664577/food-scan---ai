export const USER_GOALS = ['General healthy eating', 'Weight management', 'Muscle gain', 'Fitness', 'General wellness'] as const;
export function mealIdeas(goal?: string) {
  const fitness = goal === 'Muscle gain' || goal === 'Fitness';
  return [
    { type: 'Breakfast', name: fitness ? 'Yogurt or fortified soy yogurt with oats' : 'Oats with fruit and yogurt', reason: 'Combine a grain, fruit, and a protein-containing ingredient.' },
    { type: 'Lunch', name: 'Lentil bowl with vegetables and rice', reason: 'Legumes provide a protein-containing base; choose a portion that fits your appetite.' },
    { type: 'Dinner', name: fitness ? 'Tofu or chicken with vegetables and a grain' : 'Beans, vegetables, and a whole grain', reason: 'Build a varied meal with a protein-containing ingredient and vegetables.' },
    { type: 'Snack', name: fitness ? 'Plain yogurt or roasted chickpeas' : 'Fruit with nuts or seeds', reason: fitness ? 'A protein-focused snack idea.' : 'An alternative snack combination; check ingredients for your preferences.' },
    { type: 'Pre-workout', name: 'Banana or toast', reason: 'A simple carbohydrate-containing option; choose what you tolerate comfortably.' },
    { type: 'Post-workout', name: 'Yogurt and fruit, or a tofu sandwich', reason: 'Combines carbohydrate- and protein-containing foods.' },
  ];
}
