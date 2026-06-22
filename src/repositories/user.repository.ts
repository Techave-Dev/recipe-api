import { Pool } from 'pg';
import { db as dbClient } from '../config/db';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: Date;
}

class UserRepository {
  constructor(private readonly db: Pool = dbClient) {};

  private toUser(row: UserRow) : User {
    return {
      id: Number(row.id),
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    }
  }

  private toUserWithPassword(row: UserRow) : UserWithPassword {
    return { ...this.toUser(row), password: row.password }
  }

  async create(data: { email: string; password: string, name: string }): Promise<User> {
    const result = await this.db.query<UserRow>(
      `INSERT INTO users (email, password, name) VALUES($1, $2, $3) RETURNING id, email, password, name, created_at;`,
      [data.email, data.password, data.name]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create user');
    }

    return this.toUser(row);
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    
    const row = result.rows[0];
    return row ? this.toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    const row = result.rows[0];
    return row ? this.toUser(row) : null;
  }

  async findEmailByPassword(email: string): Promise<UserWithPassword | null> {
    const result = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    const row = result.rows[0];
    return row ? this.toUserWithPassword(row) : null;
  }

  async update(id: number, data: { name?: string, email?: string, password?: string}) : Promise<User> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    let index = 1;

    if (data.name) {
      fields.push(`name = $${index++}`);
      values.push(data.name);
    }
    if (data.email) {
      fields.push(`email = $${index++}`);
      values.push(data.email);
    }
    if (data.password) {
      fields.push(`password = $${index++}`);
      values.push(data.password);
    }

    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING id, email, name, created_at`;
    const result = await this.db.query<UserRow>(query, values);
    const row = result.rows[0];

    if (!row) {
      throw new Error('User not found to update');
    }

    return this.toUser(row);
  }
}

export default UserRepository;

