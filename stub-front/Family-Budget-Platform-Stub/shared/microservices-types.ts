import { z } from "zod";

// ===== USER SERVICE (PORT 8081) =====

export interface UserDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  familyId: number;
  keycloakId: string;
  role: string;
  createdAt: string;
}

export interface FamilyDto {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

// Request schemas for User Service
export const registerParentSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов"),
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов"),
  familyName: z.string().min(2, "Название семьи должно содержать не менее 2 символов"),
});

export const registerUserSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов"),
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов"),
  familyId: z.number(),
});

export const loginUserSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов").optional(),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов").optional(),
});

export const changePasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
  oldPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Новый пароль должен содержать не менее 6 символов"),
});

// ===== TRANSACTION SERVICE (PORT 8082) =====

export interface TransactionDto {
  id: number;
  type: "INCOME" | "SPEND";
  amount: number;
  categoryId: number;
  userId: number;
  periodId: number;
  createdAt: string;
}

// Request schemas for Transaction Service
export const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "SPEND"]),
  amount: z.number().min(1, "Сумма должна быть положительным числом"),
  categoryId: z.number(),
  userId: z.number(),
});

// ===== FAMILY BUDGET SERVICE (PORT 8083) =====

export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface GoalDto {
  id: number;
  balance: number;
  cost: number;
  name: string;
  description?: string;
  familyId: number;
  createdAt: string;
  paid: boolean;
}

export interface MandatoryPaymentDto {
  id: number;
  name: string;
  amount: number;
  familyId: number;
  createdAt: string;
  periodId: number;
  paid: boolean;
}

export interface BudgetPeriodDto {
  id: number;
  year: number;
  month: number;
}

export interface FamilyBudgetPlanDto {
  id: number;
  familyId: number;
  familyBudgetLimit: number;
  periodId: number;
}

export interface CategoryExpenseReportDto {
  expense: number;
  categoryId: number;
  userId: number;
}

// Request schemas for Family Budget Service
export const createGoalSchema = z.object({
  cost: z.number().min(1, "Стоимость должна быть положительным числом"),
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  description: z.string().optional(),
  familyId: z.number(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов").optional(),
  description: z.string().optional(),
});

export const topUpGoalSchema = z.object({
  goalId: z.number(),
  balance: z.number().min(1, "Сумма должна быть положительным числом"),
});

export const createMandatoryPaymentSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  amount: z.number().min(1, "Сумма должна быть положительным числом"),
  familyId: z.number(),
});

export const addCategorySchema = z.object({
  name: z.string().min(2, "Название должно содержать не менее 2 символов"),
  description: z.string().optional(),
});

export const createFamilyBudgetPlanSchema = z.object({
  familyId: z.number(),
  budgetLimit: z.number().min(1, "Лимит бюджета должен быть положительным числом"),
  familyMembersPlan: z.array(z.object({
    categoryId: z.number(),
    userId: z.number(),
    limit: z.number().min(0, "Лимит не может быть отрицательным"),
  })),
});

// Type exports for convenience
export type RegisterParent = z.infer<typeof registerParentSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type CreateGoal = z.infer<typeof createGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
export type TopUpGoal = z.infer<typeof topUpGoalSchema>;
export type CreateMandatoryPayment = z.infer<typeof createMandatoryPaymentSchema>;
export type AddCategory = z.infer<typeof addCategorySchema>;
export type CreateFamilyBudgetPlan = z.infer<typeof createFamilyBudgetPlanSchema>;