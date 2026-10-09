import * as SQLite from 'expo-sqlite';

const databaseName = 'todo.db';
const defaultCategories = ['Faculdade', 'Trabalho', 'Pessoal'];

export async function openTodoDatabase() {
  const db = await SQLite.openDatabaseAsync(databaseName);
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_time TEXT,
      category_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
      reminder_id TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  const categories = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM categories'
  );
  if (!categories?.total) {
    for (const name of defaultCategories) {
      await db.runAsync('INSERT OR IGNORE INTO categories (name) VALUES (?)', name);
    }
  }

  return db;
}