import type { Pool } from 'pg';
import { db as dbClient } from '../config/db';
import { ValidationError } from '../utils/error';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RecipeTagRelation {
  id: number;
  name: string;
  slug: string;
}

export interface RecipeIngredientRelation {
  id: number;
  name: string;
  quantity: string;
}

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  cookingTime: number;
  difficulty: Difficulty;
  authorId: number;
  createdAt: Date;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredientRelation[];
  tags: RecipeTagRelation[];
}

export interface RecipeFilters {
  difficulty?: string | undefined;
  cookingTimeMax?: number | undefined;
  authorId?: number | undefined;
  search?: string | undefined;
  tags?: string | string[] | undefined;
  page: number;
  limit: number;
  sortField: 'created_at' | 'cooking_time';
  sortOrder: 'ASC' | 'DESC';
}

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  cooking_time: number;
  difficulty: Difficulty;
  author_id: string;
  created_at: Date;
}

class RecipeRepository {
  private readonly db: Pool = dbClient;

  private toRecipe(row: RecipeRow): Recipe {
    return {
      id: Number(row.id),
      title: row.title,
      description: row.description,
      cookingTime: row.cooking_time,
      difficulty: row.difficulty,
      authorId: Number(row.author_id),
      createdAt: row.created_at,
    };
  }

  async create(data: Omit<Recipe, 'id' | 'createdAt'>): Promise<Recipe> {
    const result = await this.db.query<RecipeRow>(
      `INSERT INTO recipes (title, description, cooking_time, difficulty, author_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, cooking_time, difficulty, author_id, created_at;`,
      [data.title, data.description, data.cookingTime, data.difficulty, data.authorId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create recipe');
    }

    return this.toRecipe(row);
  }

  async findById(id: number): Promise<RecipeDetail | null> {
    const result = await this.db.query<RecipeRow>(`SELECT * FROM recipes WHERE id = $1`, [id]);

    const row = result.rows[0];
    if (!row) return null;

    const recipe = this.toRecipe(row);
    const ingredientsResult = await this.db.query<RecipeIngredientRelation>(
      `SELECT id, name, quantity FROM ingredients WHERE recipe_id = $1 ORDER BY id ASC;`,
      [id],
    );

    const tagsResult = await this.db.query<RecipeTagRelation>(
      `SELECT t.id, t.name, t.slug 
       FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = $1 ORDER BY t.id ASC;`,
      [id],
    );

    return {
      ...recipe,
      ingredients: ingredientsResult.rows,
      tags: tagsResult.rows,
    };
  }

  async update(
    id: number,
    data: Partial<Omit<Recipe, 'id' | 'authorId' | 'createdAt'>>,
  ): Promise<Recipe> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    let index = 1;

    if (data.title) {
      fields.push(`title = $${index++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(data.description ?? '');
    }

    if (data.cookingTime) {
      fields.push(`cooking_time = $${index++}`);
      values.push(data.cookingTime);
    }

    if (data.difficulty) {
      fields.push(`difficulty = $${index++}`);
      values.push(data.difficulty);
    }

    if (fields.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(id);

    const query = `UPDATE recipes SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, title, description, cooking_time, difficulty, author_id, created_at;`;
    const result = await this.db.query<RecipeRow>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error('Recipe not found to update');
    }

    return this.toRecipe(row);
  }

  async delete(id: number): Promise<void> {
    await this.db.query('DELETE FROM recipes WHERE id = $1;', [id]);
  }

  async findAndCount(filters: RecipeFilters): Promise<{ data: Recipe[]; total: number }> {
    const whereClauses: string[] = [];
    const values: (string | number | string[])[] = [];
    let index = 1;

    if (filters.difficulty) {
      whereClauses.push(`difficulty = $${index++}`);
      values.push(filters.difficulty);
    }
    if (filters.cookingTimeMax) {
      whereClauses.push(`cooking_time <= $${index++}`);
      values.push(filters.cookingTimeMax);
    }
    if (filters.authorId) {
      whereClauses.push(`author_id = $${index++}`);
      values.push(filters.authorId);
    }
    if (filters.search) {
      whereClauses.push(`title ILIKE $${index++}`);
      values.push(`%${filters.search}%`);
    }

    if (filters.tags) {
      const tagList = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      if (tagList.length > 0) {
        const tagIndex = index++;
        whereClauses.push(`
          EXISTS (
            SELECT 1 FROM recipe_tags rt 
            JOIN tags t ON rt.tag_id = t.id 
            WHERE rt.recipe_id = recipes.id AND t.slug = ANY($${tagIndex}::text[])
            HAVING COUNT(DISTINCT t.slug) = CARDINALITY($${tagIndex}::text[])
          )
        `);
        values.push(tagList);
      }
    }

    const whereStatement = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) FROM recipes ${whereStatement}`,
      values,
    );

    const total = Number(countResult.rows[0]?.count ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const allowedSortFields = new Set(['created_at', 'cooking_time']);
    const allowedSortOrders = new Set(['ASC', 'DESC']);
    if (!allowedSortFields.has(filters.sortField) || !allowedSortOrders.has(filters.sortOrder)) {
      throw new ValidationError('Invalid sort parameters');
    }

    const query = `
      SELECT * FROM recipes 
      ${whereStatement} 
      ORDER BY ${filters.sortField} ${filters.sortOrder} 
      LIMIT $${index++} OFFSET $${index};
    `;

    const dataResult = await this.db.query<RecipeRow>(query, [...values, filters.limit, offset]);

    return {
      data: dataResult.rows.map((row) => this.toRecipe(row)),
      total,
    };
  }
}

export default RecipeRepository;
