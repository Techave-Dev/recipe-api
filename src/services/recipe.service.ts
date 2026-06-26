import RecipeRepository, {
  type Difficulty,
  type Recipe,
  type RecipeDetail,
  type RecipeFilters,
} from '../repositories/recipe.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/error';

interface CreateRecipeInput {
  title: string;
  description: string | null;
  cookingTime: number;
  difficulty: Difficulty;
  authorId: number;
}

class RecipeService {
  private readonly recipeRepository: RecipeRepository;

  constructor() {
    this.recipeRepository = new RecipeRepository();
  }

  private validateId(id: number) {
    if (!Number.isInteger(id)) {
      throw new ValidationError('Invalid recipe ID format');
    }
  }

  private buildFilters(queryParams: Record<string, string | string[] | undefined>): RecipeFilters {
    const [sortBy = 'created_at', order = 'desc'] = String(queryParams.sort ?? '').split(':');

    return {
      difficulty: ['easy', 'medium', 'hard'].includes(String(queryParams.difficulty))
        ? (queryParams.difficulty as Difficulty)
        : undefined,
      cookingTimeMax: queryParams.cookingTimeMax ? Number(queryParams.cookingTimeMax) : undefined,
      authorId: queryParams.authorId ? Number(queryParams.authorId) : undefined,
      search: typeof queryParams.search === 'string' ? queryParams.search : undefined,
      page: Math.max(1, Number(queryParams.page) || 1),
      limit: Math.min(100, Math.max(1, Number(queryParams.limit) || 20)),
      sortField: sortBy === 'cookingTime' ? 'cooking_time' : 'created_at',
      sortOrder: order.toLowerCase() === 'asc' ? 'ASC' : 'DESC',
    };
  }

  async create(data: CreateRecipeInput): Promise<Recipe> {
    return await this.recipeRepository.create({
      title: data.title,
      description: data.description,
      cookingTime: data.cookingTime,
      difficulty: data.difficulty,
      authorId: data.authorId,
    });
  }

  async getRecipes(queryParams: Record<string, string | string[] | undefined>) {
    const filters = this.buildFilters(queryParams);

    if (queryParams.tag) {
      filters.tags = queryParams.tag;
    }

    const { data, total } = await this.recipeRepository.findAndCount(filters);

    return {
      data,
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  async getRecipeById(id: number): Promise<RecipeDetail> {
    this.validateId(id);
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    return recipe;
  }

  async updateRecipe(
    id: number,
    currentUserId: number,
    data: Partial<Omit<Recipe, 'id' | 'authorId' | 'createdAt'>>,
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) throw new NotFoundError('Recipe not found');

    if (recipe.authorId !== currentUserId) {
      throw new ForbiddenError('You are not authorized to update this recipe');
    }

    if (data.cookingTime !== undefined && (isNaN(data.cookingTime) || data.cookingTime < 1)) {
      throw new ValidationError('Cooking time must be an integer greater than or equal to 1');
    }

    return await this.recipeRepository.update(id, data);
  }

  async deleteRecipe(id: number, currentUserId: number): Promise<void> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) throw new NotFoundError('Recipe not found');

    if (recipe.authorId !== currentUserId) {
      throw new ForbiddenError('You are not authorized to delete this recipe');
    }

    await this.recipeRepository.delete(id);
  }
}

export default RecipeService;
