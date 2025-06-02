import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Роли пользователей в системе
export const userRoles = {
  PARENT: "parent",
  USER: "user"
} as const;

export const userRoleSchema = z.enum([userRoles.PARENT, userRoles.USER]);

export type UserRole = z.infer<typeof userRoleSchema>;

// Таблица семей для группировки пользователей
export const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default(userRoles.USER),
  familyId: integer("family_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(), // "income" или "expense"
  userId: integer("user_id").notNull(), // Кто создал транзакцию
  familyId: integer("family_id").notNull(), // К какой семье относится
  createdAt: timestamp("created_at").defaultNow(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").notNull(),
  description: text("description"),
  familyId: integer("family_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savingsHistory = pgTable("savings_history", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  goalId: integer("goal_id").notNull(),
  type: text("type").notNull(), // "deposit" или "withdrawal"
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  age: integer("age").notNull(),
  userId: integer("user_id"), // Связь с учетной записью пользователя (если есть)
  familyId: integer("family_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  category: text("category").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  familyId: integer("family_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  familyId: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
});

export const familyMemberSchema = z.object({
  name: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  relation: z.string().min(1, "Выберите родственную связь"),
  age: z.coerce.number().min(0, "Возраст должен быть положительным числом").max(120, "Введите корректный возраст"),
});

export const transactionSchema = z.object({
  description: z.string().min(3, "Описание должно содержать не менее 3 символов"),
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Выберите категорию"),
  date: z.string(),
  userId: z.number().optional(),
});

export const savingsGoalSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  targetAmount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  currentAmount: z.coerce.number().min(0, "Сумма не может быть отрицательной").optional(),
  description: z.string().optional(),
  familyId: z.number().optional(),
});

export const savingsHistorySchema = z.object({
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  description: z.string().min(3, "Описание должно содержать не менее 3 символов"),
  type: z.enum(["deposit", "withdrawal"]),
  goalId: z.number(),
  userId: z.number().optional(),
});

export const notificationSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен"),
  message: z.string().min(1, "Сообщение обязательно"),
  userId: z.number(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type SavingsHistory = typeof savingsHistory.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
