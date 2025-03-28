import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Task schema
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").array().notNull(),
  completed: boolean("completed").notNull().default(false),
  category: text("category").notNull(),
  due_date: timestamp("due_date"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Niestandardowy schemat zadania uwzględniający datę
const dateSchema = z.union([
  z.date(),
  z.string().transform((val) => {
    try {
      return new Date(val);
    } catch {
      throw new Error('Nieprawidłowy format daty');
    }
  }),
  z.null(),
]);

const baseTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.array(z.string()),
  completed: z.boolean(),
  category: z.string(),
  dueDate: dateSchema.optional(),
  createdAt: z.date().optional(),
});

export const insertTaskSchema = baseTaskSchema;
export const updateTaskSchema = baseTaskSchema.partial();

// Typ Task reprezentujący zadanie
export interface Task {
  id: string;
  title: string;
  notes: string[];
  completed: boolean;
  category: string;
  dueDate: Date | string | null;
  createdAt: Date;
}

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
