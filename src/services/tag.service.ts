import RecipeRepository from '../repositories/recipe.repository';
import TagRepository, { type Tag } from '../repositories/tag.repository';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/error';

class TagService {
  private readonly tagRepository: TagRepository;
  private readonly recipeRepository: RecipeRepository;

  constructor() {
    this.tagRepository = new TagRepository();
    this.recipeRepository = new RecipeRepository();
  }

  async verifyRecipeAuthor(recipeId: number, userId: number) {
    const recipe = await this.recipeRepository.findById(recipeId);
    if (!recipe) throw new NotFoundError('Recipe not found');
    if (recipe.authorId !== userId) throw new ForbiddenError('You are not author of this recipe');
  }

  async createTag(name: string, slug: string): Promise<Tag> {
    const existingTag = await this.tagRepository.findBySlug(slug);
    if (existingTag) {
      throw new ConflictError('Slug already exists');
    }

    return await this.tagRepository.create(name, slug);
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.tagRepository.findAll();
  }

  async attachTag(recipeId: number, userId: number, tagIdOrSlug: number | string): Promise<Tag> {
    await this.verifyRecipeAuthor(recipeId, userId);
    let tagId: number;

    if (typeof tagIdOrSlug === 'number') {
      const tag = await this.tagRepository.findById(tagIdOrSlug);
      if (!tag) throw new NotFoundError('Tag not found');
      tagId = tag.id;
    } else {
      const tag = await this.tagRepository.findBySlug(tagIdOrSlug);
      if (!tag) throw new NotFoundError('Tag with specified slug not found');
      tagId = tag.id;
    }

    const tag = await this.tagRepository.attachToRecipe(recipeId, tagId);
    if (!tag) {
      throw new ConflictError('Tag already attached to this recipe');
    }

    return tag;
  }

  async detachTag(recipeId: number, userId: number, tagId: number): Promise<void> {
    await this.verifyRecipeAuthor(recipeId, userId);
    const tag = await this.tagRepository.findById(tagId);
    if (!tag) throw new NotFoundError('Tag not found');
    await this.tagRepository.detachFromRecipe(recipeId, tagId);
  }

  async getRecipesByTag(slug: string, queryParams: Record<string, string | string[] | undefined>) {
    const page = Math.max(1, Number(queryParams.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(queryParams.limit ?? 20)));
    const difficulty =
      typeof queryParams.difficulty === 'string' ? queryParams.difficulty : undefined;
    const tag = await this.tagRepository.findBySlug(slug);
    if (!tag) throw new NotFoundError('Tag not found');
    const recipes = await this.tagRepository.findRecipeBySlug(slug, page, limit, difficulty);

    return {
      tag: tag,
      data: recipes.data,
    };
  }
}

export default TagService;
