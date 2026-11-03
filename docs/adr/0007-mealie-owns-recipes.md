---
status: accepted
---

# Mealie owns recipes

Grocy Next is a drop-in replacement for Grocy, so it builds the Grocy Recipes
area and the Meal plan area. The household also keeps its recipes in Mealie
and cooks from Mealie. The two systems need one ownership rule. We decided
that Mealie is the source of truth for recipes, and that Grocy Next is the
source of truth for products, quantity units, and stock. The Mealie link is
opt-in. It maps a product to a food and a quantity unit to a Mealie unit, and
it reads the Mealie recipes for the functions that need both sides, such as
which recipes the household can cook from stock. A link does not rename
either side. Grocy Next does not write a recipe to Mealie, and Mealie does not
write a product or a stock change to Grocy Next except through the link
actions that the household turns on, such as the "I made this" consume. We
chose this because Mealie does recipes well and the household already trusts
it with them, and because Grocy does products and inventory well. A household
that does not turn the link on has the Grocy Next recipes and nothing else.
