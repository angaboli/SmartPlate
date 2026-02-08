import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;

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
  {
    title: 'Banana Oat Pancakes',
    titleFr: 'Pancakes banane et avoine',
    description:
      'Fluffy, naturally sweetened pancakes made with ripe bananas and oats — a wholesome breakfast ready in minutes.',
    descriptionFr:
      'Pancakes moelleux naturellement sucrés à la banane et aux flocons d\'avoine — un petit-déjeuner sain prêt en quelques minutes.',
    imageUrl:
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
    prepTimeMin: 15,
    servings: 2,
    category: 'Regular',
    goal: 'energy-boost',
    calories: 340,
    ingredients: [
      '2 ripe bananas',
      '1 cup rolled oats',
      '2 eggs',
      '1/2 tsp cinnamon',
      '1 tsp baking powder',
      '1 tbsp maple syrup',
      'Butter for cooking',
      'Fresh berries for topping',
    ],
    ingredientsFr: [
      '2 bananes mûres',
      '1 tasse de flocons d\'avoine',
      '2 œufs',
      '1/2 c. à thé de cannelle',
      '1 c. à thé de levure chimique',
      '1 c. à soupe de sirop d\'érable',
      'Beurre pour la cuisson',
      'Fruits rouges frais pour garnir',
    ],
    steps: [
      'Blend oats into a fine flour using a blender.',
      'Mash bananas and mix with eggs, cinnamon, and baking powder.',
      'Fold oat flour into the batter until combined.',
      'Heat a buttered pan over medium heat.',
      'Pour 1/4 cup batter per pancake, cook 2-3 minutes per side.',
      'Serve with maple syrup and fresh berries.',
    ],
    stepsFr: [
      'Mixer les flocons d\'avoine pour obtenir une farine fine.',
      'Écraser les bananes et mélanger avec les œufs, la cannelle et la levure.',
      'Incorporer la farine d\'avoine à la pâte.',
      'Chauffer une poêle beurrée à feu moyen.',
      'Verser 60 ml de pâte par pancake, cuire 2-3 minutes par côté.',
      'Servir avec du sirop d\'érable et des fruits rouges frais.',
    ],
  },
  {
    title: 'Turkey & Veggie Wrap',
    titleFr: 'Wrap dinde et légumes',
    description:
      'A light and satisfying whole-wheat wrap filled with lean turkey, crunchy vegetables, and a creamy hummus spread.',
    descriptionFr:
      'Un wrap de blé entier léger et rassasiant garni de dinde maigre, de légumes croquants et de houmous crémeux.',
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=400&fit=crop',
    prepTimeMin: 10,
    servings: 2,
    category: 'Regular',
    goal: 'light',
    calories: 360,
    ingredients: [
      '2 whole-wheat tortillas',
      '150g sliced turkey breast',
      '1/2 cucumber, julienned',
      '1 carrot, shredded',
      '1 cup mixed greens',
      '3 tbsp hummus',
      '1/2 avocado, sliced',
      'Salt and pepper to taste',
    ],
    ingredientsFr: [
      '2 tortillas de blé entier',
      '150 g de poitrine de dinde tranchée',
      '1/2 concombre, en julienne',
      '1 carotte, râpée',
      '1 tasse de mesclun',
      '3 c. à soupe de houmous',
      '1/2 avocat, tranché',
      'Sel et poivre au goût',
    ],
    steps: [
      'Spread hummus evenly over each tortilla.',
      'Layer turkey slices, cucumber, carrot, and mixed greens.',
      'Add avocado slices and season with salt and pepper.',
      'Roll tightly, tucking in the sides as you go.',
      'Slice in half diagonally and serve.',
    ],
    stepsFr: [
      'Étaler le houmous uniformément sur chaque tortilla.',
      'Disposer les tranches de dinde, le concombre, la carotte et le mesclun.',
      'Ajouter les tranches d\'avocat et assaisonner.',
      'Rouler fermement en repliant les côtés.',
      'Couper en deux en diagonale et servir.',
    ],
  },
  {
    title: 'Beef & Broccoli Stir-Fry',
    titleFr: 'Sauté de bœuf et brocoli',
    description:
      'Tender strips of beef and crisp broccoli florets wok-tossed in a savory garlic-ginger soy glaze, served over steamed rice.',
    descriptionFr:
      'Lanières de bœuf tendres et bouquets de brocoli croquants sautés au wok dans une sauce soja à l\'ail et au gingembre, servis sur du riz vapeur.',
    imageUrl:
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=400&fit=crop',
    prepTimeMin: 25,
    servings: 3,
    category: 'Regular',
    goal: 'high-protein',
    aiRecommended: true,
    calories: 510,
    ingredients: [
      '400g beef sirloin, thinly sliced',
      '3 cups broccoli florets',
      '3 tbsp soy sauce',
      '1 tbsp oyster sauce',
      '1 tbsp sesame oil',
      '2 garlic cloves, minced',
      '1 tbsp fresh ginger, grated',
      '1 tbsp cornstarch',
      '2 cups steamed jasmine rice',
    ],
    ingredientsFr: [
      '400 g de surlonge de bœuf, tranché finement',
      '3 tasses de bouquets de brocoli',
      '3 c. à soupe de sauce soja',
      '1 c. à soupe de sauce aux huîtres',
      '1 c. à soupe d\'huile de sésame',
      '2 gousses d\'ail, émincées',
      '1 c. à soupe de gingembre frais, râpé',
      '1 c. à soupe de fécule de maïs',
      '2 tasses de riz jasmin cuit à la vapeur',
    ],
    steps: [
      'Toss beef slices with cornstarch, 1 tbsp soy sauce, and set aside for 10 minutes.',
      'Heat sesame oil in a wok over high heat.',
      'Sear beef in batches until browned, then set aside.',
      'Stir-fry broccoli with garlic and ginger for 3 minutes.',
      'Return beef to the wok, add remaining soy sauce and oyster sauce.',
      'Toss everything together until sauce thickens.',
      'Serve immediately over steamed jasmine rice.',
    ],
    stepsFr: [
      'Mélanger le bœuf avec la fécule, 1 c. à soupe de sauce soja et laisser reposer 10 minutes.',
      'Chauffer l\'huile de sésame dans un wok à feu vif.',
      'Saisir le bœuf par portions jusqu\'à coloration, puis réserver.',
      'Faire sauter le brocoli avec l\'ail et le gingembre pendant 3 minutes.',
      'Remettre le bœuf dans le wok, ajouter le reste de sauce soja et la sauce aux huîtres.',
      'Mélanger jusqu\'à épaississement de la sauce.',
      'Servir immédiatement sur du riz jasmin vapeur.',
    ],
  },
  {
    title: 'Creamy Tomato Basil Soup',
    titleFr: 'Velouté de tomates au basilic',
    description:
      'A velvety, comforting tomato soup with fresh basil and a swirl of cream — perfect as a light lunch with crusty bread.',
    descriptionFr:
      'Un velouté réconfortant de tomates au basilic frais avec une touche de crème — parfait en repas léger avec du pain croûté.',
    imageUrl:
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop',
    prepTimeMin: 30,
    servings: 4,
    category: 'Regular',
    goal: 'light',
    calories: 220,
    ingredients: [
      '2 cans (800g) whole peeled tomatoes',
      '1 onion, diced',
      '3 garlic cloves, minced',
      '1/2 cup fresh basil leaves',
      '1/2 cup heavy cream',
      '2 tbsp olive oil',
      '1 tsp sugar',
      'Salt and pepper to taste',
      'Crusty bread for serving',
    ],
    ingredientsFr: [
      '2 boîtes (800 g) de tomates pelées entières',
      '1 oignon, coupé en dés',
      '3 gousses d\'ail, émincées',
      '1/2 tasse de feuilles de basilic frais',
      '1/2 tasse de crème épaisse',
      '2 c. à soupe d\'huile d\'olive',
      '1 c. à thé de sucre',
      'Sel et poivre au goût',
      'Pain croûté pour servir',
    ],
    steps: [
      'Heat olive oil in a large pot over medium heat.',
      'Sauté onion and garlic until softened, about 5 minutes.',
      'Add canned tomatoes, sugar, salt, and pepper.',
      'Simmer for 20 minutes, stirring occasionally.',
      'Remove from heat, add basil, and blend until smooth.',
      'Stir in cream, adjust seasoning, and serve with crusty bread.',
    ],
    stepsFr: [
      'Chauffer l\'huile d\'olive dans une grande casserole à feu moyen.',
      'Faire revenir l\'oignon et l\'ail jusqu\'à ce qu\'ils soient tendres, environ 5 minutes.',
      'Ajouter les tomates en conserve, le sucre, le sel et le poivre.',
      'Laisser mijoter 20 minutes en remuant de temps en temps.',
      'Retirer du feu, ajouter le basilic et mixer jusqu\'à consistance lisse.',
      'Incorporer la crème, rectifier l\'assaisonnement et servir avec du pain croûté.',
    ],
  },
  {
    title: 'Shrimp Pasta Primavera',
    titleFr: 'Pâtes aux crevettes primavera',
    description:
      'Al dente penne tossed with sautéed shrimp, seasonal vegetables, and a light garlic-white-wine sauce — a quick, elegant dinner.',
    descriptionFr:
      'Penne al dente mélangées à des crevettes sautées, des légumes de saison et une sauce légère à l\'ail et au vin blanc — un dîner rapide et élégant.',
    imageUrl:
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=400&fit=crop',
    prepTimeMin: 25,
    servings: 3,
    category: 'SafariTaste',
    goal: 'balanced',
    aiRecommended: true,
    calories: 490,
    ingredients: [
      '300g penne pasta',
      '250g large shrimp, peeled and deveined',
      '1 zucchini, sliced',
      '1 red bell pepper, diced',
      '1 cup cherry tomatoes, halved',
      '3 garlic cloves, minced',
      '1/4 cup dry white wine',
      '2 tbsp olive oil',
      'Fresh parsley and parmesan for serving',
    ],
    ingredientsFr: [
      '300 g de penne',
      '250 g de grosses crevettes, décortiquées et déveinées',
      '1 courgette, tranchée',
      '1 poivron rouge, coupé en dés',
      '1 tasse de tomates cerises, coupées en deux',
      '3 gousses d\'ail, émincées',
      '1/4 tasse de vin blanc sec',
      '2 c. à soupe d\'huile d\'olive',
      'Persil frais et parmesan pour servir',
    ],
    steps: [
      'Cook penne in salted boiling water until al dente, then drain.',
      'Heat olive oil in a large skillet over medium-high heat.',
      'Sear shrimp for 2 minutes per side, then set aside.',
      'In the same skillet, sauté garlic, zucchini, and bell pepper for 3 minutes.',
      'Add cherry tomatoes and white wine, cook for 2 more minutes.',
      'Return shrimp and add pasta, toss everything together.',
      'Serve with fresh parsley and grated parmesan.',
    ],
    stepsFr: [
      'Cuire les penne dans de l\'eau bouillante salée jusqu\'à al dente, puis égoutter.',
      'Chauffer l\'huile d\'olive dans une grande poêle à feu moyen-vif.',
      'Saisir les crevettes 2 minutes par côté, puis réserver.',
      'Dans la même poêle, faire sauter l\'ail, la courgette et le poivron 3 minutes.',
      'Ajouter les tomates cerises et le vin blanc, cuire 2 minutes de plus.',
      'Remettre les crevettes et ajouter les pâtes, bien mélanger.',
      'Servir avec du persil frais et du parmesan râpé.',
    ],
  },
  {
    title: 'Overnight Chia Pudding',
    titleFr: 'Pudding de chia overnight',
    description:
      'A creamy, no-cook chia pudding prepared the night before with coconut milk and topped with tropical fruits — grab-and-go breakfast.',
    descriptionFr:
      'Un pudding de chia crémeux sans cuisson préparé la veille avec du lait de coco et garni de fruits tropicaux — un petit-déjeuner à emporter.',
    imageUrl:
      'https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=600&h=400&fit=crop',
    prepTimeMin: 5,
    servings: 2,
    category: 'SafariTaste',
    goal: 'energy-boost',
    aiRecommended: true,
    calories: 290,
    ingredients: [
      '1/3 cup chia seeds',
      '1 cup coconut milk',
      '1 tbsp honey or agave',
      '1/2 tsp vanilla extract',
      '1/2 mango, diced',
      '1/4 cup passion fruit pulp',
      'Toasted coconut flakes',
      'Fresh mint leaves',
    ],
    ingredientsFr: [
      '1/3 tasse de graines de chia',
      '1 tasse de lait de coco',
      '1 c. à soupe de miel ou agave',
      '1/2 c. à thé d\'extrait de vanille',
      '1/2 mangue, coupée en dés',
      '1/4 tasse de pulpe de fruit de la passion',
      'Flocons de noix de coco grillés',
      'Feuilles de menthe fraîche',
    ],
    steps: [
      'Mix chia seeds, coconut milk, honey, and vanilla in a jar.',
      'Stir well, cover, and refrigerate for at least 4 hours or overnight.',
      'Stir again before serving to break up any clumps.',
      'Top with mango, passion fruit, coconut flakes, and mint.',
      'Serve chilled.',
    ],
    stepsFr: [
      'Mélanger les graines de chia, le lait de coco, le miel et la vanille dans un pot.',
      'Bien remuer, couvrir et réfrigérer au moins 4 heures ou toute la nuit.',
      'Remuer à nouveau avant de servir pour défaire les grumeaux.',
      'Garnir de mangue, fruit de la passion, flocons de coco et menthe.',
      'Servir bien frais.',
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // ─── Users (admin + editor) ──────────────────────

  const adminHash = await hash('Admin123!', BCRYPT_ROUNDS);
  const editorHash = await hash('Editor123!', BCRYPT_ROUNDS);

  const admin = await db.user.upsert({
    where: { email: 'admin@smartplate.app' },
    update: { role: 'admin', passwordHash: adminHash },
    create: {
      email: 'admin@smartplate.app',
      name: 'Admin',
      passwordHash: adminHash,
      role: 'admin',
      settings: { create: {} },
    },
  });
  console.log(`  Admin user: ${admin.email} (${admin.id})`);

  const editor = await db.user.upsert({
    where: { email: 'editor@smartplate.app' },
    update: { role: 'editor', passwordHash: editorHash },
    create: {
      email: 'editor@smartplate.app',
      name: 'Editor',
      passwordHash: editorHash,
      role: 'editor',
      settings: { create: {} },
    },
  });
  console.log(`  Editor user: ${editor.email} (${editor.id})`);

  // ─── Published recipes (existing seed data) ──────

  await db.recipeStep.deleteMany();
  await db.recipeIngredient.deleteMany();
  await db.savedRecipe.deleteMany();
  await db.recipe.deleteMany();

  const now = new Date();

  for (const recipe of recipes) {
    const { ingredients, steps, ingredientsFr, stepsFr, ...recipeData } = recipe;

    await db.recipe.create({
      data: {
        ...recipeData,
        status: 'published',
        publishedAt: now,
        ingredients: {
          create: ingredients.map((text, i) => ({
            text,
            textFr: ingredientsFr?.[i] ?? null,
            sortOrder: i,
          })),
        },
        steps: {
          create: steps.map((text, i) => ({
            text,
            textFr: stepsFr?.[i] ?? null,
            sortOrder: i,
          })),
        },
      },
    });
  }

  console.log(`  Seeded ${recipes.length} published recipes.`);

  // ─── Draft recipes (for testing workflow) ─────────

  await db.recipe.create({
    data: {
      title: 'Spicy Mango Salsa Tacos',
      description:
        'Fresh fish tacos topped with a vibrant mango salsa — a draft recipe awaiting review.',
      prepTimeMin: 20,
      servings: 3,
      category: 'SafariTaste',
      goal: 'light',
      calories: 340,
      status: 'draft',
      authorId: editor.id,
      ingredients: {
        create: [
          { text: '6 small tortillas', sortOrder: 0 },
          { text: '300g white fish', sortOrder: 1 },
          { text: '1 ripe mango, diced', sortOrder: 2 },
          { text: '1 jalapeño, minced', sortOrder: 3 },
          { text: 'Lime juice', sortOrder: 4 },
          { text: 'Cilantro', sortOrder: 5 },
        ],
      },
      steps: {
        create: [
          { text: 'Season and grill fish fillets.', sortOrder: 0 },
          { text: 'Dice mango, jalapeño, and cilantro for the salsa.', sortOrder: 1 },
          { text: 'Mix salsa ingredients with lime juice.', sortOrder: 2 },
          { text: 'Warm tortillas and assemble tacos.', sortOrder: 3 },
        ],
      },
    },
  });

  await db.recipe.create({
    data: {
      title: 'Matcha Overnight Oats',
      description:
        'Creamy overnight oats with matcha green tea — pending review by an editor.',
      prepTimeMin: 5,
      servings: 1,
      category: 'Regular',
      goal: 'energy-boost',
      calories: 310,
      status: 'pending_review',
      authorId: editor.id,
      ingredients: {
        create: [
          { text: '1/2 cup rolled oats', sortOrder: 0 },
          { text: '1 tsp matcha powder', sortOrder: 1 },
          { text: '3/4 cup oat milk', sortOrder: 2 },
          { text: '1 tbsp maple syrup', sortOrder: 3 },
          { text: 'Chia seeds', sortOrder: 4 },
        ],
      },
      steps: {
        create: [
          { text: 'Mix oats, matcha, milk, syrup, and chia in a jar.', sortOrder: 0 },
          { text: 'Refrigerate overnight (at least 6 hours).', sortOrder: 1 },
          { text: 'Top with fresh fruit and serve cold.', sortOrder: 2 },
        ],
      },
    },
  });

  console.log('  Seeded 2 draft/pending recipes for testing.');
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
