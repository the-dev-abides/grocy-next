---
status: accepted
---

# Mealie owns recipes

Grocy Next is a drop-in replacement for Grocy, so it builds the Grocy Recipes
area and the Meal plan area. The household also keeps its recipes in Mealie
and cooks from Mealie. The two sets of recipes need one rule. We decided that
Mealie is the source of truth for everything that the Mealie link covers:
recipes, and the Mealie side of each food link and each unit link. The Mealie
link is opt-in. A household that does not turn it on has the Grocy Next
recipes and nothing else. A household that turns it on gets the Mealie recipes
in Grocy Next through the link, and Grocy Next does not write a recipe back to
Mealie. We chose this because the household already trusts Mealie with its
recipes, and because a two-way recipe sync would need a conflict rule that no
requirement asks for. The Mealie link milestone settles what the link covers
beyond recipes, foods, and units.
