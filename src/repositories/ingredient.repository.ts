import type { Pool } from 'pg';
import { db as dbClient } from '../config/db';
import { ValidationError } from '../utils/error';

export interface Ingredient {
  id: number;
  recipeId: number;
  name: string;
  quantity: string;
}

interface IngredientRow {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string;
}

class IngredientRepository {
  private readonly db: Pool = dbClient;

  private mapRow(row: IngredientRow): Ingredient {
    return {
      id: Number(row.id),
      recipeId: Number(row.recipe_id),
      name: row.name,
      quantity: row.quantity,
    };
  }

  async create(recipeId: number, name: string, quantity: string): Promise<Ingredient> {
    const result = await this.db.query(
      `INSERT INTO ingredients (recipe_id, name, quantity) VALUES ($1, $2, $3)
      RETURNING id, recipe_id, name, quantity`,
      [recipeId, name, quantity],
    );

    return this.mapRow(result.rows[0]);
  }

  async findByRecipeId(recipeId: number): Promise<Ingredient[]> {
    const result = await this.db.query(
      `SELECT id, recipe_id, name, quantity FROM ingredients WHERE recipe_id = $1;`,
      [recipeId],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findById(id: number): Promise<Ingredient | null> {
    const result = await this.db.query(
      `SELECT id, recipe_id, name, quantity FROM ingredients WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async update(
    id: number,
    data: Partial<Omit<Ingredient, 'id' | 'recipeId'>>,
  ): Promise<Ingredient> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    let index = 1;

    if (data.name) {
      fields.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.quantity) {
      fields.push(`quantity = $${index++}`);
      values.push(data.quantity);
    }
    if (fields.length === 0) throw new ValidationError('No fields to update');

    values.push(id);
    const res = await this.db.query(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, recipe_id, name, quantity;`,
      values,
    );
    return this.mapRow(res.rows[0]);
  }

  async delete(id: number): Promise<void> {
    await this.db.query(`DELETE FROM ingredients WHERE id = $1`, [id]);
  }
}

export default IngredientRepository;
