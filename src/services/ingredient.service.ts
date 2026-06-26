import IngredientRepository, { type Ingredient } from '../repositories/ingredient.repository';
import RecipeRepository from '../repositories/recipe.repository';
import { ForbiddenError, NotFoundError } from '../utils/error';

class IngredientService {
  private readonly ingredientRepository: IngredientRepository;
  private readonly recipeRepository: RecipeRepository;

  constructor() {
    this.ingredientRepository = new IngredientRepository();
    this.recipeRepository = new RecipeRepository();
  }

  private async verifyRecipeAuthor(recipeId: number, userId: number) {
    const recipe = await this.recipeRepository.findById(recipeId);
    if (!recipe) throw new NotFoundError('Recipe not found');
    if (recipe.authorId !== userId) throw new ForbiddenError('You are not author of this recipe');
  }

  async addIngredient(
    recipeId: number,
    userId: number,
    name: string,
    quantity: string,
  ): Promise<Ingredient> {
    await this.verifyRecipeAuthor(recipeId, userId);
    return await this.ingredientRepository.create(recipeId, name, quantity);
  }

  async getIngredientByRecipe(recipeId: number): Promise<Ingredient[]> {
    const recipe = await this.recipeRepository.findById(recipeId);
    if (!recipe) throw new NotFoundError('Recipe not found');
    return await this.ingredientRepository.findByRecipeId(recipeId);
  }

  async updateIngredient(
    id: number,
    userId: number,
    data: Partial<Omit<Ingredient, 'id' | 'recipeId'>>,
  ): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findById(id);
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    await this.verifyRecipeAuthor(ingredient.recipeId, userId);
    return await this.ingredientRepository.update(id, data);
  }

  async deleteIngredient(id: number, userId: number): Promise<void> {
    const ingredient = await this.ingredientRepository.findById(id);
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    await this.verifyRecipeAuthor(ingredient.recipeId, userId);
    await this.ingredientRepository.delete(id);
  }
}

export default IngredientService;
