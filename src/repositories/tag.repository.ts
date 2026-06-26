import type { Pool } from 'pg';
import { db as dbClient } from '../config/db';
import type { Recipe } from './recipe.repository';

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

class TagRepository {
  private readonly db: Pool = dbClient;

  private parseTag(row: { id: string | number; name: string; slug: string }): Tag {
    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
    };
  }

  async create(name: string, slug: string): Promise<Tag> {
    const result = await this.db.query(
      `INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      [name, slug],
    );

    return this.parseTag(result.rows[0]);
  }

  async findAll(): Promise<Tag[]> {
    const result = await this.db.query(`SELECT id, name, slug FROM tags;`);
    return result.rows.map((row) => this.parseTag(row));
  }

  async findBySlug(slug: string): Promise<Tag | null> {
    const result = await this.db.query(`SELECT id, name, slug FROM tags WHERE slug = $1;`, [slug]);
    const row = result.rows[0];
    return row ? this.parseTag(row) : null;
  }

  async findById(id: number): Promise<Tag | null> {
    const result = await this.db.query(`SELECT id, name, slug FROM tags WHERE id = $1;`, [id]);
    const row = result.rows[0];
    return row ? this.parseTag(row) : null;
  }

  async attachToRecipe(recipeId: number, tagId: number): Promise<Tag | null> {
    // await this.db.query(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING tag_id;`, [recipeId, tagId]);
    // const result = await this.db.query(`SELECT id, name, slug FROM tags WHERE id = $1;`, [tagId]);
    // return this.parseTag(result.rows[0]);
    const insertResult = await this.db.query(
      `INSERT INTO recipe_tags (recipe_id, tag_id) 
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING tag_id;`,
      [recipeId, tagId],
    );

    if (insertResult.rowCount === 0) {
      return null;
    }

    const result = await this.db.query(`SELECT id, name, slug FROM tags WHERE id = $1;`, [tagId]);

    return this.parseTag(result.rows[0]);
  }

  async isTagAttached(recipeId: number, tagId: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM recipe_tags WHERE recipe_id = $1 AND tag_id = $2 LIMIT 1;`,
      [recipeId, tagId],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async detachFromRecipe(recipeId: number, tagId: number): Promise<void> {
    await this.db.query(`DELETE FROM recipe_tags WHERE recipe_id = $1 AND tag_id = $2`, [
      recipeId,
      tagId,
    ]);
  }

  async findRecipeBySlug(
    slug: string,
    page: number,
    limit: number,
    difficulty?: string,
  ): Promise<{ tag: Tag; data: Recipe[]; total: number }> {
    const tagRes = await this.db.query(`SELECT id, name, slug FROM tags WHERE slug = $1`, [slug]);
    const tagRow = tagRes.rows[0];

    if (!tagRow) throw new Error('Tag not found');
    const tag = this.parseTag(tagRow);

    const offset = (page - 1) * limit;
    const whereClauses: string[] = ['rt.tag_id = $1'];
    const valuesForCount: (number | string)[] = [tag.id];

    if (difficulty) {
      whereClauses.push('r.difficulty = $2');
      valuesForCount.push(difficulty);
    }

    const whereStatement = `WHERE ${whereClauses.join(' AND ')}`;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM recipes r JOIN recipe_tags rt ON r.id = rt.recipe_id ${whereStatement}`,
      valuesForCount,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const queryData = `
      SELECT r.id, r.title, r.description, r.cooking_time as "cookingTime", r.difficulty, r.author_id as "authorId", r.created_at as "createdAt" 
      FROM recipes r JOIN recipe_tags rt ON r.id = rt.recipe_id
      ${whereStatement} 
      ORDER BY r.created_at DESC LIMIT $${valuesForCount.length + 1} OFFSET $${valuesForCount.length + 2};
    `;

    const dataRes = await this.db.query(queryData, [...valuesForCount, limit, offset]);

    const data: Recipe[] = dataRes.rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      description: row.description,
      cookingTime: Number(row.cookingTime),
      difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
      authorId: Number(row.authorId),
      createdAt: new Date(row.createdAt),
    }));

    return { tag, data, total };
  }
}

export default TagRepository;
