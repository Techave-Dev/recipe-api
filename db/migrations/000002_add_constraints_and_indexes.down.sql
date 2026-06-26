ALTER TABLE recipes DROP CONSTRAINT IF EXISTS chk_difficulty;

DROP INDEX IF EXISTS idx_recipes_author_id;
DROP INDEX IF EXISTS idx_ingredients_recipe_id;
DROP INDEX IF EXISTS idx_recipe_tags_tag_id;
DROP INDEX IF EXISTS idx_recipes_created_at;
DROP INDEX IF EXISTS idx_recipes_cooking_time;