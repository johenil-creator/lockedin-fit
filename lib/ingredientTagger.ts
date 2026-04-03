import type { DietaryRestriction } from "../src/data/mealTypes";

const DETECTION_RULES: Record<DietaryRestriction, RegExp> = {
  dairy: /\b(milk|cheese|yogurt|yoghurt|butter|cream|whey|mozzarella|parmesan|cheddar|feta|gruyere|gruyère|ricotta|cottage|bechamel|béchamel|ghee|crème fraîche|creme fraiche)\b/i,
  gluten: /\b(bread|flour|pasta|noodle|couscous|pita|pitta|wrap|brioche|bun|bagel|panko|breadcrumb|crouton|roux|filo|phyllo|pastry)\b(?!.*corn)/i,
  eggs: /\b(eggs?)\b/i,
  pork: /\b(pork|bacon|ham|sausage|prosciutto|pancetta|chorizo|lard)\b/i,
  shellfish: /\b(shrimp|prawn|crab|lobster|langoustine|scallop|mussel|clam|squid|calamari)\b/i,
  nuts: /\b(peanut|almond|walnut|cashew|pistachio|pecan|hazelnut|macadamia|pine nut)\b/i,
  soy: /\b(soy sauce|soy milk|tofu|tempeh|edamame|miso|doenjang|gochujang)\b/i,
  fish: /\b(salmon|tuna|cod|tilapia|haddock|fish|anchov|sardine|mackerel|trout|sea bass|sea bream|sole|turbot|ikura|fish sauce|dashi|bonito)\b/i,
  "red-meat": /\b(beef|steak|lamb|bison|venison|veal|wagyu|short rib|sirloin)\b/i,
};

export function detectContains(ingredients: string[]): DietaryRestriction[] {
  const joined = ingredients.join(" ").toLowerCase();
  const result: DietaryRestriction[] = [];
  for (const [restriction, pattern] of Object.entries(DETECTION_RULES) as [DietaryRestriction, RegExp][]) {
    if (pattern.test(joined)) {
      result.push(restriction);
    }
  }
  return result;
}
