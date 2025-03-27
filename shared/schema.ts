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
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  createdAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
