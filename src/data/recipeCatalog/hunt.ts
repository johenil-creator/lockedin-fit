import type { Recipe } from "../mealTypes";

export const huntRecipes: Recipe[] = [
  // ---------------------------------------------------------------------------
  // BREAKFAST (7)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_breakfast_1",
    name: "Croque Madame",
    subtitle: "Gruyere bechamel, ham, fried egg, brioche",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 430, protein: 34, carbs: 28, fat: 22 },
    cuisineBadge: "French",
    tip: "Let the bechamel reduce until it coats the back of a spoon before spreading.",
    ingredients: [
      "2 slices brioche bread",
      "60g sliced ham",
      "40g gruyere cheese, grated",
      "1 large egg",
      "15g unsalted butter",
      "1 tbsp plain flour",
      "120ml whole milk",
      "Pinch of nutmeg",
      "Salt and white pepper",
      "1 tsp Dijon mustard",
    ],
    steps: [
      {
        title: "Make bechamel",
        time: "5 min",
        detail:
          "Melt butter in a small saucepan over medium heat. Whisk in flour and cook for 1 minute. Gradually add milk, whisking constantly until smooth and thickened. Season with nutmeg, salt, and white pepper.",
        look: "Smooth, glossy sauce that coats the back of a spoon.",
      },
      {
        title: "Assemble sandwich",
        time: "3 min",
        detail:
          "Spread Dijon on one slice of brioche and bechamel on the other. Layer ham and half the gruyere between the slices. Spread remaining bechamel on top and scatter over remaining gruyere.",
        look: "Generous coating of bechamel on the crown.",
      },
      {
        title: "Grill the croque",
        time: "6 min",
        detail:
          "Place under a hot grill (or in a hot oven at 200C) until the cheese is bubbling and golden brown. Watch carefully to prevent burning.",
        look: "Deep golden, bubbling cheese crust.",
      },
      {
        title: "Fry the egg",
        time: "3 min",
        detail:
          "While the sandwich grills, fry an egg in a little butter over medium heat. Baste the white with hot butter to set it while keeping the yolk runny.",
        look: "Crispy edges, set white, liquid yolk.",
      },
      {
        title: "Plate and serve",
        time: "1 min",
        detail:
          "Place the croque on a warm plate. Crown with the fried egg. Serve immediately while the bechamel is still flowing.",
        look: "Egg perched on golden, cheesy sandwich.",
      },
    ],
  },
  {
    id: "hunt_breakfast_2",
    name: "Tamagoyaki",
    subtitle: "Layered rolled omelette, dashi, mirin, miso soup",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 360, protein: 28, carbs: 18, fat: 18 },
    cuisineBadge: "Japanese",
    tip: "Keep the pan at medium-low heat; too hot and the layers brown before they bond.",
    ingredients: [
      "4 large eggs",
      "2 tbsp dashi stock",
      "1 tbsp mirin",
      "1 tsp light soy sauce",
      "1/2 tsp sugar",
      "Neutral oil for pan",
      "1 sachet instant miso paste",
      "50g silken tofu, cubed",
      "1 spring onion, sliced",
      "Grated daikon for serving",
    ],
    steps: [
      {
        title: "Mix egg mixture",
        time: "3 min",
        detail:
          "Whisk eggs gently (avoid creating bubbles). Stir in dashi, mirin, soy sauce, and sugar until just combined. Strain through a fine sieve for a silky texture.",
        look: "Smooth, pale yellow liquid with no foam.",
      },
      {
        title: "Build layers",
        time: "10 min",
        detail:
          "Heat a rectangular tamagoyaki pan (or small non-stick pan) over medium-low heat. Oil lightly with a folded paper towel. Pour a thin layer of egg mixture, tilting to coat. When just set, roll from one end to the other using chopsticks. Push roll to one end, oil the pan again, pour another thin layer, lifting the roll to let egg flow underneath. Roll again. Repeat 4-5 times.",
        look: "Neat, layered roll with no browning between layers.",
      },
      {
        title: "Shape and rest",
        time: "3 min",
        detail:
          "Transfer the roll to a bamboo sushi mat or cling film. Shape into a firm rectangle and let it rest for 2 minutes to set its form.",
        look: "Clean rectangular log with visible layers when sliced.",
      },
      {
        title: "Prepare miso soup",
        time: "3 min",
        detail:
          "Bring 250ml water to a gentle simmer (not boiling). Remove from heat, dissolve miso paste, add tofu cubes and spring onion.",
        look: "Cloudy broth with floating tofu and bright green onion.",
      },
      {
        title: "Slice and plate",
        time: "2 min",
        detail:
          "Slice the tamagoyaki into 3cm pieces with a sharp, wet knife. Arrange on a plate with grated daikon on the side. Serve miso soup alongside.",
        look: "Clean cross-sections showing distinct spiral layers.",
      },
    ],
  },
  {
    id: "hunt_breakfast_3",
    name: "Spanish Tortilla",
    subtitle: "Potato and egg omelette, alioli",
    flag: "\ud83c\uddea\ud83c\uddf8",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 410, protein: 28, carbs: 32, fat: 18 },
    cuisineBadge: "Spanish",
    tip: "Slice potatoes paper-thin so they meld together rather than remaining chunky.",
    ingredients: [
      "4 large eggs",
      "250g waxy potatoes, peeled and thinly sliced",
      "1 small onion, thinly sliced",
      "3 tbsp extra virgin olive oil",
      "Salt and pepper",
      "2 tbsp alioli (garlic mayonnaise)",
      "Fresh flat-leaf parsley",
    ],
    steps: [
      {
        title: "Confit the potatoes",
        time: "15 min",
        detail:
          "Heat olive oil in a 20cm non-stick frying pan over medium-low heat. Add potato slices and onion, season with salt. Cook gently, turning occasionally, until potatoes are completely tender but not browned.",
        look: "Soft, translucent potatoes that break easily with a fork.",
      },
      {
        title: "Combine with eggs",
        time: "3 min",
        detail:
          "Beat eggs in a large bowl with a pinch of salt. Drain the potato and onion (reserve oil), and fold gently into the eggs. Let sit for 5 minutes so the potatoes absorb the egg.",
        look: "Potatoes coated and suspended in egg mixture.",
      },
      {
        title: "Cook the tortilla",
        time: "8 min",
        detail:
          "Return a tablespoon of reserved oil to the pan over medium heat. Pour in the mixture, spreading evenly. Cook for 4-5 minutes until the base is set and golden. Shake the pan to confirm it moves freely.",
        look: "Golden base, slightly jiggly centre.",
      },
      {
        title: "Flip and finish",
        time: "4 min",
        detail:
          "Place a flat plate over the pan, invert in one confident motion, then slide the tortilla back in. Cook for 2-3 minutes more until just set but still slightly custardy inside.",
        look: "Golden on both sides, gently domed, slightly soft when pressed.",
      },
      {
        title: "Serve",
        time: "2 min",
        detail:
          "Slide onto a board, let rest for 2 minutes. Cut into wedges. Serve warm or at room temperature with alioli on the side and a scattering of parsley.",
        look: "Wedges showing a creamy, barely-set interior.",
      },
    ],
  },
  {
    id: "hunt_breakfast_4",
    name: "Pho Ga",
    subtitle: "Spiced broth, rice noodles, poached chicken",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 440, protein: 48, carbs: 40, fat: 8 },
    cuisineBadge: "Vietnamese",
    tip: "Toast the spices dry in the pan until fragrant for the deepest broth flavour.",
    ingredients: [
      "200g chicken breast",
      "100g flat rice noodles",
      "500ml chicken stock",
      "1 star anise",
      "1 cinnamon stick",
      "3 whole cloves",
      "2cm piece ginger, halved",
      "1 small onion, halved",
      "1 tbsp fish sauce",
      "Fresh herbs: Thai basil, coriander, mint",
      "Bean sprouts",
      "1 lime, quartered",
      "1 bird's eye chilli, sliced",
      "Hoisin sauce for serving",
    ],
    steps: [
      {
        title: "Toast aromatics",
        time: "5 min",
        detail:
          "Char the ginger and onion halves in a dry pan or under the grill until blackened in spots. In the same dry pan, toast star anise, cinnamon stick, and cloves until fragrant.",
        look: "Blackened edges on ginger and onion; spices visibly smoking.",
      },
      {
        title: "Build the broth",
        time: "20 min",
        detail:
          "Combine stock, charred aromatics, and toasted spices in a pot. Add fish sauce. Bring to a gentle simmer and cook for 15-20 minutes. Do not boil vigorously or the broth will cloud.",
        look: "Clear, amber-coloured, deeply aromatic broth.",
      },
      {
        title: "Poach the chicken",
        time: "12 min",
        detail:
          "Add chicken breast to the simmering broth. Poach gently for 10-12 minutes until cooked through (internal temp 74C). Remove and let rest, then shred with two forks.",
        look: "Tender, easily shredded chicken with no pink.",
      },
      {
        title: "Cook noodles",
        time: "4 min",
        detail:
          "Soak or cook rice noodles according to packet directions. Drain and rinse under cold water to stop cooking. Divide between bowls.",
        look: "Slippery, separated noodles with a slight chew.",
      },
      {
        title: "Assemble bowls",
        time: "3 min",
        detail:
          "Strain the broth. Place noodles in bowls, top with shredded chicken. Ladle over the hot broth. Serve with a plate of fresh herbs, bean sprouts, lime wedges, sliced chilli, and hoisin.",
        look: "Steaming clear broth with herbs piled high on top.",
      },
    ],
  },
  {
    id: "hunt_breakfast_5",
    name: "Sabich Sandwich",
    subtitle: "Fried aubergine, hard-boiled egg, hummus, pitta",
    flag: "\ud83c\uddee\ud83c\uddf1",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 490, protein: 30, carbs: 44, fat: 20 },
    cuisineBadge: "Israeli",
    tip: "Salt and drain the aubergine slices for 15 minutes before frying to remove bitterness.",
    ingredients: [
      "1 medium aubergine, sliced 1cm thick",
      "2 large eggs",
      "2 large pitta breads",
      "3 tbsp hummus",
      "2 tbsp tahini sauce",
      "1 tbsp amba (mango pickle) or mango chutney",
      "1 small tomato, diced",
      "1/4 cucumber, diced",
      "Pickled turnip or cabbage",
      "Fresh flat-leaf parsley",
      "Olive oil for frying",
      "Salt",
    ],
    steps: [
      {
        title: "Prepare aubergine",
        time: "20 min",
        detail:
          "Salt aubergine slices on both sides and leave on a wire rack for 15 minutes. Pat dry thoroughly with kitchen paper. Shallow-fry in olive oil over medium-high heat until deep golden on both sides. Drain on kitchen paper.",
        look: "Deep golden, creamy soft inside, well-drained.",
      },
      {
        title: "Boil eggs",
        time: "10 min",
        detail:
          "Place eggs in cold water, bring to a boil, then cook for 7 minutes for a just-set yolk. Transfer to ice water. Peel and slice.",
        look: "Set white, golden yolk with a slightly jammy centre.",
      },
      {
        title: "Warm pitta",
        time: "2 min",
        detail:
          "Warm pitta breads in a dry pan or directly over a gas flame for 30 seconds each side until puffed and pliable. Cut a slit to create a pocket.",
        look: "Puffy, lightly charred, flexible pitta.",
      },
      {
        title: "Build the sabich",
        time: "3 min",
        detail:
          "Spread hummus generously inside each pitta pocket. Layer in fried aubergine slices, egg slices, diced tomato, cucumber, and pickled vegetables. Drizzle with tahini and amba.",
        look: "Overstuffed pitta with visible colourful layers.",
      },
      {
        title: "Finish and serve",
        time: "1 min",
        detail:
          "Tuck in fresh parsley, add a final drizzle of tahini. Wrap the base in paper or foil for easy eating. Serve immediately.",
        look: "Tightly wrapped with sauces dripping at the edges.",
      },
    ],
  },
  {
    id: "hunt_breakfast_6",
    name: "Chicken Adobo Bowl",
    subtitle: "Vinegar and soy braised chicken, garlic fried rice",
    flag: "\ud83c\uddf5\ud83c\udded",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 480, protein: 48, carbs: 36, fat: 14 },
    cuisineBadge: "Filipino",
    tip: "Use a mix of soy sauce and coconut vinegar for the most authentic adobo flavour.",
    ingredients: [
      "200g chicken thighs, bone-in skin-on",
      "3 tbsp soy sauce",
      "3 tbsp coconut or white vinegar",
      "4 garlic cloves, crushed",
      "1 bay leaf",
      "1 tsp whole black peppercorns",
      "150g cooked jasmine rice (day-old preferred)",
      "2 garlic cloves, minced (for rice)",
      "1 tsp neutral oil",
      "1 egg (optional, for fried rice)",
      "Spring onion for garnish",
    ],
    steps: [
      {
        title: "Marinate and braise",
        time: "25 min",
        detail:
          "Combine chicken, soy sauce, vinegar, crushed garlic, bay leaf, and peppercorns in a pot. Bring to a simmer, cover, and braise over low heat for 20-25 minutes, turning halfway, until the chicken is tender and falling off the bone.",
        look: "Dark, glossy chicken in a reduced, caramel-coloured sauce.",
      },
      {
        title: "Crisp the chicken",
        time: "5 min",
        detail:
          "Remove chicken from the braising liquid. Sear skin-side down in a hot pan with a touch of oil until the skin is crispy and deeply browned. Reserve the braising liquid.",
        look: "Shatteringly crisp skin, mahogany colour.",
      },
      {
        title: "Make garlic fried rice",
        time: "5 min",
        detail:
          "Heat oil in a wok over high heat. Fry minced garlic until just golden (30 seconds). Add cold rice and stir-fry, pressing flat against the wok, for 3-4 minutes until heated through and slightly crispy.",
        look: "Separate grains with golden garlic bits throughout.",
      },
      {
        title: "Reduce sauce",
        time: "3 min",
        detail:
          "Strain the braising liquid and reduce in a small pan over high heat until syrupy and intensely flavoured.",
        look: "Thick, dark glaze that clings to a spoon.",
      },
      {
        title: "Assemble bowl",
        time: "2 min",
        detail:
          "Mound garlic rice in a bowl. Place crispy adobo chicken on top. Spoon reduced sauce over and around. Garnish with sliced spring onion.",
        look: "Glossy chicken on fluffy rice, sauce pooling at the edges.",
      },
    ],
  },
  {
    id: "hunt_breakfast_7",
    name: "Doenjang Jjigae",
    subtitle: "Fermented bean stew, tofu, vegetables, egg",
    flag: "\ud83c\uddf0\ud83c\uddf7",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 380, protein: 30, carbs: 28, fat: 14 },
    cuisineBadge: "Korean",
    tip: "Never boil the stew at full blast after adding doenjang or the probiotics break down.",
    ingredients: [
      "2 tbsp doenjang (Korean fermented soybean paste)",
      "150g firm tofu, cubed",
      "1 small courgette, sliced",
      "1 small potato, cubed",
      "3 mushrooms, sliced",
      "1/2 onion, diced",
      "1 green chilli, sliced",
      "2 garlic cloves, minced",
      "400ml anchovy or vegetable stock",
      "1 large egg",
      "1 spring onion, sliced",
      "1 tsp gochugaru (Korean chilli flakes)",
    ],
    steps: [
      {
        title: "Build the base",
        time: "5 min",
        detail:
          "In a small stone pot or heavy saucepan, bring the stock to a simmer. Dissolve the doenjang paste into the stock, stirring until incorporated. Add the gochugaru.",
        look: "Cloudy, rust-coloured broth with paste fully dissolved.",
      },
      {
        title: "Add hardy vegetables",
        time: "8 min",
        detail:
          "Add potato and onion first, simmer for 5 minutes. Then add courgette and mushrooms. Cook until all vegetables are just tender.",
        look: "Potatoes soft but holding their shape.",
      },
      {
        title: "Add tofu and aromatics",
        time: "4 min",
        detail:
          "Gently slide in tofu cubes, minced garlic, and sliced green chilli. Simmer for 3-4 minutes. Avoid stirring too aggressively or the tofu will crumble.",
        look: "Tofu cubes bobbing in the stew, intact.",
      },
      {
        title: "Crack in the egg",
        time: "3 min",
        detail:
          "Create a small well in the stew and crack the egg directly in. Cover and cook for 2-3 minutes until the white is set but the yolk remains runny.",
        look: "White set, yolk still orange and liquid.",
      },
      {
        title: "Serve bubbling",
        time: "1 min",
        detail:
          "Scatter spring onion over the top. Serve immediately in the hot pot so it arrives at the table still bubbling. Eat with steamed rice.",
        look: "Vigorously bubbling stew with steam rising.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // LUNCH (7)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_lunch_1",
    name: "Adana Kebab Plate",
    subtitle: "Spiced lamb and beef mince, flatbread, yogurt",
    flag: "\ud83c\uddf9\ud83c\uddf7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 500, protein: 50, carbs: 30, fat: 20 },
    cuisineBadge: "Turkish",
    tip: "Chill the mince mixture for 30 minutes before shaping so it holds on the skewers.",
    ingredients: [
      "200g lamb and beef mince (50/50)",
      "1 tsp Aleppo pepper (pul biber)",
      "1 tsp cumin",
      "1/2 tsp sumac",
      "2 garlic cloves, grated",
      "1 small onion, grated and squeezed dry",
      "Salt and black pepper",
      "1 flatbread or lavash",
      "3 tbsp thick yogurt",
      "Grilled tomato and long green pepper",
      "Sumac onion salad",
      "Fresh parsley",
    ],
    steps: [
      {
        title: "Make the kebab mixture",
        time: "10 min",
        detail:
          "Combine mince with grated onion (squeezed dry), garlic, Aleppo pepper, cumin, sumac, salt, and pepper. Knead vigorously for 3-4 minutes until the mixture becomes sticky and cohesive. Chill for 30 minutes.",
        look: "Glossy, sticky mixture that holds together when squeezed.",
      },
      {
        title: "Shape on skewers",
        time: "5 min",
        detail:
          "With wet hands, mould the mixture around flat metal skewers in a long oval shape about 2cm thick. Press firmly so there are no air gaps.",
        look: "Even, torpedo-shaped kebabs with no cracks.",
      },
      {
        title: "Grill the kebabs",
        time: "8 min",
        detail:
          "Cook over high heat on a grill, griddle pan, or under a hot broiler. Turn every 2 minutes for even charring. Grill halved tomatoes and long green peppers alongside.",
        look: "Charred exterior with juices beading on the surface.",
      },
      {
        title: "Warm the bread",
        time: "2 min",
        detail:
          "Lay the flatbread on the grill for 30 seconds each side until puffed and lightly charred. Place on the serving plate as a base.",
        look: "Puffy flatbread with grill marks.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Slide kebabs off skewers onto the bread. Add grilled vegetables, a generous spoon of yogurt, sumac onion salad, and fresh parsley.",
        look: "Rustic platter with charred kebabs on pillowy bread.",
      },
    ],
  },
  {
    id: "hunt_lunch_2",
    name: "Prawn Cocktail",
    subtitle: "Marie Rose sauce, avocado, gem lettuce, brown bread",
    flag: "\ud83c\uddec\ud83c\udde7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 420, protein: 38, carbs: 24, fat: 18 },
    cuisineBadge: "British",
    tip: "Use cold, dry prawns and dress at the last second to keep everything crisp.",
    ingredients: [
      "200g cooked king prawns, peeled",
      "1 ripe avocado, sliced",
      "2 baby gem lettuces, quartered",
      "2 slices brown bread, buttered",
      "3 tbsp good-quality mayonnaise",
      "1 tbsp ketchup",
      "1 tsp Worcestershire sauce",
      "Squeeze of lemon juice",
      "Dash of Tabasco",
      "Pinch of cayenne pepper",
      "Fresh dill",
      "Lemon wedges",
    ],
    steps: [
      {
        title: "Make Marie Rose sauce",
        time: "3 min",
        detail:
          "Mix mayonnaise, ketchup, Worcestershire sauce, lemon juice, and Tabasco. Taste and adjust seasoning. Add a pinch of cayenne for colour. Chill until ready to serve.",
        look: "Pale coral-pink sauce with a glossy sheen.",
      },
      {
        title: "Prepare prawns",
        time: "3 min",
        detail:
          "Pat prawns thoroughly dry with kitchen paper. Season lightly with lemon juice and a pinch of salt. Keep chilled.",
        look: "Plump, dry, glistening prawns.",
      },
      {
        title: "Arrange the base",
        time: "2 min",
        detail:
          "Place gem lettuce quarters in glasses or on plates. Fan avocado slices around the lettuce.",
        look: "Crisp green base with creamy avocado fans.",
      },
      {
        title: "Assemble",
        time: "2 min",
        detail:
          "Pile prawns over the lettuce. Spoon Marie Rose sauce generously over the top. Dust with cayenne and garnish with fresh dill.",
        look: "Prawns draped in pink sauce, bright dill on top.",
      },
      {
        title: "Serve with bread",
        time: "1 min",
        detail:
          "Serve immediately with buttered brown bread on the side and lemon wedges for squeezing.",
        look: "Classic retro presentation, vivid colours.",
      },
    ],
  },
  {
    id: "hunt_lunch_3",
    name: "Salt Cod with Eggs and Potato",
    subtitle: "Bacalhau a Bras",
    flag: "\ud83c\uddf5\ud83c\uddf9",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 470, protein: 44, carbs: 30, fat: 18 },
    cuisineBadge: "Portuguese",
    tip: "Use matchstick-thin potato straws and barely scramble the eggs for the authentic texture.",
    ingredients: [
      "180g desalted salt cod (soaked 24h, flaked)",
      "200g potatoes, cut into matchsticks",
      "4 large eggs",
      "1 onion, thinly sliced",
      "2 garlic cloves, sliced",
      "2 tbsp olive oil",
      "Black olives for garnish",
      "Fresh parsley, chopped",
      "Salt and black pepper",
    ],
    steps: [
      {
        title: "Fry potato straws",
        time: "8 min",
        detail:
          "Heat olive oil in a large non-stick pan. Fry the matchstick potatoes in batches until golden and crisp. Remove and drain on kitchen paper.",
        look: "Thin, golden, crispy potato straws.",
      },
      {
        title: "Cook onion and cod",
        time: "6 min",
        detail:
          "In the same pan, soften the sliced onion and garlic over medium heat until translucent. Add flaked salt cod and cook for 3-4 minutes, stirring gently.",
        look: "Soft onion with white flakes of cod throughout.",
      },
      {
        title: "Combine",
        time: "2 min",
        detail:
          "Return the crispy potato straws to the pan. Toss everything together gently so the potatoes stay as intact as possible.",
        look: "Even mix of cod, onion, and golden potatoes.",
      },
      {
        title: "Add eggs",
        time: "3 min",
        detail:
          "Beat eggs lightly and pour over the mixture. Stir very gently with a spatula, folding rather than scrambling, until the eggs are barely set and still creamy.",
        look: "Glossy, barely-set eggs binding everything together.",
      },
      {
        title: "Garnish and serve",
        time: "1 min",
        detail:
          "Turn out onto a warm platter. Scatter with black olives and chopped parsley. Serve immediately while the eggs are still soft.",
        look: "Golden mound studded with black olives and green parsley.",
      },
    ],
  },
  {
    id: "hunt_lunch_4",
    name: "Plov (Lamb Pilaf)",
    subtitle: "Slow-cooked lamb, carrot, garlic, cumin",
    flag: "\ud83c\uddfa\ud83c\uddff",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 510, protein: 40, carbs: 44, fat: 18 },
    cuisineBadge: "Uzbek",
    tip: "Do not stir once the rice goes in; the steam does all the work.",
    ingredients: [
      "180g lamb shoulder, cubed",
      "150g basmati rice, soaked 30 min",
      "2 large carrots, julienned",
      "1 onion, sliced",
      "1 whole garlic head, top trimmed",
      "1 tsp cumin seeds",
      "1/2 tsp coriander seeds",
      "1/2 tsp turmeric",
      "2 tbsp vegetable oil",
      "Salt and black pepper",
      "400ml hot water or stock",
    ],
    steps: [
      {
        title: "Sear the lamb",
        time: "8 min",
        detail:
          "Heat oil in a heavy-bottomed pot (ideally a kazan or Dutch oven) over high heat until shimmering. Sear lamb cubes in batches until deeply browned on all sides. Remove and set aside.",
        look: "Dark, caramelised crust on every piece.",
      },
      {
        title: "Build the zirvak",
        time: "12 min",
        detail:
          "Reduce heat to medium. Cook sliced onion until golden. Add julienned carrots and cook for 5 minutes. Return the lamb. Add cumin, coriander seeds, turmeric, salt, and pepper. Pour in hot water to cover and simmer for 10 minutes.",
        look: "Rich, golden broth with soft carrots and tender lamb.",
      },
      {
        title: "Layer the rice",
        time: "3 min",
        detail:
          "Drain the soaked rice and spread evenly over the lamb mixture. Do not stir. Nestle the whole garlic head in the centre. Add enough hot water to sit 1cm above the rice.",
        look: "Flat layer of rice with garlic head poking through.",
      },
      {
        title: "Steam cook",
        time: "25 min",
        detail:
          "Bring to a boil, then reduce to the lowest heat. Cover tightly (use foil under the lid for a better seal). Cook undisturbed for 25 minutes until all liquid is absorbed.",
        look: "Dry surface, each grain separate, no excess liquid.",
      },
      {
        title: "Serve",
        time: "3 min",
        detail:
          "Gently fold the rice from bottom to top to mix the layers. Mound onto a large platter. Place the soft garlic head on top. Serve family-style.",
        look: "Golden rice with visible lamb and carrot threads throughout.",
      },
    ],
  },
  {
    id: "hunt_lunch_5",
    name: "Chicken Pho",
    subtitle: "Spiced bone broth, rice noodles, poached chicken",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 440, protein: 48, carbs: 40, fat: 8 },
    cuisineBadge: "Vietnamese",
    tip: "Skim the broth frequently in the first 10 minutes for a crystal-clear result.",
    ingredients: [
      "200g chicken breast",
      "100g flat rice noodles",
      "500ml chicken bone broth",
      "2 star anise",
      "1 cinnamon stick",
      "2 whole cloves",
      "3cm piece ginger, charred",
      "1 onion, halved and charred",
      "1 tbsp fish sauce",
      "1 tsp rock sugar or palm sugar",
      "Thai basil, coriander, and mint",
      "Bean sprouts, lime wedges, sliced chilli",
      "Hoisin and Sriracha for serving",
    ],
    steps: [
      {
        title: "Char and toast",
        time: "5 min",
        detail:
          "Char ginger and onion under a grill or in a dry pan until blackened. Toast star anise, cinnamon, and cloves in a dry pan until fragrant.",
        look: "Blackened aromatics, smoky fragrance filling the kitchen.",
      },
      {
        title: "Simmer broth",
        time: "25 min",
        detail:
          "Combine bone broth, charred aromatics, toasted spices, fish sauce, and sugar in a pot. Simmer gently for 20-25 minutes. Skim any foam that rises. Strain through a fine sieve.",
        look: "Crystal-clear, golden broth with deep aroma.",
      },
      {
        title: "Poach chicken",
        time: "12 min",
        detail:
          "Poach chicken breast gently in the strained broth at a bare simmer for 10-12 minutes. Remove, rest for 3 minutes, then shred into long pieces.",
        look: "Silky, long shreds of tender chicken.",
      },
      {
        title: "Prepare noodles",
        time: "4 min",
        detail:
          "Cook rice noodles according to packet. Drain and rinse in cold water. Divide between deep bowls.",
        look: "Soft, slippery noodle nests in each bowl.",
      },
      {
        title: "Assemble and serve",
        time: "3 min",
        detail:
          "Top noodles with shredded chicken. Ladle over the piping hot broth. Serve with a herb plate of Thai basil, mint, coriander, bean sprouts, lime wedges, chilli, hoisin, and Sriracha.",
        look: "Steaming bowl with a fresh herb garden on the side.",
      },
    ],
  },
  {
    id: "hunt_lunch_6",
    name: "Sea Bass with Moroccan Spices",
    subtitle: "Spiced fish, couscous, roasted vegetables",
    flag: "\ud83c\uddf2\ud83c\udde6",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 460, protein: 50, carbs: 28, fat: 14 },
    cuisineBadge: "Moroccan",
    tip: "Score the fish skin before seasoning so the spices penetrate and the skin crisps evenly.",
    ingredients: [
      "200g sea bass fillets, skin on",
      "1 tsp cumin",
      "1 tsp paprika",
      "1/2 tsp cinnamon",
      "1/2 tsp turmeric",
      "Pinch of cayenne",
      "80g couscous",
      "1 courgette, diced",
      "1 red pepper, diced",
      "1 small red onion, quartered",
      "2 tbsp olive oil",
      "Juice of 1 lemon",
      "Fresh coriander and mint",
      "2 tbsp natural yogurt",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Roast vegetables",
        time: "20 min",
        detail:
          "Toss courgette, red pepper, and onion with 1 tbsp olive oil, salt, and a pinch of cumin. Spread on a baking tray and roast at 200C for 18-20 minutes until caramelised at the edges.",
        look: "Charred edges, soft centres, vibrant colour.",
      },
      {
        title: "Prepare couscous",
        time: "5 min",
        detail:
          "Place couscous in a bowl with a pinch of salt. Pour over 100ml boiling water, cover, and leave for 5 minutes. Fluff with a fork and stir in lemon juice, chopped herbs, and a drizzle of olive oil.",
        look: "Fluffy, separate grains flecked with green herbs.",
      },
      {
        title: "Season the fish",
        time: "3 min",
        detail:
          "Score the skin of the sea bass. Mix cumin, paprika, cinnamon, turmeric, cayenne, and salt. Rub the spice mix into the flesh and skin of the fish.",
        look: "Golden-red spice coating on both sides.",
      },
      {
        title: "Pan-fry fish",
        time: "6 min",
        detail:
          "Heat remaining oil in a non-stick pan over high heat. Place fish skin-side down and press gently with a spatula for the first 30 seconds to prevent curling. Cook 3-4 minutes until the skin is crispy, flip, and cook 1-2 minutes more.",
        look: "Shatteringly crisp, deeply coloured skin; opaque flesh.",
      },
      {
        title: "Plate",
        time: "2 min",
        detail:
          "Spoon herbed couscous onto the plate. Arrange roasted vegetables alongside. Place the fish skin-side up on top. Add a dollop of yogurt and scatter with coriander.",
        look: "Colourful plate with crispy fish as the centrepiece.",
      },
    ],
  },
  {
    id: "hunt_lunch_7",
    name: "Grilled Seafood with Fava",
    subtitle: "Grilled squid or prawns, split pea puree, capers",
    flag: "\ud83c\uddec\ud83c\uddf7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 460, protein: 48, carbs: 24, fat: 14 },
    cuisineBadge: "Greek",
    tip: "Cook squid either very fast (2 min) or very slow (45 min); anything in between turns rubbery.",
    ingredients: [
      "200g cleaned squid or large prawns",
      "100g yellow split peas",
      "1 small onion, quartered (for fava)",
      "1 garlic clove",
      "1 bay leaf",
      "3 tbsp extra virgin olive oil",
      "Juice of 1 lemon",
      "2 tbsp capers, drained",
      "1 tbsp red wine vinegar",
      "Fresh oregano or parsley",
      "Salt and pepper",
      "Pinch of dried chilli flakes",
    ],
    steps: [
      {
        title: "Cook the fava",
        time: "35 min",
        detail:
          "Simmer split peas with onion, garlic, and bay leaf in salted water for 30-35 minutes until completely soft and falling apart. Drain, discard bay leaf, and blend or mash until smooth. Stir in 1 tbsp olive oil, lemon juice, salt, and pepper.",
        look: "Smooth, creamy puree with a pale golden colour.",
      },
      {
        title: "Prepare seafood",
        time: "5 min",
        detail:
          "Score squid bodies in a cross-hatch pattern (or butterfly prawns). Toss with 1 tbsp olive oil, salt, pepper, and chilli flakes. Let sit while the grill heats.",
        look: "Glistening seafood with visible cross-hatch scoring.",
      },
      {
        title: "Grill seafood",
        time: "3 min",
        detail:
          "Heat a grill pan or barbecue to the highest heat. Cook squid for 1-1.5 minutes per side (or prawns for 2 minutes per side). Do not move them once placed down to get good char marks.",
        look: "Defined char lines, curled edges, opaque throughout.",
      },
      {
        title: "Make caper dressing",
        time: "2 min",
        detail:
          "Combine remaining olive oil with red wine vinegar, capers, and chopped herbs. Season with pepper.",
        look: "Rustic vinaigrette with visible capers.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Spread a generous swoosh of fava on each plate. Arrange grilled seafood on top. Spoon the caper dressing over and around. Finish with fresh oregano.",
        look: "Charred seafood on a golden puree, bright herb garnish.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DINNER (7)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_dinner_1",
    name: "Pan-Roasted Chicken, Lemon Caper Sauce",
    subtitle: "Crispy skin chicken, wilted spinach, new potatoes",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 510, protein: 50, carbs: 28, fat: 22 },
    cuisineBadge: "French",
    tip: "Start the chicken skin-side down in a cold pan for the crispiest result.",
    ingredients: [
      "200g chicken thighs, skin-on bone-in",
      "150g baby new potatoes, halved",
      "100g baby spinach",
      "2 tbsp capers, drained",
      "Juice of 1 lemon",
      "2 tbsp butter",
      "1 tbsp olive oil",
      "2 garlic cloves, crushed",
      "120ml chicken stock",
      "Fresh thyme",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Boil potatoes",
        time: "15 min",
        detail:
          "Boil halved new potatoes in salted water until tender when pierced with a knife. Drain and set aside.",
        look: "Tender, fluffy potatoes that yield easily.",
      },
      {
        title: "Crisp the chicken",
        time: "18 min",
        detail:
          "Season chicken well. Place skin-side down in a cold oven-safe pan with olive oil. Turn heat to medium and cook without moving for 8-10 minutes until the skin is deeply golden and crispy. Flip, add thyme, and transfer to a 200C oven for 8 minutes to cook through.",
        look: "Deeply golden, crackly skin; juices run clear.",
      },
      {
        title: "Make lemon caper sauce",
        time: "4 min",
        detail:
          "Remove chicken and rest. Place the same pan over medium heat. Add butter, garlic, and capers. Cook for 1 minute. Add stock and lemon juice, scraping up the fond. Simmer until reduced by half.",
        look: "Glossy, buttery sauce with capers and fond bits.",
      },
      {
        title: "Wilt spinach",
        time: "2 min",
        detail:
          "Toss baby spinach into the pan with the potatoes and a splash of the sauce. Wilt just until collapsed, about 1 minute.",
        look: "Bright green, barely wilted, glossy leaves.",
      },
      {
        title: "Plate",
        time: "2 min",
        detail:
          "Arrange potatoes and wilted spinach on warm plates. Place the chicken on top, skin-side up. Spoon the lemon caper sauce over and around.",
        look: "Restaurant-worthy plate with crispy chicken glistening.",
      },
    ],
  },
  {
    id: "hunt_dinner_2",
    name: "Steak with Chimichurri",
    subtitle: "Seared steak, Argentine herb sauce, roasted vegetables",
    flag: "\ud83c\udde6\ud83c\uddf7",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 530, protein: 52, carbs: 12, fat: 28 },
    cuisineBadge: "Argentine",
    tip: "Rest the steak for as long as you cooked it; the juices need time to redistribute.",
    ingredients: [
      "220g sirloin or rump steak",
      "1 bunch flat-leaf parsley, finely chopped",
      "2 garlic cloves, minced",
      "1 tbsp red wine vinegar",
      "1/2 tsp dried oregano",
      "1/4 tsp red chilli flakes",
      "3 tbsp extra virgin olive oil",
      "1 courgette, halved lengthwise",
      "1 red pepper, quartered",
      "Salt and black pepper",
    ],
    steps: [
      {
        title: "Make chimichurri",
        time: "5 min",
        detail:
          "Finely chop parsley and combine with minced garlic, red wine vinegar, oregano, chilli flakes, and olive oil. Season with salt. Let sit while you cook so the flavours meld.",
        look: "Bright green, rustic, slightly loose sauce.",
      },
      {
        title: "Prepare and season steak",
        time: "25 min",
        detail:
          "Remove steak from the fridge 20 minutes before cooking. Pat completely dry with kitchen paper. Season generously with salt and pepper on both sides.",
        look: "Dry surface, visible salt crystals.",
      },
      {
        title: "Roast vegetables",
        time: "15 min",
        detail:
          "Toss courgette and pepper with olive oil and salt. Grill on a hot griddle or roast at 220C until charred and tender.",
        look: "Deep char marks, collapsed and softened.",
      },
      {
        title: "Sear the steak",
        time: "8 min",
        detail:
          "Heat a cast-iron pan until smoking hot. Add a thin film of oil. Sear steak for 3-4 minutes per side for medium-rare (adjust to preference). Rest on a warm plate for at least 5 minutes.",
        look: "Deep brown crust, rosy pink centre when sliced.",
      },
      {
        title: "Slice and serve",
        time: "2 min",
        detail:
          "Slice steak against the grain into 1cm strips. Arrange on a plate with the roasted vegetables. Spoon chimichurri generously over the steak.",
        look: "Pink slices fanned across the plate, vibrant green sauce.",
      },
    ],
  },
  {
    id: "hunt_dinner_3",
    name: "Tandoori Chicken, Dal and Raita",
    subtitle: "Spiced grilled chicken, lentil dal, cucumber yogurt",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 490, protein: 54, carbs: 28, fat: 14 },
    cuisineBadge: "Indian",
    tip: "Slash the chicken to the bone so the marinade penetrates deeply.",
    ingredients: [
      "220g chicken thighs, skinless bone-in",
      "3 tbsp yogurt",
      "1 tbsp tandoori paste or powder",
      "Juice of 1/2 lemon",
      "100g red lentils",
      "1/2 tsp turmeric",
      "1 tsp cumin seeds",
      "1 small onion, diced",
      "2 garlic cloves, minced",
      "1cm ginger, grated",
      "1 tomato, chopped",
      "1 green chilli",
      "Fresh coriander",
      "For raita: 3 tbsp yogurt, 1/4 cucumber grated, mint, cumin",
    ],
    steps: [
      {
        title: "Marinate chicken",
        time: "30 min",
        detail:
          "Slash chicken deeply. Mix yogurt, tandoori paste, and lemon juice. Coat chicken thoroughly and marinate for at least 30 minutes (overnight is ideal).",
        look: "Vivid red-orange coating filling every slash.",
      },
      {
        title: "Cook the dal",
        time: "20 min",
        detail:
          "Rinse red lentils. Boil with turmeric and 400ml water until soft and broken down (15-18 min). In a separate pan, fry cumin seeds, onion, garlic, ginger, chilli, and tomato until fragrant. Stir this tarka into the cooked lentils. Season with salt.",
        look: "Thick, golden dal with a fragrant tempered oil layer.",
      },
      {
        title: "Make raita",
        time: "3 min",
        detail:
          "Squeeze excess water from grated cucumber. Mix with yogurt, chopped mint, a pinch of cumin, and salt.",
        look: "Cool, white raita flecked with green mint.",
      },
      {
        title: "Grill chicken",
        time: "14 min",
        detail:
          "Cook under a very hot grill or on a barbecue for 6-7 minutes per side, basting with any remaining marinade. The edges should char while the centre stays juicy.",
        look: "Charred edges, bright red-orange, sizzling.",
      },
      {
        title: "Plate",
        time: "2 min",
        detail:
          "Serve the tandoori chicken alongside a bowl of dal and a spoonful of raita. Scatter with fresh coriander and serve with a lemon wedge.",
        look: "Vivid trio: red chicken, golden dal, white raita.",
      },
    ],
  },
  {
    id: "hunt_dinner_4",
    name: "Chicken Katsu Curry",
    subtitle: "Panko-crumbed chicken, Japanese curry sauce, rice",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 510, protein: 46, carbs: 48, fat: 14 },
    cuisineBadge: "Japanese",
    tip: "Press the panko firmly into the chicken for an even crust that stays on during frying.",
    ingredients: [
      "200g chicken breast, butterflied",
      "30g plain flour",
      "1 egg, beaten",
      "50g panko breadcrumbs",
      "150g cooked Japanese short-grain rice",
      "1 small onion, diced",
      "1 carrot, diced",
      "1 small potato, diced",
      "2 tbsp Japanese curry roux (S&B Golden Curry or similar)",
      "350ml water or chicken stock",
      "1 tsp soy sauce",
      "Neutral oil for frying",
      "Pickled ginger and shredded cabbage for serving",
    ],
    steps: [
      {
        title: "Make curry sauce",
        time: "20 min",
        detail:
          "Saute onion, carrot, and potato in a little oil until softened. Add water or stock, bring to a simmer, and cook until vegetables are tender. Break in the curry roux blocks and stir until dissolved and thickened. Add soy sauce. Keep warm.",
        look: "Thick, glossy, dark golden sauce with soft vegetables.",
      },
      {
        title: "Bread the chicken",
        time: "5 min",
        detail:
          "Season the butterflied chicken with salt and pepper. Dust in flour, dip in beaten egg, then press firmly into panko breadcrumbs on both sides. Refrigerate for 10 minutes to set the coating.",
        look: "Even, thick panko coating with no bald spots.",
      },
      {
        title: "Fry the katsu",
        time: "8 min",
        detail:
          "Shallow-fry in 1cm of oil over medium heat for 3-4 minutes per side until the panko is deeply golden and the chicken reaches 74C internally. Drain on a wire rack, not paper towels, to keep the base crisp.",
        look: "Uniformly golden, audibly crunchy crust.",
      },
      {
        title: "Slice",
        time: "2 min",
        detail:
          "Let the katsu rest for 2 minutes. Slice into 2cm strips with a sharp knife using one decisive cut per strip (sawing ruins the crust).",
        look: "Clean-cut strips showing white, juicy interior and crisp coating.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Mound rice on one side of a plate. Lean katsu strips against the rice. Pour curry sauce alongside (not over the katsu). Garnish with shredded cabbage and pickled ginger.",
        look: "Classic katsu curry presentation: crispy chicken, saucy side.",
      },
    ],
  },
  {
    id: "hunt_dinner_5",
    name: "Ginger Caramel Fish",
    subtitle: "Fish in ginger-fish sauce caramel, spring onion, rice",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 440, protein: 50, carbs: 18, fat: 14 },
    cuisineBadge: "Vietnamese",
    tip: "Cook the caramel until it smokes slightly before adding liquid for the deepest flavour.",
    ingredients: [
      "220g firm white fish (catfish, cod, or barramundi), cut into chunks",
      "2 tbsp fish sauce",
      "2 tbsp sugar",
      "3cm piece ginger, julienned",
      "2 garlic cloves, minced",
      "1 shallot, thinly sliced",
      "1 bird's eye chilli, sliced",
      "3 tbsp water",
      "1 tsp neutral oil",
      "2 spring onions, cut into 4cm lengths",
      "Cracked black pepper",
      "150g steamed jasmine rice",
      "Fresh coriander",
    ],
    steps: [
      {
        title: "Make caramel",
        time: "5 min",
        detail:
          "Combine sugar and 1 tbsp water in a small heavy pan over medium heat. Swirl (do not stir) until the sugar melts and turns a deep amber colour. Immediately and carefully add the fish sauce and remaining water. Stir until smooth.",
        look: "Deep amber, fragrant caramel sauce with no lumps.",
      },
      {
        title: "Saute aromatics",
        time: "3 min",
        detail:
          "Heat oil in a clay pot or heavy pan. Fry shallot, garlic, ginger, and chilli until fragrant and just softened.",
        look: "Soft, golden aromatics with ginger strands visible.",
      },
      {
        title: "Braise the fish",
        time: "10 min",
        detail:
          "Place fish chunks in the pot. Pour over the caramel sauce. Cover and simmer over low heat for 8-10 minutes, basting the fish occasionally with the sauce. Do not stir aggressively or the fish will break apart.",
        look: "Glossy, dark-glazed fish pieces in a sticky sauce.",
      },
      {
        title: "Finish with spring onion",
        time: "2 min",
        detail:
          "Add spring onion lengths and a generous crack of black pepper. Cover for 1 minute to wilt the onions. Remove from heat.",
        look: "Bright green onions draped over caramelised fish.",
      },
      {
        title: "Serve",
        time: "2 min",
        detail:
          "Serve the fish and sauce directly from the clay pot alongside steamed jasmine rice. Garnish with fresh coriander.",
        look: "Rustic clay pot with glistening, aromatic fish.",
      },
    ],
  },
  {
    id: "hunt_dinner_6",
    name: "Steak with Pepper Sauce",
    subtitle: "Sirloin, creamy peppercorn sauce, oven chips",
    flag: "\ud83c\uddea\ud83c\uddf8",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 560, protein: 52, carbs: 36, fat: 22 },
    cuisineBadge: "Spanish",
    tip: "Crush the peppercorns coarsely with the flat of a knife; a grinder makes them too fine.",
    ingredients: [
      "220g sirloin steak",
      "250g potatoes, cut into thick chips",
      "1 tbsp olive oil",
      "1 tbsp mixed peppercorns, coarsely crushed",
      "1 shallot, finely diced",
      "1 garlic clove, minced",
      "60ml brandy or cognac",
      "100ml beef stock",
      "2 tbsp double cream",
      "1 tsp Dijon mustard",
      "Knob of butter",
      "Salt",
      "Watercress for serving",
    ],
    steps: [
      {
        title: "Bake oven chips",
        time: "35 min",
        detail:
          "Parboil chips for 5 minutes, drain, and shake in the colander to rough up the edges. Toss with olive oil and salt. Spread on a baking tray and roast at 220C for 25-30 minutes, turning once, until golden and crispy.",
        look: "Golden, crispy edges with fluffy centres.",
      },
      {
        title: "Season and sear steak",
        time: "10 min",
        detail:
          "Pat steak dry. Season generously with salt and press crushed peppercorns into both sides. Sear in a smoking hot pan with a little oil for 3-4 minutes per side for medium-rare. Rest on a warm plate.",
        look: "Dark, peppery crust with juices pooling as it rests.",
      },
      {
        title: "Build pepper sauce",
        time: "5 min",
        detail:
          "In the same pan, reduce heat. Add butter, shallot, and garlic. Cook for 1 minute. Carefully add brandy (it may flame). Let it reduce by half. Add beef stock and simmer for 2 minutes. Stir in cream and mustard. Season to taste.",
        look: "Glossy, speckled, creamy sauce coating the back of a spoon.",
      },
      {
        title: "Rest and slice",
        time: "5 min",
        detail:
          "Let the steak rest for a full 5 minutes. Slice against the grain if desired, or serve whole. Pour any resting juices into the pepper sauce.",
        look: "Rosy pink interior, pepper-crusted exterior.",
      },
      {
        title: "Plate",
        time: "2 min",
        detail:
          "Place steak on a warm plate. Pour pepper sauce over and around. Pile oven chips alongside with a handful of fresh watercress.",
        look: "Classic bistro plate: steak, sauce, golden chips.",
      },
    ],
  },
  {
    id: "hunt_dinner_7",
    name: "Gochujang Chicken, Kimchi Rice",
    subtitle: "Spicy glazed chicken thighs, kimchi fried rice",
    flag: "\ud83c\uddf0\ud83c\uddf7",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 490, protein: 50, carbs: 32, fat: 18 },
    cuisineBadge: "Korean",
    tip: "Baste the chicken under the grill every 2 minutes for the stickiest, most lacquered glaze.",
    ingredients: [
      "220g chicken thighs, boneless skin-on",
      "2 tbsp gochujang",
      "1 tbsp soy sauce",
      "1 tbsp honey",
      "1 tsp sesame oil",
      "1 garlic clove, grated",
      "150g cooked rice (day-old preferred)",
      "80g kimchi, roughly chopped",
      "1 tbsp kimchi brine",
      "1 tsp neutral oil",
      "1 egg",
      "Sesame seeds and spring onion for garnish",
    ],
    steps: [
      {
        title: "Make gochujang glaze",
        time: "3 min",
        detail:
          "Whisk together gochujang, soy sauce, honey, sesame oil, and grated garlic until smooth.",
        look: "Glossy, vibrant red paste.",
      },
      {
        title: "Glaze and grill chicken",
        time: "18 min",
        detail:
          "Score the chicken thighs. Brush generously with the glaze. Cook under a hot grill (or on a griddle) for 7-8 minutes per side, basting with more glaze every 2 minutes. The glaze should caramelise and char slightly at the edges.",
        look: "Lacquered, sticky, charred chicken with a deep red hue.",
      },
      {
        title: "Make kimchi fried rice",
        time: "6 min",
        detail:
          "Heat oil in a wok over high heat. Add chopped kimchi and stir-fry for 2 minutes until slightly caramelised. Add cold rice and kimchi brine. Stir-fry for 3-4 minutes, pressing rice against the wok for crispy bits.",
        look: "Orange-tinged rice with crispy, caramelised edges.",
      },
      {
        title: "Fry the egg",
        time: "2 min",
        detail:
          "Fry an egg in a little oil until the edges are crispy and lacy but the yolk stays runny.",
        look: "Crispy, lacy edges; bright, jiggly yolk.",
      },
      {
        title: "Assemble",
        time: "2 min",
        detail:
          "Mound kimchi fried rice in a bowl. Slice the glazed chicken and lay over the rice. Top with the fried egg. Scatter with sesame seeds and sliced spring onion.",
        look: "Vibrant bowl: red chicken, orange rice, golden egg.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SNACK 1 (7)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_snack1_1",
    name: "Gyoza with Ponzu",
    subtitle: "Pan-fried chicken dumplings, dipping sauce",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 200, protein: 18, carbs: 20, fat: 6 },
    cuisineBadge: "Japanese",
    tip: "Add water and cover immediately after browning the bases for the perfect crisp-steam combo.",
    ingredients: [
      "100g chicken mince",
      "2 spring onions, finely chopped",
      "1cm ginger, grated",
      "1 garlic clove, grated",
      "1 tsp soy sauce",
      "1/2 tsp sesame oil",
      "8 gyoza wrappers",
      "1 tsp neutral oil",
      "For ponzu: 1 tbsp soy sauce, 1 tbsp rice vinegar, squeeze of lime, dash of mirin",
    ],
    steps: [
      {
        title: "Make filling",
        time: "5 min",
        detail:
          "Combine chicken mince, spring onion, ginger, garlic, soy sauce, and sesame oil. Mix thoroughly until the mixture is sticky and cohesive.",
        look: "Smooth, well-combined paste.",
      },
      {
        title: "Wrap gyoza",
        time: "8 min",
        detail:
          "Place a teaspoon of filling in the centre of each wrapper. Wet the edges with water. Fold in half and create 3-4 pleats on one side, pressing firmly to seal. Ensure no air is trapped inside.",
        look: "Neat crescent shapes with even pleats, flat bottoms.",
      },
      {
        title: "Pan-fry and steam",
        time: "6 min",
        detail:
          "Heat oil in a non-stick pan over medium-high heat. Place gyoza flat-side down and cook for 2 minutes until golden. Add 3 tbsp water and immediately cover. Steam for 3-4 minutes until the wrappers are translucent and water has evaporated.",
        look: "Crispy golden bottoms, translucent steamed tops.",
      },
      {
        title: "Make ponzu",
        time: "1 min",
        detail:
          "Stir together soy sauce, rice vinegar, lime juice, and mirin in a small dipping dish.",
        look: "Clear, amber dipping sauce.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Turn gyoza out onto a plate crispy-side up. Serve immediately with the ponzu dipping sauce alongside.",
        look: "Row of glistening dumplings, crispy side facing up.",
      },
    ],
  },
  {
    id: "hunt_snack1_2",
    name: "Smoked Salmon on Crispbread",
    subtitle: "Smoked salmon, cream cheese, dill, capers",
    flag: "\ud83c\uddf8\ud83c\uddea",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 190, protein: 20, carbs: 14, fat: 6 },
    cuisineBadge: "Swedish",
    tip: "Let the cream cheese come to room temperature for the smoothest spread.",
    ingredients: [
      "80g smoked salmon",
      "2 rye crispbreads",
      "2 tbsp light cream cheese",
      "1 tsp capers",
      "Fresh dill sprigs",
      "Squeeze of lemon",
      "Cracked black pepper",
      "Thinly sliced red onion (optional)",
    ],
    steps: [
      {
        title: "Prepare cream cheese",
        time: "2 min",
        detail:
          "Beat the cream cheese with a squeeze of lemon juice and a pinch of pepper until smooth and spreadable.",
        look: "Smooth, slightly whipped texture.",
      },
      {
        title: "Assemble",
        time: "3 min",
        detail:
          "Spread cream cheese generously on each crispbread. Drape smoked salmon in loose folds over the top. Scatter with capers, a few thin red onion slices, and dill sprigs.",
        look: "Pink salmon folds on white cream cheese, bright green dill.",
      },
      {
        title: "Finish",
        time: "1 min",
        detail:
          "Add a final squeeze of lemon, a crack of black pepper, and serve immediately while the crispbread is still crunchy.",
        look: "Elegant open-faced presentation with contrasting textures.",
      },
    ],
  },
  {
    id: "hunt_snack1_3",
    name: "Lamb and Pine Nut Flatbread",
    subtitle: "Spiced lamb mince on flatbread, yogurt dip",
    flag: "\ud83c\uddf1\ud83c\udde7",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 210, protein: 18, carbs: 18, fat: 8 },
    cuisineBadge: "Lebanese",
    tip: "Spread the lamb mixture right to the edges of the flatbread so it doesn't dry out.",
    ingredients: [
      "80g lamb mince",
      "1 small flatbread or naan",
      "1 tbsp pine nuts",
      "1 small tomato, finely diced",
      "1/2 small onion, finely diced",
      "1/2 tsp allspice",
      "1/2 tsp cinnamon",
      "Pinch of cayenne",
      "1 tbsp yogurt for dipping",
      "Fresh mint leaves",
      "Squeeze of lemon",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Prepare topping",
        time: "5 min",
        detail:
          "Combine raw lamb mince with diced tomato, onion, allspice, cinnamon, cayenne, salt, and pepper. Mix well until evenly combined. Toast pine nuts in a dry pan until golden.",
        look: "Uniform, spiced, pink-red mince mixture.",
      },
      {
        title: "Top the flatbread",
        time: "2 min",
        detail:
          "Spread the raw lamb mixture thinly and evenly over the flatbread, pressing it right to the edges. Scatter pine nuts on top.",
        look: "Thin, even coating covering the entire surface.",
      },
      {
        title: "Bake",
        time: "8 min",
        detail:
          "Place on a baking tray in a preheated 220C oven for 7-8 minutes until the lamb is cooked through and the edges of the flatbread are crispy.",
        look: "Browned lamb, crispy bread edges, golden pine nuts.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Squeeze lemon juice over the top, scatter with fresh mint, and serve with a spoonful of yogurt for dipping. Roll up or cut into strips.",
        look: "Aromatic flatbread with bright green mint scattered over.",
      },
    ],
  },
  {
    id: "hunt_snack1_4",
    name: "Garlic Prawns",
    subtitle: "Gambas al ajillo — prawns in garlic and olive oil",
    flag: "\ud83c\uddea\ud83c\uddf8",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 210, protein: 22, carbs: 10, fat: 10 },
    cuisineBadge: "Spanish",
    tip: "Serve immediately and eat with bread to soak up every drop of the garlicky oil.",
    ingredients: [
      "120g raw king prawns, peeled",
      "4 garlic cloves, thinly sliced",
      "1 small dried chilli or pinch of chilli flakes",
      "2 tbsp extra virgin olive oil",
      "1 tbsp dry sherry (optional)",
      "Fresh flat-leaf parsley, chopped",
      "Pinch of smoked paprika",
      "Sea salt",
      "Crusty bread for serving",
    ],
    steps: [
      {
        title: "Prepare prawns",
        time: "3 min",
        detail:
          "Pat prawns dry and season with salt and a pinch of smoked paprika. This ensures they sear rather than steam.",
        look: "Dry, lightly seasoned prawns.",
      },
      {
        title: "Heat oil and garlic",
        time: "2 min",
        detail:
          "Heat olive oil in a small terracotta dish or heavy pan over medium heat. Add sliced garlic and dried chilli. Cook gently until the garlic is just starting to turn golden — not brown.",
        look: "Sizzling, pale gold garlic slices in hot oil.",
      },
      {
        title: "Cook prawns",
        time: "3 min",
        detail:
          "Increase heat to high. Add prawns in a single layer. Cook for 1.5 minutes per side until pink and curled. Add sherry if using and let it bubble away.",
        look: "Pink, curled prawns sizzling in fragrant oil.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Scatter with chopped parsley and serve immediately in the cooking dish with crusty bread for mopping up the oil.",
        look: "Bubbling, fragrant prawns with parsley, served sizzling.",
      },
    ],
  },
  {
    id: "hunt_snack1_5",
    name: "Corn on the Cob with Chilli and Lime",
    subtitle: "Grilled corn, chilli, lime, cheese",
    flag: "\ud83c\uddf2\ud83c\uddfd",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 200, protein: 8, carbs: 26, fat: 8 },
    cuisineBadge: "Mexican",
    tip: "Char the corn directly over a flame for the smokiest, sweetest flavour.",
    ingredients: [
      "1 large corn on the cob",
      "1 tbsp light mayonnaise",
      "1 tbsp crumbled cotija or feta cheese",
      "1/2 tsp chilli powder (ancho or tajin)",
      "Juice of 1/2 lime",
      "Fresh coriander",
      "Pinch of cayenne (optional)",
    ],
    steps: [
      {
        title: "Grill the corn",
        time: "10 min",
        detail:
          "Cook corn directly over a gas flame, on a grill, or under a broiler, turning every 2 minutes until charred in spots all over. The kernels should pop and blister.",
        look: "Blistered, charred patches with bright yellow between.",
      },
      {
        title: "Coat with mayo",
        time: "1 min",
        detail:
          "While still hot, brush or spread a thin layer of mayonnaise all over the corn using the back of a spoon or a pastry brush.",
        look: "Light, even coating clinging to every kernel.",
      },
      {
        title: "Season and finish",
        time: "2 min",
        detail:
          "Sprinkle with crumbled cheese, chilli powder, and cayenne. Squeeze lime juice generously over the top. Scatter with chopped coriander.",
        look: "Red, white, and green toppings on charred golden corn.",
      },
    ],
  },
  {
    id: "hunt_snack1_6",
    name: "Glass Noodle Salad",
    subtitle: "Japchae-style noodles, spinach, mushroom, sesame",
    flag: "\ud83c\uddf0\ud83c\uddf7",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 190, protein: 12, carbs: 24, fat: 6 },
    cuisineBadge: "Korean",
    tip: "Toss the noodles with sesame oil while still warm so they absorb the flavour and don't stick.",
    ingredients: [
      "60g sweet potato glass noodles (dangmyeon)",
      "50g baby spinach",
      "3 shiitake mushrooms, sliced",
      "1/2 carrot, julienned",
      "1 spring onion, sliced",
      "1 tbsp soy sauce",
      "1 tsp sesame oil",
      "1/2 tsp sugar",
      "1 garlic clove, minced",
      "Sesame seeds",
      "1 tsp neutral oil",
    ],
    steps: [
      {
        title: "Cook noodles",
        time: "6 min",
        detail:
          "Boil glass noodles according to packet directions (usually 5-6 minutes). Drain, rinse with cold water, and cut into manageable lengths with scissors. Toss immediately with sesame oil.",
        look: "Translucent, glossy noodles that don't clump.",
      },
      {
        title: "Stir-fry vegetables",
        time: "5 min",
        detail:
          "Stir-fry mushrooms and carrot in oil over high heat for 2 minutes. Add spinach and garlic, cook for 1 minute until just wilted. Season with a splash of soy sauce.",
        look: "Tender-crisp, vibrant vegetables.",
      },
      {
        title: "Combine and season",
        time: "3 min",
        detail:
          "Toss noodles with the vegetables, remaining soy sauce, sugar, and spring onion. Adjust seasoning to taste.",
        look: "Glossy noodles threaded with colourful vegetables.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Pile into a bowl and scatter generously with sesame seeds. Serve warm or at room temperature.",
        look: "Glistening noodle tangle topped with white sesame.",
      },
    ],
  },
  {
    id: "hunt_snack1_7",
    name: "Chickpea Chaat",
    subtitle: "Crispy chickpeas, yogurt, tamarind, mint chutney",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 200, protein: 10, carbs: 26, fat: 6 },
    cuisineBadge: "Indian",
    tip: "Layer the chutneys at the very end so everything stays crispy until you eat it.",
    ingredients: [
      "120g tinned chickpeas, drained and dried",
      "1 tsp chaat masala",
      "1/2 tsp cumin",
      "Pinch of cayenne",
      "1 tbsp yogurt",
      "1 tbsp tamarind chutney (or date-tamarind sauce)",
      "1 tbsp mint-coriander chutney",
      "1 small onion, finely diced",
      "1 small tomato, diced",
      "Fresh coriander",
      "Sev or crispy noodles for topping",
      "1 tsp oil",
    ],
    steps: [
      {
        title: "Crisp the chickpeas",
        time: "8 min",
        detail:
          "Toss dried chickpeas with oil, cumin, and a pinch of salt. Roast in a hot pan or oven at 200C for 6-8 minutes until crispy on the outside but still creamy inside.",
        look: "Golden, slightly crunchy chickpeas that rattle in the pan.",
      },
      {
        title: "Season",
        time: "1 min",
        detail:
          "Toss the hot chickpeas with chaat masala and cayenne while still warm so the spices stick.",
        look: "Dusted, fragrant chickpeas.",
      },
      {
        title: "Assemble",
        time: "3 min",
        detail:
          "Place spiced chickpeas in a bowl. Add diced onion and tomato. Drizzle with yogurt, then tamarind chutney, then mint chutney in layers.",
        look: "Layered drizzles of white, brown, and green.",
      },
      {
        title: "Top and serve",
        time: "1 min",
        detail:
          "Scatter with fresh coriander and a handful of sev or crispy noodles. Serve immediately before the crunch fades.",
        look: "Colourful, textural bowl with visible layers of sauce.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SNACK 2 (7)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_snack2_1",
    name: "Yogurt Pots with Honey and Pistachios",
    subtitle: "Vanilla yogurt, pistachio, orange blossom honey",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 190, protein: 22, carbs: 18, fat: 4 },
    cuisineBadge: "French",
    tip: "Use thick Greek yogurt and drain it for 10 minutes for an even creamier texture.",
    ingredients: [
      "200g Greek yogurt (high-protein)",
      "1 tbsp orange blossom honey",
      "15g pistachios, roughly chopped",
      "1/4 tsp vanilla extract or seeds from 1/4 pod",
      "Pinch of sea salt flakes",
    ],
    steps: [
      {
        title: "Prepare yogurt",
        time: "2 min",
        detail:
          "Stir vanilla into the Greek yogurt until evenly combined. Spoon into a small bowl or glass jar.",
        look: "Smooth, thick, ivory-white yogurt.",
      },
      {
        title: "Top and drizzle",
        time: "2 min",
        detail:
          "Drizzle orange blossom honey generously over the surface. Scatter chopped pistachios and finish with a tiny pinch of flaky sea salt.",
        look: "Golden honey rivulets, green pistachios, salt crystals.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Serve immediately while chilled. The contrast of cold yogurt, sweet honey, and crunchy salt is the point.",
        look: "Elegant, minimalist dessert-style presentation.",
      },
    ],
  },
  {
    id: "hunt_snack2_2",
    name: "Matcha Protein Pancakes",
    subtitle: "Japanese-style mini protein pancakes, honey",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 200, protein: 24, carbs: 18, fat: 4 },
    cuisineBadge: "Japanese",
    tip: "Sift the matcha to avoid lumps; they will show as bitter green spots in the pancakes.",
    ingredients: [
      "1 scoop vanilla protein powder",
      "1 large egg",
      "2 tbsp plain flour",
      "1 tsp matcha powder, sifted",
      "3 tbsp milk",
      "1/2 tsp baking powder",
      "1 tsp honey for drizzling",
      "Cooking spray or a touch of butter",
    ],
    steps: [
      {
        title: "Make batter",
        time: "3 min",
        detail:
          "Whisk together protein powder, flour, sifted matcha, and baking powder. Add the egg and milk, mixing until just smooth. Do not overmix. The batter should be thick and pourable.",
        look: "Smooth, pale green batter with no lumps.",
      },
      {
        title: "Cook pancakes",
        time: "8 min",
        detail:
          "Heat a non-stick pan over the lowest heat possible. Lightly grease. Drop 2 tablespoons of batter per pancake. Cook for 3-4 minutes until bubbles appear on the surface and the edges look set. Flip very gently and cook 2 minutes more.",
        look: "Tall, fluffy, even green pancakes with no browning.",
      },
      {
        title: "Stack and serve",
        time: "2 min",
        detail:
          "Stack 3-4 mini pancakes. Drizzle with honey. Serve immediately while warm and fluffy.",
        look: "Neat stack of soft green pancakes, glistening with honey.",
      },
    ],
  },
  {
    id: "hunt_snack2_3",
    name: "Rice Pudding",
    subtitle: "Creamy rice pudding, cinnamon, raisins",
    flag: "\ud83c\uddf9\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 200, protein: 18, carbs: 24, fat: 4 },
    cuisineBadge: "Turkish",
    tip: "Stir constantly in the last 5 minutes to achieve the creamiest consistency.",
    ingredients: [
      "40g short-grain rice (arborio or pudding rice)",
      "250ml semi-skimmed milk",
      "100ml water",
      "1 scoop vanilla protein powder",
      "1 tbsp sugar or honey",
      "1/2 tsp vanilla extract",
      "1 tbsp raisins",
      "Ground cinnamon for dusting",
      "Pinch of salt",
    ],
    steps: [
      {
        title: "Cook the rice",
        time: "25 min",
        detail:
          "Combine rice, milk, water, sugar, and salt in a heavy saucepan. Bring to a gentle simmer over medium-low heat, stirring frequently. Cook for 20-25 minutes, stirring more often towards the end, until the rice is completely soft and the mixture is thick and creamy.",
        look: "Thick, porridge-like consistency; rice grains fully swollen.",
      },
      {
        title: "Add protein and raisins",
        time: "3 min",
        detail:
          "Remove from heat. Stir in protein powder, vanilla, and raisins. The residual heat will plump the raisins. Add a splash more milk if it seems too thick.",
        look: "Smooth, creamy pudding with plump raisins throughout.",
      },
      {
        title: "Serve",
        time: "2 min",
        detail:
          "Spoon into a bowl. Dust generously with ground cinnamon. Serve warm or chill in the fridge for a cold dessert.",
        look: "Creamy white pudding with a cinnamon-dusted surface.",
      },
    ],
  },
  {
    id: "hunt_snack2_4",
    name: "Caramel Yogurt Mousse",
    subtitle: "Dulce de leche yogurt, crushed biscuits",
    flag: "\ud83c\uddf5\ud83c\uddea",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 190, protein: 22, carbs: 16, fat: 4 },
    cuisineBadge: "Peruvian",
    tip: "Fold gently to keep the mousse airy; vigorous stirring makes it dense.",
    ingredients: [
      "150g Greek yogurt (high-protein)",
      "1 tbsp dulce de leche",
      "1 scoop vanilla protein powder",
      "1 digestive biscuit, crushed",
      "Pinch of sea salt",
      "1 tbsp cold water",
    ],
    steps: [
      {
        title: "Make mousse base",
        time: "3 min",
        detail:
          "Whisk protein powder with cold water until smooth. Fold into Greek yogurt gently. Swirl in dulce de leche, leaving visible ripples rather than fully mixing.",
        look: "Creamy white mousse with caramel ribbons throughout.",
      },
      {
        title: "Crush biscuits",
        time: "1 min",
        detail:
          "Place digestive biscuit in a bag and crush with a rolling pin into a mix of fine crumbs and larger pieces for texture.",
        look: "Mix of fine crumbs and chunky pieces.",
      },
      {
        title: "Assemble",
        time: "2 min",
        detail:
          "Spoon mousse into a glass or bowl. Top with crushed biscuits and a tiny pinch of sea salt. Chill for 10 minutes if time allows, or serve immediately.",
        look: "Layered glass showing caramel swirls, crunchy topping.",
      },
    ],
  },
  {
    id: "hunt_snack2_5",
    name: "Flatbread with Almond Butter and Honey",
    subtitle: "Warm flatbread, almond butter, honey, cinnamon",
    flag: "\ud83c\uddf2\ud83c\udde6",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 210, protein: 16, carbs: 24, fat: 8 },
    cuisineBadge: "Moroccan",
    tip: "Warm the flatbread just before serving so the almond butter melts into it.",
    ingredients: [
      "1 small flatbread or msemen",
      "1.5 tbsp almond butter",
      "1 tsp honey",
      "Pinch of ground cinnamon",
      "Pinch of sea salt flakes",
      "Toasted flaked almonds (optional)",
    ],
    steps: [
      {
        title: "Warm the flatbread",
        time: "2 min",
        detail:
          "Heat a dry pan over medium heat. Warm the flatbread for 30-45 seconds each side until pliable and lightly toasted.",
        look: "Lightly golden, steaming, pliable bread.",
      },
      {
        title: "Spread and top",
        time: "2 min",
        detail:
          "Spread almond butter immediately onto the warm bread so it starts to melt. Drizzle with honey, dust with cinnamon, and finish with a pinch of sea salt and toasted almonds.",
        look: "Melting almond butter with golden honey drizzle.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Fold or roll up and eat while warm. The contrast of warm bread, melting nut butter, and sweet honey is the key.",
        look: "Folded flatbread oozing almond butter at the edges.",
      },
    ],
  },
  {
    id: "hunt_snack2_6",
    name: "Cinnamon Ginger Protein Shake",
    subtitle: "Protein shake with warm spices",
    flag: "\ud83c\uddf0\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 170, protein: 20, carbs: 14, fat: 2 },
    cuisineBadge: "Korean",
    tip: "Blend the spices with the liquid first to avoid clumps in the finished shake.",
    ingredients: [
      "1 scoop vanilla or unflavoured protein powder",
      "250ml unsweetened almond milk or milk of choice",
      "1/2 tsp ground cinnamon",
      "1/4 tsp ground ginger",
      "Pinch of ground cloves",
      "1 tsp honey or maple syrup",
      "3 ice cubes",
      "Pinch of black pepper",
    ],
    steps: [
      {
        title: "Blend spices and liquid",
        time: "1 min",
        detail:
          "Add milk, cinnamon, ginger, cloves, pepper, and honey to a blender. Pulse briefly to combine and dissolve the spices.",
        look: "Speckled, fragrant liquid.",
      },
      {
        title: "Add protein and ice",
        time: "2 min",
        detail:
          "Add protein powder and ice cubes. Blend on high for 30-45 seconds until completely smooth and frothy.",
        look: "Smooth, pale brown shake with a frothy top.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Pour into a tall glass. Dust the top with a pinch of extra cinnamon. Drink immediately while cold and frothy.",
        look: "Creamy shake with cinnamon dust on the foam.",
      },
    ],
  },
  {
    id: "hunt_snack2_7",
    name: "Mango Lassi",
    subtitle: "Mango, yogurt, protein powder, cardamom",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 180, protein: 20, carbs: 14, fat: 4 },
    cuisineBadge: "Indian",
    tip: "Use frozen mango for the thickest, coldest lassi without diluting it with ice.",
    ingredients: [
      "80g frozen mango chunks",
      "100g Greek yogurt",
      "1/2 scoop vanilla protein powder",
      "100ml cold water or milk",
      "2 cardamom pods, seeds only (or 1/4 tsp ground cardamom)",
      "1 tsp honey (optional)",
      "Pinch of saffron strands (optional)",
    ],
    steps: [
      {
        title: "Toast cardamom",
        time: "1 min",
        detail:
          "Crush cardamom seeds with the flat of a knife. If using whole pods, crack open and discard the husks. The aroma should be immediate and intense.",
        look: "Crushed, fragrant seeds releasing essential oils.",
      },
      {
        title: "Blend",
        time: "2 min",
        detail:
          "Combine frozen mango, yogurt, protein powder, water, cardamom, and honey in a blender. Blend on high until completely smooth and thick.",
        look: "Vibrant orange-yellow, thick, and smooth.",
      },
      {
        title: "Serve",
        time: "1 min",
        detail:
          "Pour into a tall glass. Garnish with a few saffron strands or a pinch of cardamom on top. Serve immediately.",
        look: "Bright saffron-orange lassi with golden threads on top.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // LIGHT BREAKFASTS (5) — 200-280 cal
  // ---------------------------------------------------------------------------
  {
    id: "hunt_breakfast_light_1",
    name: "Miso-Glazed Egg Cup",
    subtitle: "Soft-scrambled egg, white miso, furikake, cucumber",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 210, protein: 18, carbs: 10, fat: 11 },
    cuisineBadge: "Japanese",
    tip: "Stir the eggs low and slow — remove from heat while still slightly wet; they'll finish cooking off the pan.",
    ingredients: [
      "2 large eggs",
      "1 tsp white miso paste",
      "1 tsp unsalted butter",
      "1 tbsp furikake seasoning",
      "4 slices Persian cucumber",
      "1 tsp rice vinegar",
      "Pinch of togarashi (optional)",
    ],
    steps: [
      {
        title: "Soft-scramble with miso",
        time: "4 min",
        detail:
          "Whisk eggs with miso paste until smooth. Melt butter in a nonstick pan over low heat. Add eggs and stir continuously with a silicone spatula, forming small, delicate curds. Remove from heat while still slightly glossy.",
        look: "Creamy, pale yellow curds with no browning.",
      },
      {
        title: "Plate and garnish",
        time: "2 min",
        detail:
          "Spoon eggs into a small bowl. Fan cucumber slices alongside, drizzle with rice vinegar. Shower furikake over the eggs and finish with togarashi if using.",
        look: "Golden curds dusted with dark furikake, bright green cucumber.",
      },
    ],
  },
  {
    id: "hunt_breakfast_light_2",
    name: "Turkish Egg Skillet",
    subtitle: "Poached egg on garlic yogurt with Aleppo butter",
    flag: "\ud83c\uddf9\ud83c\uddf7",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 240, protein: 16, carbs: 8, fat: 16 },
    cuisineBadge: "Turkish",
    tip: "Use strained yogurt at room temperature so it doesn't seize when the hot butter hits it.",
    ingredients: [
      "2 large eggs",
      "100g Greek yogurt",
      "1 small clove garlic, grated",
      "10g unsalted butter",
      "1 tsp Aleppo pepper (or 1/2 tsp paprika + pinch chili flake)",
      "1 tsp white vinegar",
      "Fresh dill, small handful",
      "Flaky salt",
    ],
    steps: [
      {
        title: "Poach eggs and prep yogurt",
        time: "5 min",
        detail:
          "Mix yogurt with grated garlic and a pinch of salt; spread onto a shallow plate. Bring a saucepan of water to a gentle simmer, add vinegar, swirl, and slide eggs in one at a time. Poach 3 minutes for runny yolks.",
        look: "Whites fully set, yolks visibly soft under a thin veil.",
      },
      {
        title: "Aleppo butter and serve",
        time: "2 min",
        detail:
          "Lift eggs with a slotted spoon and set on the yogurt bed. Melt butter in a small pan until foaming, stir in Aleppo pepper for 20 seconds. Drizzle the red butter over eggs, top with dill and flaky salt.",
        look: "White eggs on pale yogurt with rivulets of brick-red butter and green dill.",
      },
    ],
  },
  {
    id: "hunt_breakfast_light_3",
    name: "Ricotta Toast with Figs",
    subtitle: "Whipped ricotta, fresh fig, pistachio, honey drizzle",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 265, protein: 14, carbs: 28, fat: 11 },
    cuisineBadge: "Italian",
    tip: "Whip the ricotta with a fork for 30 seconds — the texture should be cloud-like, not grainy.",
    ingredients: [
      "1 slice sourdough bread",
      "80g fresh ricotta",
      "1 fresh fig, quartered",
      "1 tbsp crushed pistachios",
      "1 tsp honey",
      "Pinch of flaky salt",
      "Fresh thyme leaves (optional)",
    ],
    steps: [
      {
        title: "Toast and whip",
        time: "3 min",
        detail:
          "Toast sourdough until deeply golden and crisp. Meanwhile, whip ricotta with a fork until light and airy, season with a pinch of salt.",
        look: "Dark-gold toast, fluffy white ricotta.",
      },
      {
        title: "Assemble",
        time: "2 min",
        detail:
          "Spread ricotta generously on toast. Arrange fig quarters on top, scatter pistachios, drizzle honey, and finish with thyme leaves and flaky salt.",
        look: "Purple-pink figs on white ricotta, green pistachio crumble, golden honey threads.",
      },
    ],
  },
  {
    id: "hunt_breakfast_light_4",
    name: "Smoked Salmon Tartine",
    subtitle: "Pumpernickel, crème fraîche, capers, soft egg",
    flag: "\ud83c\uddf3\ud83c\uddf4",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 270, protein: 22, carbs: 18, fat: 12 },
    cuisineBadge: "Scandinavian",
    tip: "Let the smoked salmon come to room temp for 10 minutes — cold lox tastes muted.",
    ingredients: [
      "1 slice pumpernickel or dark rye bread",
      "60g smoked salmon",
      "1 tbsp crème fraîche",
      "1 large egg, soft-boiled (6 min)",
      "1 tsp capers, drained",
      "Fresh chives, finely sliced",
      "Squeeze of lemon",
      "Cracked black pepper",
    ],
    steps: [
      {
        title: "Soft-boil egg",
        time: "7 min",
        detail:
          "Lower egg into boiling water, cook exactly 6 minutes. Transfer to ice water for 2 minutes, then peel. The yolk should be jammy, not runny.",
        look: "Deep orange, just-set yolk with a slightly translucent center.",
      },
      {
        title: "Build tartine",
        time: "3 min",
        detail:
          "Spread crème fraîche on pumpernickel. Drape salmon in loose folds over the bread. Halve the egg and nestle on top. Scatter capers and chives, finish with lemon and pepper.",
        look: "Coral salmon, golden yolk halves, green chive confetti on dark bread.",
      },
    ],
  },
  {
    id: "hunt_breakfast_light_5",
    name: "Coconut Chia Pudding",
    subtitle: "Coconut milk chia, lime zest, toasted coconut, mango",
    flag: "\ud83c\uddf9\ud83c\udded",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 230, protein: 14, carbs: 22, fat: 10 },
    cuisineBadge: "Thai",
    tip: "Stir chia twice in the first 10 minutes to prevent clumping at the bottom of the jar.",
    ingredients: [
      "3 tbsp chia seeds",
      "150ml light coconut milk",
      "1/2 scoop vanilla protein powder",
      "50g fresh mango, diced",
      "1 tbsp toasted coconut flakes",
      "Zest of 1/2 lime",
      "1 tsp honey or maple syrup",
    ],
    steps: [
      {
        title: "Soak chia overnight",
        time: "5 min + overnight",
        detail:
          "Whisk chia seeds, coconut milk, protein powder, and honey in a jar. Stir well, wait 5 minutes, stir again to break up any clumps. Refrigerate overnight or at least 4 hours.",
        look: "Thick, creamy pudding with evenly suspended seeds.",
      },
      {
        title: "Top and serve",
        time: "2 min",
        detail:
          "Spoon pudding into a bowl. Pile diced mango on top, scatter toasted coconut flakes, and grate lime zest over everything.",
        look: "White pudding, bright orange mango, golden coconut shards, flecks of green zest.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // LIGHT LUNCHES (5) — 280-360 cal
  // ---------------------------------------------------------------------------
  {
    id: "hunt_lunch_light_1",
    name: "Seared Tuna Tataki Salad",
    subtitle: "Rare tuna, ponzu, radish, sesame, micro greens",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 290, protein: 34, carbs: 10, fat: 12 },
    cuisineBadge: "Japanese",
    tip: "Sear on the highest heat possible — you want 30 seconds per side max to keep the center ruby red.",
    ingredients: [
      "120g sushi-grade tuna steak",
      "1 tsp sesame oil",
      "2 tbsp ponzu sauce",
      "4 radishes, thinly sliced",
      "1 cup mixed greens or micro greens",
      "1 tsp sesame seeds",
      "1/2 tsp fresh ginger, grated",
      "1 spring onion, sliced",
    ],
    steps: [
      {
        title: "Sear tuna",
        time: "3 min",
        detail:
          "Pat tuna dry and season with salt. Heat a cast-iron skillet to smoking, add sesame oil. Sear tuna 30 seconds per side. Transfer to a board and slice into 5mm strips against the grain.",
        look: "Deep seared crust with a raw ruby-red interior.",
      },
      {
        title: "Plate salad",
        time: "3 min",
        detail:
          "Toss greens and radish slices with ponzu and ginger. Mound on a plate, fan tuna slices around the greens. Garnish with sesame seeds and spring onion.",
        look: "Pink tuna slices framing a bright, crisp salad mound.",
      },
    ],
  },
  {
    id: "hunt_lunch_light_2",
    name: "Spiced Lamb Lettuce Cups",
    subtitle: "Baharat lamb, pickled onion, tahini, pomegranate",
    flag: "\ud83c\uddf1\ud83c\udde7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 320, protein: 28, carbs: 12, fat: 18 },
    cuisineBadge: "Lebanese",
    tip: "Break the lamb into very small pieces as it cooks — the texture should be more like a hash than mince.",
    ingredients: [
      "100g lean ground lamb",
      "1 tsp baharat spice blend",
      "2 large butter lettuce leaves",
      "1 tbsp tahini, loosened with 1 tbsp water",
      "2 tbsp quick-pickled red onion",
      "1 tbsp pomegranate seeds",
      "Fresh mint leaves",
      "Squeeze of lemon",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Cook spiced lamb",
        time: "6 min",
        detail:
          "Heat a dry nonstick pan over high heat. Add lamb, season with baharat, salt, and pepper. Cook, breaking into fine crumbles, until deeply browned and slightly crispy on the edges.",
        look: "Dark, aromatic crumbles with caramelized edges.",
      },
      {
        title: "Assemble cups",
        time: "3 min",
        detail:
          "Spoon lamb into lettuce cups. Drizzle tahini sauce over the top, scatter pickled onion, pomegranate seeds, and mint. Finish with a squeeze of lemon.",
        look: "Pale green cups holding dark spiced lamb, white tahini, ruby pomegranate jewels.",
      },
    ],
  },
  {
    id: "hunt_lunch_light_3",
    name: "Ceviche Tostada",
    subtitle: "Lime-cured shrimp, avocado crema, radish, cilantro",
    flag: "\ud83c\uddf2\ud83c\uddfd",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 280, protein: 26, carbs: 20, fat: 10 },
    cuisineBadge: "Mexican",
    tip: "Cure the shrimp only 15-20 minutes — longer and the acid will make the texture rubbery.",
    ingredients: [
      "120g raw shrimp, peeled, deveined, diced small",
      "Juice of 2 limes",
      "1/4 avocado",
      "2 tbsp Greek yogurt",
      "2 corn tostada shells",
      "3 radishes, thinly sliced",
      "2 tbsp red onion, finely diced",
      "Fresh cilantro",
      "1 serrano pepper, sliced thin (optional)",
      "Salt",
    ],
    steps: [
      {
        title: "Cure shrimp",
        time: "20 min",
        detail:
          "Toss diced shrimp with lime juice, red onion, and a generous pinch of salt. Refrigerate 15-20 minutes until shrimp are opaque and firm throughout. Drain excess liquid.",
        look: "Shrimp pieces pink-white and opaque, no translucency remaining.",
      },
      {
        title: "Build tostadas",
        time: "3 min",
        detail:
          "Mash avocado with yogurt and a pinch of salt to make crema. Spread onto tostada shells. Pile cured shrimp on top, layer radish slices, cilantro, and serrano if using.",
        look: "Crunchy golden shell with pale green crema, pink shrimp, bright garnishes.",
      },
    ],
  },
  {
    id: "hunt_lunch_light_4",
    name: "Vietnamese Chicken Salad",
    subtitle: "Poached chicken, nuoc cham, herbs, crispy shallots",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 300, protein: 32, carbs: 14, fat: 12 },
    cuisineBadge: "Vietnamese",
    tip: "Poach the chicken gently — a rolling boil will make it tough. The water should barely tremble.",
    ingredients: [
      "120g chicken breast",
      "1 tbsp fish sauce",
      "1 tbsp lime juice",
      "1 tsp sugar or honey",
      "1 bird's eye chili, sliced",
      "1/2 cup shredded cabbage (mix of red and green)",
      "1/4 cup fresh herbs (mint, Thai basil, cilantro)",
      "2 tbsp crispy fried shallots",
      "1 tbsp roasted peanuts, crushed",
    ],
    steps: [
      {
        title: "Poach and shred chicken",
        time: "15 min",
        detail:
          "Place chicken in a small pot, cover with cold water, add a pinch of salt. Bring to a bare simmer, cook 12-14 minutes until cooked through. Rest 5 minutes, then shred with two forks into thin strips.",
        look: "Long, fine white shreds — not chunky cubes.",
      },
      {
        title: "Dress and serve",
        time: "3 min",
        detail:
          "Whisk fish sauce, lime juice, sugar, and chili to make nuoc cham. Toss shredded cabbage and herbs with half the dressing. Pile chicken on top, drizzle remaining dressing, finish with crispy shallots and peanuts.",
        look: "Mound of greens and white chicken, golden shallots, bright herb leaves throughout.",
      },
    ],
  },
  {
    id: "hunt_lunch_light_5",
    name: "Smoky Chickpea Flatbread",
    subtitle: "Harissa chickpeas, labneh, charred pepper, za'atar",
    flag: "\ud83c\uddf5\ud83c\uddf8",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 340, protein: 18, carbs: 38, fat: 12 },
    cuisineBadge: "Palestinian",
    tip: "Blister the pepper directly over a gas flame or under the broiler until the skin is fully blackened.",
    ingredients: [
      "100g canned chickpeas, drained and rinsed",
      "1 tsp harissa paste",
      "1 small flatbread or pita",
      "2 tbsp labneh (or thick Greek yogurt)",
      "1 small sweet pepper",
      "1 tsp za'atar",
      "1 tsp olive oil",
      "Fresh parsley",
      "Squeeze of lemon",
    ],
    steps: [
      {
        title: "Char pepper and cook chickpeas",
        time: "6 min",
        detail:
          "Char the whole pepper over a flame or under the broiler until blistered and soft, about 4 minutes. Set aside. Heat olive oil in a pan, add chickpeas and harissa, toss until warmed through and slightly crispy, about 3 minutes.",
        look: "Blackened pepper skin, red-orange chickpeas with some split skins.",
      },
      {
        title: "Assemble flatbread",
        time: "3 min",
        detail:
          "Warm flatbread briefly in a dry pan. Spread labneh across the surface, pile harissa chickpeas on top. Tear charred pepper into strips and scatter over. Finish with za'atar, parsley, and lemon.",
        look: "White labneh, smoky red chickpeas, charred pepper strips, green za'atar dust.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // LIGHT DINNERS (5) — 300-400 cal
  // ---------------------------------------------------------------------------
  {
    id: "hunt_dinner_light_1",
    name: "Miso-Glazed Cod",
    subtitle: "White miso cod, bok choy, pickled ginger, sesame",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 320, protein: 34, carbs: 18, fat: 10 },
    cuisineBadge: "Japanese",
    tip: "Marinate the cod at least 30 minutes — overnight is ideal. Wipe off excess miso before broiling to prevent burning.",
    ingredients: [
      "140g cod fillet",
      "1 tbsp white miso paste",
      "1 tsp mirin",
      "1 tsp sake or rice wine",
      "1/2 tsp sugar",
      "2 baby bok choy, halved",
      "1 tsp sesame oil",
      "Pickled ginger for garnish",
      "1 tsp sesame seeds",
    ],
    steps: [
      {
        title: "Marinate and broil cod",
        time: "8 min + marinating",
        detail:
          "Mix miso, mirin, sake, and sugar until smooth. Coat cod and marinate 30 minutes to overnight. Wipe off excess paste, place on a lined tray, and broil 6-7 minutes until the top is deeply caramelized and the flesh flakes.",
        look: "Burnished amber-brown glaze with dark spots, fish flaking at the edges.",
      },
      {
        title: "Sear bok choy and plate",
        time: "4 min",
        detail:
          "Heat sesame oil in a hot pan. Place bok choy cut-side down and sear 2 minutes until charred. Flip and wilt 1 minute. Plate bok choy alongside cod, garnish with pickled ginger and sesame seeds.",
        look: "Glossy fish with charred greens, pink ginger, and white sesame.",
      },
    ],
  },
  {
    id: "hunt_dinner_light_2",
    name: "Chicken Paillard",
    subtitle: "Pounded chicken, arugula, shaved parmesan, lemon vinaigrette",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 340, protein: 38, carbs: 6, fat: 18 },
    cuisineBadge: "Italian",
    tip: "Pound the chicken between cling film to an even 1cm thickness — uneven pieces cook unevenly.",
    ingredients: [
      "150g chicken breast, butterflied and pounded thin",
      "1 tsp olive oil",
      "2 cups wild arugula",
      "20g parmesan, shaved with a peeler",
      "1 tbsp lemon juice",
      "1 tbsp extra virgin olive oil",
      "1/2 tsp Dijon mustard",
      "Salt and cracked black pepper",
    ],
    steps: [
      {
        title: "Cook paillard",
        time: "5 min",
        detail:
          "Season pounded chicken with salt and pepper. Heat olive oil in a skillet over high heat until shimmering. Cook chicken 2-3 minutes per side until golden and just cooked through. Rest 2 minutes on a board.",
        look: "Even golden crust on both sides, thin enough to see grill marks clearly.",
      },
      {
        title: "Dress salad and plate",
        time: "3 min",
        detail:
          "Whisk lemon juice, extra virgin olive oil, and Dijon. Toss arugula lightly with half the dressing. Place chicken on a plate, pile arugula on top, scatter parmesan shavings, and drizzle remaining dressing.",
        look: "Golden chicken under a tangle of dark green arugula and pale parmesan curls.",
      },
    ],
  },
  {
    id: "hunt_dinner_light_3",
    name: "Prawn & Zucchini Aglio e Olio",
    subtitle: "Garlic prawns, zucchini noodles, chili, lemon, parsley",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 300, protein: 30, carbs: 12, fat: 14 },
    cuisineBadge: "Italian",
    tip: "Cook the garlic in cool oil and bring the heat up slowly — it should turn golden, never brown.",
    ingredients: [
      "120g raw prawns, peeled and deveined",
      "1 medium zucchini, spiralized or julienned",
      "2 cloves garlic, thinly sliced",
      "1 tbsp olive oil",
      "1/2 tsp red chili flakes",
      "Juice and zest of 1/2 lemon",
      "Fresh parsley, chopped",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Cook garlic and prawns",
        time: "5 min",
        detail:
          "Place garlic slices in a cold pan with olive oil. Heat over medium until garlic is pale gold, about 2 minutes. Increase heat, add prawns and chili flakes, cook 2 minutes per side until pink and curled.",
        look: "Golden garlic chips, pink prawns with charred spots.",
      },
      {
        title: "Add zucchini and finish",
        time: "3 min",
        detail:
          "Add zucchini noodles and toss with tongs for 1-2 minutes — just enough to warm through, not to wilt. Squeeze lemon juice over, toss with zest and parsley. Season and serve immediately.",
        look: "Bright green noodles tangled with pink prawns, golden garlic, red chili flecks.",
      },
    ],
  },
  {
    id: "hunt_dinner_light_4",
    name: "Chermoula Salmon Bowl",
    subtitle: "Herb-marinated salmon, cauliflower rice, preserved lemon",
    flag: "\ud83c\uddf2\ud83c\udde6",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 380, protein: 36, carbs: 14, fat: 20 },
    cuisineBadge: "Moroccan",
    tip: "Blend the chermoula in a mortar and pestle rather than a blender — the rough texture clings to the fish better.",
    ingredients: [
      "130g salmon fillet, skin-on",
      "1 tbsp chermoula (cilantro, cumin, paprika, garlic, olive oil, lemon juice)",
      "150g riced cauliflower",
      "1 tsp olive oil",
      "1 tbsp preserved lemon rind, finely diced",
      "2 tbsp fresh cilantro",
      "1 tbsp sliced almonds, toasted",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Marinate and cook salmon",
        time: "8 min",
        detail:
          "Rub chermoula paste over the salmon flesh side. Heat a nonstick pan over medium-high. Place salmon skin-side down, cook 4 minutes until skin is crispy. Flip, cook 2 minutes more for medium doneness.",
        look: "Crispy dark skin, herb-crusted top with a rosy center visible at the sides.",
      },
      {
        title: "Cook cauliflower rice and plate",
        time: "4 min",
        detail:
          "Heat olive oil in a pan, sauté cauliflower rice 3 minutes until just tender. Stir in preserved lemon and season. Mound in a bowl, set salmon on top, scatter toasted almonds and cilantro.",
        look: "White cauliflower base, herb-crusted coral salmon, golden almonds.",
      },
    ],
  },
  {
    id: "hunt_dinner_light_5",
    name: "Dak-galbi Lettuce Wraps",
    subtitle: "Gochujang chicken thigh, sesame slaw, perilla",
    flag: "\ud83c\uddf0\ud83c\uddf7",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 350, protein: 32, carbs: 18, fat: 16 },
    cuisineBadge: "Korean",
    tip: "Let the chicken sit in the marinade at least 15 minutes — gochujang needs time to penetrate the meat.",
    ingredients: [
      "120g boneless skinless chicken thigh, sliced thin",
      "1 tbsp gochujang",
      "1 tsp soy sauce",
      "1 tsp sesame oil",
      "1 tsp honey",
      "1 cup shredded cabbage",
      "1 tsp rice vinegar",
      "1 tsp sesame seeds",
      "4 large butter lettuce or perilla leaves",
      "2 spring onions, sliced",
    ],
    steps: [
      {
        title: "Marinate and stir-fry chicken",
        time: "8 min",
        detail:
          "Toss sliced chicken with gochujang, soy sauce, half the sesame oil, and honey. Marinate 15 minutes. Stir-fry in a hot skillet over high heat for 5-6 minutes until charred and caramelized at the edges.",
        look: "Glossy, dark-red lacquered chicken with blackened spots.",
      },
      {
        title: "Make slaw and serve",
        time: "3 min",
        detail:
          "Toss shredded cabbage with rice vinegar, remaining sesame oil, and sesame seeds. Lay lettuce cups on a plate, divide chicken among them, top with slaw and spring onions.",
        look: "Bright red chicken in pale green cups with white crunchy slaw.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VEGETARIAN BREAKFASTS (5)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_breakfast_veg_1",
    name: "Shakshuka with Feta",
    subtitle: "Spiced tomato sugo, poached eggs, crumbled feta, za'atar flatbread",
    flag: "\ud83c\uddee\ud83c\uddf1",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 380, protein: 24, carbs: 30, fat: 18 },
    cuisineBadge: "Israeli",
    tip: "Create small wells in the sauce before cracking the eggs so they poach evenly without spreading.",
    ingredients: [
      "3 large eggs",
      "400g tinned crushed tomatoes",
      "1 red bell pepper, diced",
      "1 small onion, diced",
      "2 garlic cloves, sliced",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "1/2 tsp chilli flakes",
      "30g feta cheese, crumbled",
      "1 tbsp olive oil",
      "Fresh parsley",
      "1 small flatbread",
      "1 tsp za'atar",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Build the sugo",
        time: "10 min",
        detail:
          "Heat olive oil in a deep skillet over medium heat. Sauté onion and pepper until softened, about 5 minutes. Add garlic, cumin, paprika, and chilli flakes; cook for 1 minute until fragrant. Pour in crushed tomatoes, season with salt and pepper, and simmer until the sauce thickens and reduces slightly.",
        look: "Rich, brick-red sauce with softened peppers throughout.",
      },
      {
        title: "Poach eggs and finish",
        time: "8 min",
        detail:
          "Use a spoon to create three wells in the sauce. Crack an egg into each well. Cover the skillet and cook on medium-low for 5-7 minutes until the whites are set but yolks are still runny. Scatter crumbled feta over the top and garnish with parsley.",
        look: "Bright white eggs nestled in red sauce with white feta crumbles.",
      },
      {
        title: "Toast flatbread and serve",
        time: "2 min",
        detail:
          "Brush flatbread with a little olive oil and sprinkle with za'atar. Toast in a dry pan or under the grill until golden and puffed. Serve alongside the skillet.",
        look: "Golden flatbread with visible za'atar speckles next to the vibrant skillet.",
      },
    ],
  },
  {
    id: "hunt_breakfast_veg_2",
    name: "Masala Dosa with Chutney",
    subtitle: "Crispy fermented crepe, spiced potato filling, coconut chutney",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 350, protein: 12, carbs: 52, fat: 10 },
    cuisineBadge: "South Indian",
    tip: "Spread the batter in a quick spiral from the centre outward for an even, lacy crepe.",
    ingredients: [
      "1 ready-made dosa batter (120g)",
      "1 medium potato, boiled and roughly mashed",
      "1/2 small onion, sliced",
      "1 green chilli, slit",
      "6 curry leaves",
      "1/2 tsp mustard seeds",
      "1/4 tsp turmeric",
      "1 tsp neutral oil",
      "For chutney: 50g fresh coconut, 1 green chilli, 1cm ginger, 1 tbsp roasted chana dal, salt, water",
    ],
    steps: [
      {
        title: "Make potato filling",
        time: "6 min",
        detail:
          "Heat oil in a pan, pop mustard seeds, add curry leaves and green chilli. Sauté sliced onion until translucent. Add turmeric and mashed potato, mix well, and cook for 2 minutes. Season with salt.",
        look: "Golden, chunky potato mixture with visible curry leaves.",
      },
      {
        title: "Cook dosa and assemble",
        time: "5 min",
        detail:
          "Heat a non-stick or cast-iron pan until very hot. Ladle batter and spread quickly in a circular motion. Drizzle oil around the edges. Cook until the underside is golden and crisp. Place potato filling along the centre and fold the dosa over it.",
        look: "Thin, lacy golden crepe with crispy edges folded over the filling.",
      },
      {
        title: "Blend chutney and serve",
        time: "3 min",
        detail:
          "Blitz coconut, green chilli, ginger, chana dal, salt, and a splash of water until smooth. Serve the dosa immediately with the coconut chutney on the side.",
        look: "Crispy dosa on a plate with a small bowl of white-green chutney.",
      },
    ],
  },
  {
    id: "hunt_breakfast_veg_3",
    name: "Ricotta Hotcakes",
    subtitle: "Fluffy ricotta pancakes, honeycomb butter, blueberry compote",
    flag: "\ud83c\udde6\ud83c\uddfa",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 395, protein: 20, carbs: 44, fat: 16 },
    cuisineBadge: "Australian",
    tip: "Do not overmix the batter — lumps are fine and yield fluffier hotcakes.",
    ingredients: [
      "120g fresh ricotta",
      "2 large eggs, separated",
      "60g plain flour",
      "1/2 tsp baking powder",
      "1 tbsp caster sugar",
      "60ml whole milk",
      "80g blueberries",
      "1 tbsp honey",
      "15g unsalted butter",
      "Pinch of salt",
      "1 tsp vanilla extract",
    ],
    steps: [
      {
        title: "Make batter",
        time: "5 min",
        detail:
          "Whisk egg yolks with ricotta, milk, and vanilla until smooth. Fold in flour, baking powder, sugar, and salt. In a separate bowl, whisk egg whites to soft peaks, then gently fold into the batter in two additions.",
        look: "Light, airy batter with visible volume from the egg whites.",
      },
      {
        title: "Cook hotcakes and compote",
        time: "8 min",
        detail:
          "Melt a knob of butter in a non-stick pan over medium-low heat. Ladle batter to form 3 hotcakes, cooking for 2-3 minutes per side until golden and puffed. In a small saucepan, warm blueberries with a splash of water and 1 tsp honey until they burst into a syrupy compote.",
        look: "Tall, golden-brown hotcakes; glossy purple-blue compote.",
      },
      {
        title: "Plate and finish",
        time: "2 min",
        detail:
          "Stack hotcakes on a warm plate. Spoon blueberry compote over the top. Mix remaining honey with softened butter and place a quenelle on top. Serve immediately.",
        look: "Stacked golden hotcakes with vivid purple compote and a gleaming knob of honeycomb butter.",
      },
    ],
  },
  {
    id: "hunt_breakfast_veg_4",
    name: "Chilaquiles Verdes",
    subtitle: "Crispy tortilla chips, tomatillo salsa, fried eggs, queso fresco",
    flag: "\ud83c\uddf2\ud83c\uddfd",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 390, protein: 22, carbs: 36, fat: 18 },
    cuisineBadge: "Mexican",
    tip: "Add the chips to the salsa just before serving so they stay crispy on top and saucy underneath.",
    ingredients: [
      "4 small corn tortillas, cut into triangles",
      "2 large eggs",
      "200g tomatillos (or jarred salsa verde)",
      "1 jalapeño, deseeded",
      "1 small garlic clove",
      "1/4 small onion",
      "30g queso fresco, crumbled",
      "1 tbsp neutral oil",
      "Fresh coriander",
      "1 tbsp sour cream",
      "Salt",
    ],
    steps: [
      {
        title: "Make salsa verde and fry chips",
        time: "10 min",
        detail:
          "Boil tomatillos and jalapeño for 5 minutes until soft. Blend with garlic, onion, and salt until smooth. In a skillet, fry tortilla triangles in oil until golden and crispy, about 3 minutes. Remove and drain on paper.",
        look: "Bright green salsa; golden, crunchy tortilla chips.",
      },
      {
        title: "Assemble and fry eggs",
        time: "5 min",
        detail:
          "Pour salsa verde into the skillet and bring to a simmer. Add the tortilla chips and toss to coat. In a separate pan, fry 2 eggs sunny-side up until the whites are set.",
        look: "Chips half-submerged in green salsa, slightly softened at the base.",
      },
      {
        title: "Plate and garnish",
        time: "2 min",
        detail:
          "Transfer chilaquiles to a plate, top with fried eggs, crumbled queso fresco, a drizzle of sour cream, and fresh coriander.",
        look: "Vibrant green dish with white cheese crumbles, fried eggs, and bright coriander.",
      },
    ],
  },
  {
    id: "hunt_breakfast_veg_5",
    name: "Turkish Eggs (Çılbır)",
    subtitle: "Poached eggs on whipped garlic yogurt, Aleppo butter",
    flag: "\ud83c\uddf9\ud83c\uddf7",
    tier: "hunt",
    slot: "breakfast",
    macros: { calories: 370, protein: 22, carbs: 24, fat: 20 },
    cuisineBadge: "Turkish",
    tip: "Add a splash of vinegar to the poaching water and create a gentle whirlpool for perfectly shaped eggs.",
    ingredients: [
      "2 large eggs",
      "150g Greek yogurt",
      "1 small garlic clove, finely grated",
      "20g unsalted butter",
      "1 tsp Aleppo pepper (or 1/2 tsp paprika + pinch chilli flakes)",
      "1 tbsp white vinegar",
      "1 slice sourdough bread, toasted",
      "Fresh dill",
      "Flaky salt",
    ],
    steps: [
      {
        title: "Prepare yogurt base",
        time: "3 min",
        detail:
          "Stir grated garlic into Greek yogurt with a pinch of salt. Spread the mixture onto a shallow bowl or plate, creating a well in the centre. Allow it to come to room temperature.",
        look: "Smooth, snow-white yogurt with a shallow depression in the centre.",
      },
      {
        title: "Poach eggs",
        time: "5 min",
        detail:
          "Bring a pot of water to a gentle simmer and add vinegar. Create a slow whirlpool and crack each egg into the centre. Poach for 3 minutes for runny yolks. Remove with a slotted spoon and drain on a paper towel.",
        look: "Neat, compact eggs with opaque whites and visible yolk beneath.",
      },
      {
        title: "Make Aleppo butter and plate",
        time: "3 min",
        detail:
          "Melt butter in a small pan until it foams. Add Aleppo pepper and swirl for 30 seconds — do not let it burn. Place poached eggs on the yogurt, drizzle the red butter over the top, and garnish with dill and flaky salt. Serve with toasted sourdough.",
        look: "White yogurt, pale eggs, vivid red-orange butter streaks, green dill.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VEGETARIAN LUNCHES (5)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_lunch_veg_1",
    name: "Paneer Tikka Wrap",
    subtitle: "Charred tandoori paneer, mint raita, pickled onion, naan wrap",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 480, protein: 28, carbs: 40, fat: 22 },
    cuisineBadge: "Indian",
    tip: "Pat the paneer very dry before marinating — surface moisture prevents charring.",
    ingredients: [
      "150g paneer, cubed",
      "2 tbsp Greek yogurt",
      "1 tsp garam masala",
      "1 tsp Kashmiri chilli powder",
      "1/2 tsp turmeric",
      "1 tbsp lemon juice",
      "1 garlic clove, grated",
      "1cm ginger, grated",
      "1 naan bread",
      "1/4 red onion, thinly sliced",
      "1 tbsp red wine vinegar",
      "For raita: 3 tbsp yogurt, fresh mint, pinch cumin",
      "Salt",
    ],
    steps: [
      {
        title: "Marinate and char paneer",
        time: "10 min",
        detail:
          "Mix yogurt, garam masala, chilli powder, turmeric, lemon juice, garlic, and ginger. Toss paneer cubes in the marinade. Heat a cast-iron pan or griddle until smoking hot. Cook paneer for 2-3 minutes per side, pressing down to get deep char marks. Quick-pickle onion slices in red wine vinegar while paneer cooks.",
        look: "Paneer cubes with dark, blistered edges and vivid orange marinade.",
      },
      {
        title: "Warm naan and make raita",
        time: "3 min",
        detail:
          "Warm the naan in a dry pan for 30 seconds per side until pliable. Stir chopped mint and cumin into yogurt with a pinch of salt for the raita.",
        look: "Soft, pliable naan with light char spots; smooth green-flecked raita.",
      },
      {
        title: "Assemble wrap",
        time: "2 min",
        detail:
          "Spread raita down the centre of the naan. Pile charred paneer on top, scatter pickled onions over, and roll tightly. Slice in half on the diagonal.",
        look: "Tight wrap sliced to reveal orange paneer, pink onions, and white raita.",
      },
    ],
  },
  {
    id: "hunt_lunch_veg_2",
    name: "Halloumi & Lentil Bowl",
    subtitle: "Seared halloumi, warm Puy lentils, roasted beets, tahini dressing",
    flag: "\ud83c\uddf1\ud83c\udde7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 470, protein: 30, carbs: 38, fat: 22 },
    cuisineBadge: "Levantine",
    tip: "Sear halloumi in a dry pan — it releases enough of its own fat for a perfect golden crust.",
    ingredients: [
      "100g halloumi, sliced into 4 slabs",
      "120g cooked Puy lentils",
      "1 medium beetroot, roasted and quartered",
      "30g rocket",
      "1 tbsp tahini",
      "1 tbsp lemon juice",
      "1 tbsp warm water",
      "1 tsp olive oil",
      "1 tsp red wine vinegar",
      "1/2 tsp cumin",
      "Fresh parsley",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Warm lentils and sear halloumi",
        time: "8 min",
        detail:
          "Warm lentils in a small pan with olive oil, red wine vinegar, cumin, salt, and pepper until heated through. Meanwhile, heat a dry non-stick pan over high heat and sear halloumi slabs for 2 minutes per side until deeply golden and crispy.",
        look: "Deep golden-brown halloumi; glossy, earthy lentils.",
      },
      {
        title: "Make tahini dressing",
        time: "2 min",
        detail:
          "Whisk tahini with lemon juice and warm water until smooth and pourable. Season with a pinch of salt.",
        look: "Smooth, pale cream dressing that drizzles easily.",
      },
      {
        title: "Compose the bowl",
        time: "2 min",
        detail:
          "Arrange rocket on the base of a wide bowl. Spoon warm lentils in the centre, arrange roasted beet quarters and seared halloumi around. Drizzle with tahini dressing and scatter with parsley.",
        look: "Jewel-toned bowl: deep purple beets, golden halloumi, dark lentils, green rocket.",
      },
    ],
  },
  {
    id: "hunt_lunch_veg_3",
    name: "Tofu Bánh Mì",
    subtitle: "Lemongrass tofu, pickled daikon and carrot, chilli mayo, baguette",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 420, protein: 24, carbs: 48, fat: 14 },
    cuisineBadge: "Vietnamese",
    tip: "Press the tofu for 15 minutes under a heavy plate to remove moisture before marinating.",
    ingredients: [
      "150g extra-firm tofu, sliced into strips",
      "1 tbsp soy sauce",
      "1 tsp lemongrass paste",
      "1 tsp sriracha",
      "1 tsp maple syrup",
      "1 small baguette (or demi-baguette)",
      "1 small carrot, julienned",
      "50g daikon, julienned",
      "2 tbsp rice vinegar",
      "1 tsp sugar",
      "1 tbsp mayonnaise",
      "1 tsp sriracha (for chilli mayo)",
      "Fresh coriander and sliced jalapeño",
      "1 tsp neutral oil",
    ],
    steps: [
      {
        title: "Quick-pickle vegetables and marinate tofu",
        time: "10 min",
        detail:
          "Toss julienned carrot and daikon with rice vinegar, sugar, and a pinch of salt. Set aside. Mix soy sauce, lemongrass paste, sriracha, and maple syrup. Toss tofu strips in the marinade and let sit for 5 minutes.",
        look: "Bright orange and white pickles; tofu glistening with amber marinade.",
      },
      {
        title: "Sear tofu",
        time: "6 min",
        detail:
          "Heat oil in a non-stick pan over medium-high heat. Sear tofu strips for 2-3 minutes per side until deeply caramelized and crispy at the edges. Pour any remaining marinade into the pan for the last 30 seconds to glaze.",
        look: "Dark golden-brown tofu with lacquered, sticky edges.",
      },
      {
        title: "Build the bánh mì",
        time: "3 min",
        detail:
          "Slice the baguette lengthwise without cutting all the way through. Toast lightly. Mix mayonnaise with sriracha and spread inside. Layer tofu, drained pickled vegetables, sliced jalapeño, and fresh coriander. Press gently to close.",
        look: "Overstuffed baguette with visible layers of caramelised tofu and bright pickles.",
      },
    ],
  },
  {
    id: "hunt_lunch_veg_4",
    name: "Spanakopita Galette",
    subtitle: "Free-form filo pie, spinach, feta, dill, pine nuts",
    flag: "\ud83c\uddec\ud83c\uddf7",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 410, protein: 22, carbs: 32, fat: 22 },
    cuisineBadge: "Greek",
    tip: "Brush each filo sheet generously with olive oil — it creates distinct flaky layers when baked.",
    ingredients: [
      "4 sheets filo pastry",
      "200g fresh spinach",
      "80g feta cheese, crumbled",
      "2 spring onions, sliced",
      "1 large egg, beaten",
      "2 tbsp fresh dill, chopped",
      "1 tbsp pine nuts",
      "1 tbsp olive oil (plus extra for brushing)",
      "1/4 tsp nutmeg",
      "Zest of 1/2 lemon",
      "Salt and pepper",
    ],
    steps: [
      {
        title: "Prepare filling",
        time: "6 min",
        detail:
          "Wilt spinach in a pan with a splash of water, then squeeze out all excess moisture. Chop roughly and mix with crumbled feta, spring onions, dill, lemon zest, nutmeg, half the beaten egg, salt, and pepper.",
        look: "Deep green mixture with white feta crumbles and specks of dill.",
      },
      {
        title: "Assemble galette",
        time: "5 min",
        detail:
          "Layer filo sheets on a lined baking tray, brushing each with olive oil and offsetting them at angles to create a rough circle. Pile the spinach filling in the centre, leaving a 6cm border. Fold the edges up and over, pleating as you go. Brush the pastry border with remaining egg and scatter pine nuts on the filling.",
        look: "Rustic, open-topped pie with golden pastry pleats and green centre.",
      },
      {
        title: "Bake and serve",
        time: "18 min",
        detail:
          "Bake at 190°C for 16-18 minutes until the filo is deep golden and shatteringly crisp. Let cool for 2 minutes before slicing into wedges.",
        look: "Deeply golden, flaky pastry edges with bright green filling and toasted pine nuts.",
      },
    ],
  },
  {
    id: "hunt_lunch_veg_5",
    name: "Tempeh Larb Lettuce Cups",
    subtitle: "Spicy crumbled tempeh, toasted rice powder, herbs, lime",
    flag: "\ud83c\uddf9\ud83c\udded",
    tier: "hunt",
    slot: "lunch",
    macros: { calories: 360, protein: 26, carbs: 24, fat: 18 },
    cuisineBadge: "Thai",
    tip: "Toast the rice in a dry pan until deep golden before grinding — it adds the signature nutty crunch.",
    ingredients: [
      "150g tempeh, crumbled into small pieces",
      "1 tbsp soy sauce",
      "1 tbsp lime juice",
      "1 tsp fish-sauce-style soy (or mushroom sauce)",
      "1 tsp chilli flakes",
      "1 tsp brown sugar",
      "2 tbsp toasted rice powder (dry-fry jasmine rice and grind)",
      "2 shallots, thinly sliced",
      "Fresh mint, coriander, and Thai basil",
      "6 butter lettuce cups",
      "1 tsp neutral oil",
    ],
    steps: [
      {
        title: "Cook tempeh",
        time: "7 min",
        detail:
          "Heat oil in a wok over high heat. Add crumbled tempeh and stir-fry for 4-5 minutes until golden and crispy at the edges. Add soy sauce, lime juice, mushroom sauce, chilli flakes, and brown sugar. Toss until the tempeh is evenly coated and the sauce has been absorbed.",
        look: "Golden, crispy tempeh crumbles glistening with a dark glaze.",
      },
      {
        title: "Finish and serve",
        time: "3 min",
        detail:
          "Remove from heat. Toss in sliced shallots, most of the toasted rice powder, and torn herbs. Spoon mixture into butter lettuce cups. Sprinkle remaining rice powder on top and serve with lime wedges.",
        look: "Bright green cups filled with golden tempeh, vivid herbs, and a dusting of toasted rice.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VEGETARIAN DINNERS (5)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_dinner_veg_1",
    name: "Cacio e Pepe with Crispy Egg",
    subtitle: "Pecorino-black pepper pasta, olive-oil fried egg, toasted breadcrumbs",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 510, protein: 26, carbs: 52, fat: 22 },
    cuisineBadge: "Italian",
    tip: "Toss the pasta off-heat to prevent the cheese from clumping into a grainy sauce.",
    ingredients: [
      "100g tonnarelli or spaghetti",
      "50g Pecorino Romano, finely grated",
      "1.5 tsp freshly cracked black pepper",
      "1 large egg",
      "1 tbsp olive oil",
      "2 tbsp panko breadcrumbs",
      "1 small garlic clove, minced",
      "Salt",
    ],
    steps: [
      {
        title: "Cook pasta and bloom pepper",
        time: "10 min",
        detail:
          "Cook pasta in well-salted water until 1 minute short of al dente, reserving 120ml pasta water. Meanwhile, toast cracked black pepper in a dry pan for 1 minute until fragrant. Add a ladle of pasta water and simmer to reduce by half.",
        look: "Fragrant, slightly reduced peppery liquid in the pan.",
      },
      {
        title: "Emulsify cheese sauce",
        time: "4 min",
        detail:
          "Remove pepper pan from heat. Transfer drained pasta into the pan and toss vigorously. Add Pecorino a little at a time, tossing constantly and adding splashes of reserved pasta water to create a glossy, creamy emulsion. Work quickly off-heat.",
        look: "Silky, glossy pasta coated in a pale, creamy sauce with visible pepper specks.",
      },
      {
        title: "Fry egg and finish",
        time: "3 min",
        detail:
          "Heat olive oil in a small pan over high heat. Fry the egg until the edges are lacy and crispy but the yolk is still runny. In the same pan, quickly toast panko with garlic until golden. Plate the pasta, top with the crispy egg, and scatter toasted breadcrumbs.",
        look: "Creamy white pasta crowned with a crispy-edged egg and golden crumbs.",
      },
    ],
  },
  {
    id: "hunt_dinner_veg_2",
    name: "Chickpea & Sweet Potato Tagine",
    subtitle: "Moroccan spiced stew, preserved lemon, herb couscous, yogurt",
    flag: "\ud83c\uddf2\ud83c\udde6",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 460, protein: 18, carbs: 62, fat: 14 },
    cuisineBadge: "Moroccan",
    tip: "Add the preserved lemon at the very end to keep its bright, floral flavour from becoming bitter.",
    ingredients: [
      "200g tinned chickpeas, drained",
      "1 medium sweet potato, cubed",
      "200g tinned chopped tomatoes",
      "1 small onion, diced",
      "2 garlic cloves, minced",
      "1 tsp ras el hanout",
      "1/2 tsp cinnamon",
      "1/2 tsp cumin",
      "1 strip preserved lemon rind, finely diced",
      "80g couscous",
      "1 tbsp olive oil",
      "2 tbsp Greek yogurt",
      "Fresh coriander and mint",
      "Salt",
    ],
    steps: [
      {
        title: "Build the tagine",
        time: "12 min",
        detail:
          "Heat olive oil in a heavy pot over medium heat. Sauté onion until softened. Add garlic, ras el hanout, cinnamon, and cumin; cook for 1 minute. Add sweet potato cubes, chickpeas, and chopped tomatoes. Add enough water to just cover, bring to a simmer, and cook covered for 15-18 minutes until sweet potato is tender.",
        look: "Rich, orange-red stew with tender sweet potato and plump chickpeas.",
      },
      {
        title: "Prepare couscous",
        time: "5 min",
        detail:
          "Place couscous in a bowl, pour over boiling water to just cover, add a pinch of salt, and cover with a plate. Let stand for 5 minutes, then fluff with a fork and stir through chopped coriander and mint.",
        look: "Fluffy, herb-flecked couscous with visible green specks.",
      },
      {
        title: "Finish and plate",
        time: "2 min",
        detail:
          "Stir diced preserved lemon into the tagine. Serve in a wide bowl over the herb couscous, topped with a spoonful of Greek yogurt and extra fresh herbs.",
        look: "Vibrant stew over pale couscous with a white dollop of yogurt and green herbs.",
      },
    ],
  },
  {
    id: "hunt_dinner_veg_3",
    name: "Mapo Tofu",
    subtitle: "Silken tofu in numbing chilli bean sauce, Sichuan peppercorn, steamed rice",
    flag: "\ud83c\udde8\ud83c\uddf3",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 420, protein: 22, carbs: 48, fat: 16 },
    cuisineBadge: "Sichuan",
    tip: "Slide the tofu in gently and never stir — swirl the pan instead to keep the cubes intact.",
    ingredients: [
      "300g silken tofu, cubed",
      "2 tbsp doubanjiang (chilli bean paste)",
      "1 tbsp fermented black beans, rinsed and chopped",
      "2 garlic cloves, minced",
      "1cm ginger, minced",
      "2 spring onions, sliced",
      "1 tsp Sichuan peppercorns, ground",
      "1 tsp soy sauce",
      "1/2 tsp sugar",
      "1 tsp cornstarch mixed with 2 tbsp water",
      "1 tbsp neutral oil",
      "120g steamed jasmine rice",
    ],
    steps: [
      {
        title: "Build the sauce",
        time: "5 min",
        detail:
          "Heat oil in a wok over medium heat. Add doubanjiang and fermented black beans, stir-fry for 2 minutes until the oil turns a deep red and becomes fragrant. Add garlic and ginger, cook for 30 seconds. Pour in 150ml water, soy sauce, and sugar; bring to a simmer.",
        look: "Deep red, glossy, aromatic sauce pooling in the wok.",
      },
      {
        title: "Add tofu and thicken",
        time: "5 min",
        detail:
          "Gently slide tofu cubes into the sauce. Swirl the wok — do not stir — and simmer for 3 minutes. Drizzle in the cornstarch slurry around the edges, swirl again until the sauce thickens and clings to the tofu.",
        look: "Glistening cubes of ivory tofu in a thick, fiery red sauce.",
      },
      {
        title: "Finish and serve",
        time: "2 min",
        detail:
          "Sprinkle ground Sichuan peppercorn and sliced spring onions over the top. Serve immediately alongside steamed jasmine rice.",
        look: "Vivid red dish with white tofu, green onion confetti, over a bowl of white rice.",
      },
    ],
  },
  {
    id: "hunt_dinner_veg_4",
    name: "Black Bean Enchiladas",
    subtitle: "Corn tortillas, smoky black bean filling, roasted tomatillo sauce, queso Oaxaca",
    flag: "\ud83c\uddf2\ud83c\uddfd",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 480, protein: 24, carbs: 54, fat: 18 },
    cuisineBadge: "Mexican",
    tip: "Briefly fry each tortilla in oil before rolling — it prevents cracking and adds richness.",
    ingredients: [
      "3 small corn tortillas",
      "200g cooked black beans",
      "80g queso Oaxaca (or mozzarella), shredded",
      "200g tomatillos (or jarred salsa verde)",
      "1 jalapeño",
      "1 small garlic clove",
      "1/2 small onion, diced",
      "1 tsp cumin",
      "1 tsp smoked paprika",
      "1 tbsp neutral oil",
      "2 tbsp sour cream",
      "Fresh coriander",
      "Salt",
    ],
    steps: [
      {
        title: "Make sauce and filling",
        time: "10 min",
        detail:
          "Char tomatillos and jalapeño under a hot grill until blackened, about 5 minutes. Blend with garlic and a pinch of salt until smooth. In a pan, sauté onion until soft, add cumin, smoked paprika, and black beans. Mash half the beans roughly and stir to combine into a thick, cohesive filling.",
        look: "Chunky-smooth black bean filling; bright green, slightly charred salsa.",
      },
      {
        title: "Roll and bake enchiladas",
        time: "15 min",
        detail:
          "Briefly fry each tortilla in a splash of oil for 10 seconds per side. Fill each with the bean mixture and a pinch of cheese, roll tightly, and place seam-side down in a baking dish. Pour tomatillo sauce over the top and scatter remaining cheese. Bake at 190°C for 12-15 minutes until bubbling.",
        look: "Three rolled tortillas under a bubbling, golden-green cheese crust.",
      },
      {
        title: "Garnish and serve",
        time: "2 min",
        detail:
          "Drizzle sour cream over the hot enchiladas and scatter with fresh coriander. Serve directly from the baking dish.",
        look: "Golden, saucy enchiladas with white sour cream streaks and green coriander.",
      },
    ],
  },
  {
    id: "hunt_dinner_veg_5",
    name: "Mushroom Bourguignon",
    subtitle: "Red wine braised mushrooms, pearl onions, herb mashed potato",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "dinner",
    macros: { calories: 450, protein: 16, carbs: 50, fat: 18 },
    cuisineBadge: "French",
    tip: "Do not crowd the mushrooms — cook in batches so they sear rather than steam.",
    ingredients: [
      "250g mixed mushrooms (cremini, shiitake, king oyster), halved or quartered",
      "100g pearl onions, peeled",
      "1 medium carrot, diced",
      "2 garlic cloves, minced",
      "120ml red wine",
      "150ml vegetable stock",
      "1 tbsp tomato paste",
      "1 tsp fresh thyme leaves",
      "1 bay leaf",
      "1 tbsp olive oil",
      "1 tbsp plain flour",
      "200g potatoes, peeled and cubed",
      "15g butter",
      "2 tbsp milk",
      "Salt and pepper",
      "Fresh parsley",
    ],
    steps: [
      {
        title: "Sear mushrooms and build braise",
        time: "12 min",
        detail:
          "Heat olive oil in a heavy pot over high heat. Sear mushrooms in batches until deeply golden, about 3 minutes per batch. Remove and set aside. In the same pot, cook pearl onions and carrot until lightly browned. Add garlic and tomato paste, cook for 1 minute. Sprinkle in flour and stir. Deglaze with red wine, scraping the fond. Add stock, thyme, and bay leaf. Return mushrooms, bring to a simmer, cover, and cook for 15 minutes.",
        look: "Rich, dark burgundy stew with glossy, deeply browned mushrooms.",
      },
      {
        title: "Make mashed potato",
        time: "12 min",
        detail:
          "Boil potatoes in salted water until completely tender, about 12 minutes. Drain, add butter and milk, and mash until smooth and creamy. Season with salt and pepper.",
        look: "Smooth, velvety mashed potato with no lumps.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Spoon mashed potato into a wide bowl. Ladle the bourguignon alongside, making sure to include pearl onions and sauce. Garnish with chopped parsley.",
        look: "Dark, glossy stew beside a cloud of white mash, bright green parsley.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VEGETARIAN SNACKS — SNACK 1 (2)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_snack1_veg_1",
    name: "Whipped Ricotta Crostini",
    subtitle: "Whipped ricotta, honey, toasted walnuts, thyme on sourdough",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 200, protein: 10, carbs: 18, fat: 10 },
    cuisineBadge: "Italian",
    tip: "Whip the ricotta in a food processor for 2 full minutes until it becomes mousse-like.",
    ingredients: [
      "80g fresh ricotta",
      "2 thin slices sourdough bread",
      "1 tbsp walnuts, roughly chopped",
      "1 tsp honey",
      "Fresh thyme leaves",
      "Flaky salt",
      "Cracked black pepper",
    ],
    steps: [
      {
        title: "Toast bread and walnuts",
        time: "3 min",
        detail:
          "Brush sourdough slices with a touch of olive oil and toast under a grill or in a dry pan until golden and crisp. Toast walnuts in a dry pan for 2 minutes, shaking frequently, until fragrant.",
        look: "Golden, crunchy crostini; lightly browned walnut pieces.",
      },
      {
        title: "Whip ricotta and assemble",
        time: "3 min",
        detail:
          "Whip ricotta with a pinch of salt until light and airy (use a food processor or whisk vigorously). Spread generously onto each crostini. Top with toasted walnuts, a drizzle of honey, fresh thyme leaves, flaky salt, and cracked pepper.",
        look: "Cloud-white ricotta on golden toast, glistening honey drizzle, green thyme.",
      },
    ],
  },
  {
    id: "hunt_snack1_veg_2",
    name: "Spiced Paneer Bites",
    subtitle: "Tandoori-spiced paneer cubes, mint chutney dip",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 210, protein: 16, carbs: 6, fat: 14 },
    cuisineBadge: "Indian",
    tip: "Use a very hot pan and do not move the paneer for 2 minutes — let it form a proper crust.",
    ingredients: [
      "100g paneer, cubed into 2cm pieces",
      "1 tbsp Greek yogurt",
      "1/2 tsp Kashmiri chilli powder",
      "1/2 tsp garam masala",
      "1/4 tsp turmeric",
      "Squeeze of lemon",
      "For mint chutney: handful of mint, 1 green chilli, 1 tbsp yogurt, pinch of salt",
      "1 tsp neutral oil",
    ],
    steps: [
      {
        title: "Marinate and sear paneer",
        time: "8 min",
        detail:
          "Mix yogurt, chilli powder, garam masala, turmeric, and lemon juice. Coat paneer cubes thoroughly. Heat oil in a non-stick pan over high heat. Sear paneer for 2 minutes per side until charred and deeply coloured.",
        look: "Vivid orange-red cubes with dark, blistered char marks.",
      },
      {
        title: "Blend chutney and serve",
        time: "2 min",
        detail:
          "Blitz mint, green chilli, yogurt, and salt into a smooth chutney. Pile paneer bites on a small plate with the chutney alongside for dipping.",
        look: "Bright orange paneer cubes beside a small dish of vibrant green chutney.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // VEGETARIAN SNACKS — SNACK 2 (2)
  // ---------------------------------------------------------------------------
  {
    id: "hunt_snack2_veg_1",
    name: "Crispy Chickpea Bowl",
    subtitle: "Roasted spiced chickpeas, lemon yogurt, dukkah",
    flag: "\ud83c\uddea\ud83c\uddec",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 190, protein: 12, carbs: 22, fat: 6 },
    cuisineBadge: "Egyptian",
    tip: "Pat chickpeas completely dry and roast at high heat for maximum crunch.",
    ingredients: [
      "150g tinned chickpeas, drained and patted dry",
      "1 tsp olive oil",
      "1/2 tsp cumin",
      "1/2 tsp smoked paprika",
      "Pinch of cayenne",
      "2 tbsp Greek yogurt",
      "Squeeze of lemon",
      "1 tsp dukkah",
      "Salt",
    ],
    steps: [
      {
        title: "Roast chickpeas",
        time: "18 min",
        detail:
          "Toss dry chickpeas with olive oil, cumin, smoked paprika, cayenne, and salt. Spread on a lined baking tray in a single layer. Roast at 200°C for 15-18 minutes, shaking halfway, until golden and crunchy.",
        look: "Deep golden, shrunken chickpeas that rattle when shaken on the tray.",
      },
      {
        title: "Assemble and serve",
        time: "2 min",
        detail:
          "Mix yogurt with a squeeze of lemon and a pinch of salt. Spoon into a small bowl, pile crispy chickpeas on top, and sprinkle with dukkah. Eat immediately while the chickpeas are still warm and crunchy.",
        look: "Crunchy golden chickpeas over white yogurt with a dusting of brown dukkah.",
      },
    ],
  },
  {
    id: "hunt_snack2_veg_2",
    name: "Stuffed Medjool Dates",
    subtitle: "Dates filled with goat cheese, pistachios, orange blossom honey",
    flag: "\ud83c\uddf1\ud83c\udde7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 180, protein: 8, carbs: 24, fat: 7 },
    cuisineBadge: "Levantine",
    tip: "Use the freshest, softest Medjool dates you can find — they should feel like caramel.",
    ingredients: [
      "4 large Medjool dates, pitted",
      "30g soft goat cheese",
      "1 tbsp pistachios, roughly chopped",
      "1 tsp honey",
      "Pinch of orange blossom water (optional)",
      "Flaky salt",
    ],
    steps: [
      {
        title: "Stuff the dates",
        time: "3 min",
        detail:
          "Slit each date lengthwise and open gently. Fill each with a teaspoon of goat cheese, pressing it in so it sits flush. If using orange blossom water, mix a drop into the honey.",
        look: "Plump dates split open to reveal a line of white cheese.",
      },
      {
        title: "Garnish and serve",
        time: "2 min",
        detail:
          "Arrange stuffed dates on a small plate. Press chopped pistachios into the exposed cheese. Drizzle with honey and finish with a pinch of flaky salt.",
        look: "Glossy brown dates with white cheese, green pistachio crumbs, and a honey sheen.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAIRY-FREE SNACKS — SNACK 1 (5)
  // ---------------------------------------------------------------------------
  {
    id: "hu_snk1_df_1",
    name: "Heirloom Tomato Bruschetta",
    subtitle: "Marinated heirloom tomatoes, aged balsamic, basil oil on ciabatta",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 180, protein: 6, carbs: 22, fat: 8 },
    cuisineBadge: "Italian",
    tip: "Salt the tomatoes 10 minutes ahead and drain the liquid — this keeps the bread crisp.",
    ingredients: [
      "2 slices ciabatta bread",
      "150g mixed heirloom tomatoes, diced",
      "1 tbsp extra-virgin olive oil",
      "1 tsp aged balsamic vinegar",
      "1 small garlic clove, halved",
      "6 fresh basil leaves",
      "Flaky salt and cracked black pepper",
      "Pinch of red pepper flakes",
    ],
    steps: [
      {
        title: "Prepare tomatoes",
        time: "12 min",
        detail:
          "Dice tomatoes into small, even pieces. Toss with a pinch of flaky salt and leave in a fine-mesh sieve for 10 minutes to drain excess liquid. Discard the liquid.",
        look: "Jewel-toned tomato dice, no pooling liquid.",
      },
      {
        title: "Toast ciabatta",
        time: "3 min",
        detail:
          "Brush ciabatta slices with a thin coat of olive oil. Grill or toast in a hot pan until deeply golden and crisp on both sides. Immediately rub the cut garlic clove across the hot surface.",
        look: "Deep golden toast with visible grill marks.",
      },
      {
        title: "Assemble and serve",
        time: "2 min",
        detail:
          "Toss drained tomatoes with remaining olive oil, balsamic, red pepper flakes, and torn basil. Spoon generously onto the toasts. Finish with flaky salt and cracked pepper. Serve immediately.",
        look: "Vivid red and yellow tomato mound on golden bread, glistening with balsamic.",
      },
    ],
  },
  {
    id: "hu_snk1_df_2",
    name: "Miso-Glazed Eggplant Bites",
    subtitle: "Roasted eggplant rounds, sweet white miso glaze, sesame, shiso",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 160, protein: 5, carbs: 18, fat: 8 },
    cuisineBadge: "Japanese",
    tip: "Score the flesh in a crosshatch before roasting — it absorbs the glaze far more evenly.",
    ingredients: [
      "1 medium Japanese eggplant, cut into 2cm rounds",
      "1 tbsp white miso paste",
      "1 tsp mirin",
      "1 tsp rice vinegar",
      "1 tsp maple syrup",
      "1 tsp toasted sesame oil",
      "1 tsp toasted sesame seeds",
      "2 shiso or basil leaves, thinly sliced",
      "1 tsp neutral oil for roasting",
    ],
    steps: [
      {
        title: "Roast eggplant",
        time: "14 min",
        detail:
          "Score the cut surface of each eggplant round in a crosshatch pattern. Brush with neutral oil and season with salt. Roast cut-side down at 200°C for 10 minutes, then flip and roast 4 more minutes until soft and golden.",
        look: "Deeply caramelised crosshatch pattern, flesh yielding to touch.",
      },
      {
        title: "Make glaze and finish",
        time: "3 min",
        detail:
          "Whisk miso, mirin, rice vinegar, maple syrup, and sesame oil until smooth. Brush generously over hot eggplant rounds and flash under the grill for 1 minute until the glaze bubbles. Top with sesame seeds and sliced shiso.",
        look: "Glossy, caramel-coloured glaze with white sesame seeds and green shiso.",
      },
    ],
  },
  {
    id: "hu_snk1_df_3",
    name: "Vietnamese Summer Rolls",
    subtitle: "Prawn and herb rice paper rolls, hoisin-peanut dipping sauce",
    flag: "\ud83c\uddfb\ud83c\uddf3",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 210, protein: 16, carbs: 24, fat: 6 },
    cuisineBadge: "Vietnamese",
    tip: "Dip rice paper for only 3 seconds — it continues to soften as you roll.",
    ingredients: [
      "3 rice paper wrappers (22cm)",
      "80g cooked prawns, halved lengthwise",
      "30g rice vermicelli, cooked and cooled",
      "1/4 cucumber, julienned",
      "1 small carrot, julienned",
      "Handful of fresh mint and Thai basil",
      "3 butter lettuce leaves",
      "For sauce: 1 tbsp hoisin sauce, 1 tsp peanut butter, 1 tsp sriracha, squeeze of lime, warm water to thin",
    ],
    steps: [
      {
        title: "Prep fillings",
        time: "8 min",
        detail:
          "Julienne cucumber and carrot into thin matchsticks. Cook rice vermicelli per packet instructions, drain and cool under cold water. Halve prawns lengthwise so they lie flat. Wash and dry herbs.",
        look: "Neat piles of colourful vegetables and herbs ready for rolling.",
      },
      {
        title: "Roll summer rolls",
        time: "6 min",
        detail:
          "Dip one rice paper in warm water for 3 seconds, lay on a damp board. Place a lettuce leaf in the centre, add a small nest of vermicelli, carrot, cucumber, and herbs. Fold the bottom edge up, tuck in the sides, then place 3-4 prawn halves cut-side down in a row and roll tightly to finish. Repeat for remaining wrappers.",
        look: "Translucent rolls showing pink prawns and green herbs through the wrapper.",
      },
      {
        title: "Make dipping sauce and serve",
        time: "2 min",
        detail:
          "Stir together hoisin, peanut butter, sriracha, and lime juice. Add warm water a teaspoon at a time until it reaches a smooth dipping consistency. Halve each roll on an angle and serve with the sauce alongside.",
        look: "Crystal-clear rolls cut on the bias, vibrant cross-section, amber sauce in a small dish.",
      },
    ],
  },
  {
    id: "hu_snk1_df_4",
    name: "Sesame-Crusted Tofu Bites",
    subtitle: "Crispy pressed tofu, black and white sesame crust, sweet chilli dip",
    flag: "\ud83c\uddf9\ud83c\udded",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 220, protein: 16, carbs: 10, fat: 14 },
    cuisineBadge: "Thai",
    tip: "Press tofu for at least 20 minutes under a heavy pan — dry tofu crisps dramatically better.",
    ingredients: [
      "150g extra-firm tofu, pressed and cubed into 2cm pieces",
      "1 tbsp soy sauce",
      "1 tsp toasted sesame oil",
      "2 tbsp mixed black and white sesame seeds",
      "1 tbsp cornstarch",
      "1 tbsp neutral oil for pan-frying",
      "For dip: 2 tbsp sweet chilli sauce, squeeze of lime, 1 tsp rice vinegar",
    ],
    steps: [
      {
        title: "Season and coat tofu",
        time: "5 min",
        detail:
          "Toss pressed tofu cubes with soy sauce and sesame oil. Let sit for 2 minutes. Mix cornstarch and sesame seeds on a plate. Roll each cube in the sesame-cornstarch mixture, pressing gently to adhere on all sides.",
        look: "Cubes evenly coated in a speckled black-and-white sesame crust.",
      },
      {
        title: "Pan-fry until crispy",
        time: "8 min",
        detail:
          "Heat neutral oil in a non-stick pan over medium-high heat. Place tofu cubes with space between them. Cook 2 minutes per side, turning carefully, until all sides are golden and the sesame seeds are toasted. Drain briefly on kitchen paper.",
        look: "Deep golden crust with toasted sesame seeds, crispy exterior yielding to soft interior.",
      },
      {
        title: "Serve with dip",
        time: "1 min",
        detail:
          "Stir together sweet chilli sauce, lime juice, and rice vinegar. Pile tofu bites onto a small plate and serve the dip alongside.",
        look: "Stack of golden sesame cubes beside a glossy, red-flecked dipping sauce.",
      },
    ],
  },
  {
    id: "hu_snk1_df_5",
    name: "Prawn Lettuce Cups",
    subtitle: "Seared garlic-chilli prawns in butter lettuce, lime, crispy shallots",
    flag: "\ud83c\uddf9\ud83c\udded",
    tier: "hunt",
    slot: "snack1",
    macros: { calories: 170, protein: 20, carbs: 8, fat: 6 },
    cuisineBadge: "Thai",
    tip: "Cook prawns in a single layer without moving them — they need direct contact with the pan to caramelise.",
    ingredients: [
      "120g raw king prawns, peeled and deveined",
      "1 garlic clove, thinly sliced",
      "1 small red chilli, thinly sliced",
      "1 tsp fish sauce",
      "Juice of 1/2 lime",
      "1 tsp neutral oil",
      "4 butter lettuce cups",
      "Small handful of fresh coriander",
      "2 tbsp crispy fried shallots",
    ],
    steps: [
      {
        title: "Sear prawns",
        time: "4 min",
        detail:
          "Heat oil in a wok or skillet over high heat until smoking. Add prawns in a single layer and sear for 90 seconds without moving. Flip, add garlic and chilli, and cook for 1 more minute until prawns are pink and curled. Remove from heat and add fish sauce and half the lime juice.",
        look: "Coral-pink prawns with charred edges, golden garlic slices, red chilli rings.",
      },
      {
        title: "Assemble lettuce cups",
        time: "2 min",
        detail:
          "Divide the seared prawns among butter lettuce cups. Spoon over the pan juices. Top with fresh coriander leaves and crispy shallots. Squeeze remaining lime juice over the top and serve immediately.",
        look: "Bright green cups cradling pink prawns, brown crispy shallots, green coriander.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAIRY-FREE SNACKS — SNACK 2 (8)
  // ---------------------------------------------------------------------------
  {
    id: "hu_snk2_df_1",
    name: "Dark Chocolate Avocado Mousse",
    subtitle: "Silky avocado-chocolate mousse, espresso, toasted hazelnuts",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 240, protein: 5, carbs: 22, fat: 16 },
    cuisineBadge: "French",
    tip: "Use a fully ripe avocado — it should yield easily to gentle pressure for the smoothest texture.",
    ingredients: [
      "1 ripe avocado",
      "30g dark chocolate (70%+, dairy-free), melted",
      "1 tbsp cocoa powder",
      "2 tbsp maple syrup",
      "1 tsp espresso or strong coffee, cooled",
      "Pinch of flaky salt",
      "1 tbsp toasted hazelnuts, roughly chopped",
      "Cocoa nibs for garnish (optional)",
    ],
    steps: [
      {
        title: "Blend mousse",
        time: "4 min",
        detail:
          "Scoop avocado flesh into a food processor or blender. Add melted chocolate, cocoa powder, maple syrup, espresso, and salt. Blend for 2 full minutes until completely smooth and silky, scraping down the sides once.",
        look: "Glossy, dark brown mousse with no visible avocado flecks.",
      },
      {
        title: "Chill and serve",
        time: "15 min",
        detail:
          "Transfer mousse to a small serving glass or ramekin. Refrigerate for at least 15 minutes to firm slightly. Top with chopped toasted hazelnuts, a few cocoa nibs, and a whisper of flaky salt before serving.",
        look: "Rich, dark mousse in a glass, topped with golden hazelnut crumble and cocoa nibs.",
      },
    ],
  },
  {
    id: "hu_snk2_df_2",
    name: "Coconut Panna Cotta",
    subtitle: "Set coconut cream with passion fruit coulis and toasted coconut",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 230, protein: 3, carbs: 20, fat: 16 },
    cuisineBadge: "Italian",
    tip: "Bloom gelatine in cold water for a full 5 minutes — rushing this causes lumps in the set cream.",
    ingredients: [
      "200ml full-fat coconut cream",
      "1 tbsp maple syrup",
      "1/2 tsp vanilla extract",
      "1.5 gelatine leaves (or 1 tsp agar powder)",
      "2 passion fruits",
      "1 tsp caster sugar",
      "1 tbsp toasted desiccated coconut",
    ],
    steps: [
      {
        title: "Set the panna cotta",
        time: "5 min + 2 hr chill",
        detail:
          "Bloom gelatine leaves in cold water for 5 minutes. Gently heat coconut cream, maple syrup, and vanilla in a saucepan until steaming but not boiling. Squeeze excess water from the gelatine and whisk into the warm cream until dissolved. Pour into a ramekin or glass and refrigerate for at least 2 hours until set.",
        look: "Pure white, just-firm surface that wobbles when tapped.",
      },
      {
        title: "Make coulis and serve",
        time: "3 min",
        detail:
          "Scoop passion fruit pulp into a small bowl and stir through caster sugar until dissolved. Spoon the coulis over the set panna cotta. Scatter with toasted coconut flakes.",
        look: "Snow-white set cream under a vivid golden passion fruit coulis, flecked with seeds and coconut.",
      },
    ],
  },
  {
    id: "hu_snk2_df_3",
    name: "Matcha Chia Pudding",
    subtitle: "Ceremonial-grade matcha, oat milk, chia seeds, mango compote",
    flag: "\ud83c\uddef\ud83c\uddf5",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 200, protein: 6, carbs: 26, fat: 8 },
    cuisineBadge: "Japanese",
    tip: "Sift the matcha first and whisk it into a small splash of warm oat milk to prevent clumps before combining with the chia.",
    ingredients: [
      "3 tbsp chia seeds",
      "180ml oat milk",
      "1 tsp ceremonial-grade matcha powder, sifted",
      "1 tbsp maple syrup",
      "1/2 ripe mango, diced small",
      "1 tsp lime juice",
      "Pinch of sea salt",
    ],
    steps: [
      {
        title: "Make chia pudding",
        time: "5 min + 4 hr chill",
        detail:
          "Whisk matcha into 2 tbsp warm oat milk until completely smooth. Combine with remaining oat milk, chia seeds, maple syrup, and a pinch of salt. Stir well, then refrigerate for at least 4 hours or overnight, stirring once after 30 minutes to prevent clumping.",
        look: "Vibrant jade-green pudding with evenly suspended chia seeds.",
      },
      {
        title: "Make compote and serve",
        time: "3 min",
        detail:
          "Toss diced mango with lime juice. Spoon the set chia pudding into a glass or bowl. Top with the mango compote. Dust a tiny amount of matcha powder over the top for colour.",
        look: "Bright green pudding layered with golden mango cubes, a whisper of matcha dust.",
      },
    ],
  },
  {
    id: "hu_snk2_df_4",
    name: "Mango Sticky Rice",
    subtitle: "Coconut-steamed sticky rice, ripe mango, toasted mung beans",
    flag: "\ud83c\uddf9\ud83c\udded",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 280, protein: 5, carbs: 46, fat: 9 },
    cuisineBadge: "Thai",
    tip: "Soak the sticky rice overnight if possible — minimum 4 hours — for the proper chewy texture.",
    ingredients: [
      "80g glutinous (sticky) rice, soaked 4+ hours",
      "100ml coconut milk",
      "1 tbsp palm sugar or caster sugar",
      "Pinch of salt",
      "1 ripe mango, sliced",
      "1 tsp toasted mung beans or sesame seeds",
    ],
    steps: [
      {
        title: "Steam rice and make coconut sauce",
        time: "20 min",
        detail:
          "Drain soaked sticky rice and steam in a muslin-lined steamer for 15-18 minutes until tender and translucent. Meanwhile, gently heat coconut milk, sugar, and salt until the sugar dissolves. Do not boil. Fold half the warm coconut sauce through the steamed rice and let it absorb for 5 minutes.",
        look: "Glossy, slightly translucent rice grains bound in white coconut sauce.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Mould the sticky rice into a neat dome or oval on a plate. Fan mango slices alongside. Drizzle the remaining coconut sauce over the rice and scatter with toasted mung beans or sesame seeds.",
        look: "Pearlescent rice dome beside fanned golden mango slices, drizzled coconut, crunchy seed garnish.",
      },
    ],
  },
  {
    id: "hu_snk2_df_5",
    name: "Poached Pears in Spiced Wine",
    subtitle: "Red wine-poached pear, star anise, cinnamon, almond crumble",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 190, protein: 3, carbs: 32, fat: 6 },
    cuisineBadge: "French",
    tip: "Choose firm, just-underripe pears — overripe ones will collapse during poaching.",
    ingredients: [
      "1 firm Bosc or Conference pear, peeled and halved",
      "150ml red wine",
      "50ml water",
      "2 tbsp caster sugar",
      "1 star anise",
      "1 cinnamon stick",
      "Strip of orange peel",
      "2 tbsp flaked almonds, toasted",
    ],
    steps: [
      {
        title: "Poach pears",
        time: "20 min",
        detail:
          "Combine red wine, water, sugar, star anise, cinnamon, and orange peel in a small saucepan. Bring to a gentle simmer, stirring until the sugar dissolves. Add pear halves and poach at a bare simmer for 15-20 minutes, turning occasionally, until tender when pierced with a knife. Remove the pears and reduce the liquid by half to a glossy syrup.",
        look: "Deep ruby-stained pears, glossy reduced syrup.",
      },
      {
        title: "Plate and serve",
        time: "2 min",
        detail:
          "Place poached pear halves in a shallow bowl. Spoon the wine syrup over the top. Scatter with toasted almond flakes. Serve warm or at room temperature.",
        look: "Jewel-red pear halves in a pool of dark, syrupy wine reduction, gold almond flakes.",
      },
    ],
  },
  {
    id: "hu_snk2_df_6",
    name: "Raspberry Sorbet with Basil",
    subtitle: "Fresh raspberry sorbet, basil oil, crushed pistachios",
    flag: "\ud83c\uddee\ud83c\uddf9",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 150, protein: 3, carbs: 28, fat: 4 },
    cuisineBadge: "Italian",
    tip: "Freeze the purée in a shallow container and fork-scrape every 30 minutes for a granita-style texture without an ice cream machine.",
    ingredients: [
      "200g fresh or frozen raspberries",
      "2 tbsp caster sugar",
      "1 tbsp lemon juice",
      "60ml water",
      "6 fresh basil leaves",
      "1 tbsp extra-virgin olive oil",
      "1 tbsp pistachios, finely chopped",
    ],
    steps: [
      {
        title: "Make sorbet base",
        time: "5 min + 3 hr freeze",
        detail:
          "Blend raspberries, sugar, lemon juice, and water until smooth. Pass through a fine-mesh sieve to remove seeds. Pour into a shallow freezer-safe container. Freeze for 3 hours, scraping and stirring with a fork every 30-45 minutes to break up ice crystals.",
        look: "Vibrant magenta purée, seed-free and glossy.",
      },
      {
        title: "Make basil oil and serve",
        time: "3 min",
        detail:
          "Blanch basil leaves in boiling water for 5 seconds, then plunge into ice water. Blend basil with olive oil and a pinch of salt until smooth. Scoop sorbet into a chilled bowl. Drizzle basil oil over the top and finish with chopped pistachios.",
        look: "Vivid pink sorbet quenelle with emerald basil oil streaks and green pistachio dust.",
      },
    ],
  },
  {
    id: "hu_snk2_df_7",
    name: "Coconut Cream Fruit Tartlets",
    subtitle: "Oat pastry shells, whipped coconut cream, seasonal berries",
    flag: "\ud83c\uddeb\ud83c\uddf7",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 250, protein: 4, carbs: 28, fat: 14 },
    cuisineBadge: "French",
    tip: "Chill the coconut cream tin upside-down overnight — the thick cream separates perfectly for whipping.",
    ingredients: [
      "For shells: 60g oat flour, 30g almond flour, 1 tbsp coconut oil (solid), 1 tbsp maple syrup, pinch of salt",
      "120ml thick coconut cream (chilled overnight)",
      "1 tbsp icing sugar",
      "1/2 tsp vanilla extract",
      "80g mixed berries (raspberries, blueberries, strawberry slices)",
      "1 tsp apricot jam, warmed (for glaze)",
    ],
    steps: [
      {
        title: "Make and bake shells",
        time: "18 min",
        detail:
          "Combine oat flour, almond flour, salt, coconut oil, and maple syrup. Press into a uniform dough. Divide between 3 mini tart tins, pressing evenly into the base and sides. Prick with a fork. Bake at 180°C for 10-12 minutes until golden and firm. Cool completely before filling.",
        look: "Light golden, crisp tart shells with a slightly rustic edge.",
      },
      {
        title: "Whip cream and assemble",
        time: "5 min",
        detail:
          "Scoop the thick cream from the chilled coconut tin (discard the water). Whip with icing sugar and vanilla until fluffy and stiff — about 2 minutes with an electric whisk. Pipe or spoon into cooled shells. Arrange berries on top. Brush with a thin coat of warmed apricot jam for sheen.",
        look: "Neat tart shells brimming with cloud-white cream, jewel-toned berries, glossy glaze.",
      },
    ],
  },
  {
    id: "hu_snk2_df_8",
    name: "Coconut Milk Rice Pudding",
    subtitle: "Slow-cooked arborio in coconut milk, cardamom, rosewater, pistachios",
    flag: "\ud83c\uddee\ud83c\uddf3",
    tier: "hunt",
    slot: "snack2",
    macros: { calories: 260, protein: 5, carbs: 38, fat: 10 },
    cuisineBadge: "Indian",
    tip: "Stir frequently in the last 5 minutes — the rice releases starch that thickens the pudding beautifully.",
    ingredients: [
      "50g arborio or pudding rice",
      "250ml full-fat coconut milk",
      "100ml water",
      "2 tbsp caster sugar",
      "3 green cardamom pods, lightly crushed",
      "1/2 tsp rosewater",
      "1 tbsp pistachios, slivered",
      "Pinch of saffron threads (optional)",
    ],
    steps: [
      {
        title: "Cook rice pudding",
        time: "25 min",
        detail:
          "Combine rice, coconut milk, water, sugar, and cardamom pods in a small saucepan. Bring to a gentle simmer over medium-low heat. Cook for 20-25 minutes, stirring frequently, especially in the last 5 minutes, until the rice is tender and the mixture is thick and creamy. Remove from heat and stir in rosewater. Remove cardamom pods.",
        look: "Thick, creamy, porcelain-white pudding with visible plump rice grains.",
      },
      {
        title: "Garnish and serve",
        time: "2 min",
        detail:
          "Spoon the warm pudding into a small bowl. Top with slivered pistachios and, if using, a few saffron threads. Serve warm or chilled.",
        look: "Ivory pudding crowned with green pistachio slivers and orange saffron wisps.",
      },
    ],
  },
];
