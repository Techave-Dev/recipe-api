ALTER TABLE recipes 
ADD CONSTRAINT chk_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'));

CREATE INDEX IF NOT EXISTS idx_recipes_author_id ON recipes(author_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_time ON recipes(cooking_time);