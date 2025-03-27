import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { InsertTask, UpdateTask, insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tasks API routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks();
      return res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return res.status(500).json({ message: "Nie udało się pobrać zadań" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.addTask(taskData);
      return res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Nieprawidłowe dane zadania", errors: error.format() });
      }
      console.error("Error creating task:", error);
      return res.status(500).json({ message: "Nie udało się utworzyć zadania" });
    }
  });

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const taskData = updateTaskSchema.parse(req.body);
      const updatedTask = await storage.updateTask(id, taskData);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Zadanie nie znalezione" });
      }
      
      return res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Nieprawidłowe dane zadania", errors: error.format() });
      }
      console.error("Error updating task:", error);
      return res.status(500).json({ message: "Nie udało się zaktualizować zadania" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(id);
      
      if (!success) {
        return res.status(404).json({ message: "Zadanie nie znalezione" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      return res.status(500).json({ message: "Nie udało się usunąć zadania" });
    }
  });

  app.patch("/api/tasks/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedTask = await storage.completeTask(id);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Zadanie nie znalezione" });
      }
      
      return res.json(updatedTask);
    } catch (error) {
      console.error("Error toggling task completion:", error);
      return res.status(500).json({ message: "Nie udało się zmienić statusu zadania" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
