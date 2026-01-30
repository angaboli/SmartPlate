import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

const recipes = [
  {
    title: 'Grilled Chicken Quinoa Bowl',
    description:
      'A balanced bowl featuring perfectly grilled chicken breast over fluffy quinoa with roasted vegetables and a tangy lemon-herb dressing.',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
    prepTimeMin: 25,
    servings: 2,
    category: 'SafariTaste',
    goal: 'balanced',
    aiRecommended: true,
    calories: 520,
    ingredients: [
      '2 chicken breasts',
      '1 cup quinoa',
      '1 cup mixed roasted vegetables',
      '2 tbsp olive oil',
      '1 lemon, juiced',
      'Fresh herbs (parsley, cilantro)',
      'Salt and pepper to taste',
    ],
    steps: [
      'Cook quinoa according to package instructions.',
      'Season chicken breasts with olive oil, salt, pepper, and herbs.',
      'Grill chicken for 6-7 minutes per side until cooked through.',
      'Roast vegetables at 200°C for 20 minutes.',
      'Slice chicken and arrange over quinoa with vegetables.',
      'Drizzle with lemon juice and serve.',
    ],
  },
  {
    title: 'Mediterranean Chickpea Salad',
    description:
      'A refreshing and colorful salad packed with protein-rich chickpeas, fresh vegetables, feta cheese, and a zesty Mediterranean dressing.',
    imageUrl:
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=400&fit=crop',
    prepTimeMin: 15,
    servings: 4,
    category: 'SafariTaste',
    goal: 'light',
    aiRecommended: true,
    calories: 350,
    ingredients: [
      '2 cans chickpeas, drained',
      '1 cucumber, diced',
      '1 cup cherry tomatoes, halved',
      '1/2 red onion, sliced',
      '100g feta cheese, crumbled',
      'Kalamata olives',
      '3 tbsp olive oil',
      '2 tbsp red wine vinegar',
      'Dried oregano',
    ],
    steps: [
      'Drain and rinse chickpeas.',
      'Dice cucumber, halve tomatoes, and slice onion.',
      'Combine all vegetables in a large bowl.',
      'Whisk together olive oil, vinegar, and oregano for dressing.',
      'Toss salad with dressing, top with feta and olives.',
    ],
  },
  {
    title: 'Salmon with Roasted Vegetables',
    description:
      'Omega-3 rich salmon fillet served alongside colorful roasted seasonal vegetables with a honey-mustard glaze.',
    imageUrl:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
    prepTimeMin: 35,
    servings: 2,
    category: 'Regular',
    goal: 'high-protein',
    calories: 480,
    ingredients: [
      '2 salmon fillets',
      '2 cups mixed vegetables (bell peppers, zucchini, carrots)',
      '2 tbsp honey',
      '1 tbsp Dijon mustard',
      '2 tbsp olive oil',
      'Garlic cloves',
      'Fresh dill',
    ],
    steps: [
      'Preheat oven to 200°C.',
      'Chop vegetables and toss with olive oil and garlic.',
      'Spread on baking sheet and roast for 15 minutes.',
      'Mix honey and mustard for the glaze.',
      'Place salmon on the sheet, brush with glaze.',
      'Roast for another 12-15 minutes until salmon is cooked.',
      'Garnish with fresh dill and serve.',
    ],
  },
  {
    title: 'Power Smoothie Bowl',
    description:
      'A vibrant and energizing smoothie bowl loaded with superfoods, fresh fruits, and crunchy toppings for the perfect breakfast.',
    imageUrl:
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
    prepTimeMin: 10,
    servings: 1,
    category: 'SafariTaste',
    goal: 'energy-boost',
    aiRecommended: true,
    calories: 320,
    ingredients: [
      '1 frozen banana',
      '1/2 cup frozen berries',
      '1 tbsp acai powder',
      '1/2 cup almond milk',
      '1 tbsp chia seeds',
      'Granola',
      'Fresh fruits for topping',
      'Honey drizzle',
    ],
    steps: [
      'Blend frozen banana, berries, acai powder, and almond milk until smooth.',
      'Pour into a bowl.',
      'Top with granola, chia seeds, fresh fruits, and a drizzle of honey.',
      'Serve immediately.',
    ],
  },
  {
    title: 'Stir-Fried Tofu with Brown Rice',
    description:
      'Crispy pan-fried tofu cubes in a savory Asian-inspired sauce served over nutty brown rice with steamed vegetables.',
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    prepTimeMin: 30,
    servings: 3,
    category: 'SafariTaste',
    goal: 'balanced',
    calories: 450,
    ingredients: [
      '400g firm tofu, cubed',
      '2 cups brown rice, cooked',
      '2 cups mixed stir-fry vegetables',
      '3 tbsp soy sauce',
      '1 tbsp sesame oil',
      '1 tbsp cornstarch',
      'Ginger and garlic',
      'Sesame seeds',
    ],
    steps: [
      'Press tofu and cut into cubes, coat with cornstarch.',
      'Cook brown rice according to package instructions.',
      'Heat sesame oil in a wok, fry tofu until golden and crispy.',
      'Remove tofu, stir-fry vegetables with ginger and garlic.',
      'Add soy sauce, return tofu to wok, and toss.',
      'Serve over brown rice, garnish with sesame seeds.',
    ],
  },
  {
    title: 'Greek Yogurt Parfait',
    description:
      'Layers of creamy Greek yogurt, crunchy granola, and fresh berries with a drizzle of honey — a high-protein breakfast or snack.',
    imageUrl:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop',
    prepTimeMin: 5,
    servings: 1,
    category: 'Regular',
    goal: 'high-protein',
    aiRecommended: true,
    calories: 280,
    ingredients: [
      '200g Greek yogurt',
      '1/3 cup granola',
      '1/2 cup mixed berries',
      '1 tbsp honey',
      '1 tbsp chia seeds',
      'Sliced almonds',
    ],
    steps: [
      'Layer Greek yogurt in a glass or bowl.',
      'Add a layer of granola.',
      'Top with mixed berries.',
      'Repeat layers.',
      'Drizzle with honey and sprinkle chia seeds and almonds.',
    ],
  },
  {
    title: 'Lentil Curry with Naan',
    description:
      'A hearty and aromatic red lentil curry simmered with spices, coconut milk, and tomatoes, served with warm naan bread.',
    imageUrl:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
    prepTimeMin: 45,
    servings: 4,
    category: 'SafariTaste',
    goal: 'balanced',
    calories: 520,
    ingredients: [
      '2 cups red lentils',
      '1 can coconut milk',
      '1 can diced tomatoes',
      '1 onion, diced',
      '3 garlic cloves',
      '1 tbsp curry powder',
      '1 tsp turmeric',
      '1 tsp cumin',
      'Fresh cilantro',
      'Naan bread',
    ],
    steps: [
      'Rinse lentils and set aside.',
      'Sauté onion and garlic until softened.',
      'Add curry powder, turmeric, and cumin, cook for 1 minute.',
      'Add lentils, tomatoes, and coconut milk.',
      'Simmer for 25-30 minutes until lentils are tender.',
      'Season with salt and pepper.',
      'Serve with warm naan and garnish with cilantro.',
    ],
  },
  {
    title: 'Avocado Toast with Eggs',
    description:
      'Crispy sourdough toast topped with creamy mashed avocado, poached eggs, and a sprinkle of everything bagel seasoning.',
    imageUrl:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop',
    prepTimeMin: 12,
    servings: 2,
    category: 'Regular',
    goal: 'energy-boost',
    calories: 380,
    ingredients: [
      '2 slices sourdough bread',
      '1 ripe avocado',
      '2 eggs',
      'Cherry tomatoes',
      'Red pepper flakes',
      'Everything bagel seasoning',
      'Lemon juice',
      'Salt and pepper',
    ],
    steps: [
      'Toast sourdough bread until golden.',
      'Mash avocado with lemon juice, salt, and pepper.',
      'Poach or fry eggs to your liking.',
      'Spread avocado on toast.',
      'Top with eggs and halved cherry tomatoes.',
      'Sprinkle with red pepper flakes and everything bagel seasoning.',
    ],
  },
];

async function main() {
  console.log('Seeding recipes...');

  // Clear existing recipes
  await db.recipeStep.deleteMany();
  await db.recipeIngredient.deleteMany();
  await db.recipe.deleteMany();

  for (const recipe of recipes) {
    const { ingredients, steps, ...recipeData } = recipe;

    await db.recipe.create({
      data: {
        ...recipeData,
        ingredients: {
          create: ingredients.map((text, i) => ({
            text,
            sortOrder: i,
          })),
        },
        steps: {
          create: steps.map((text, i) => ({
            text,
            sortOrder: i,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${recipes.length} recipes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
