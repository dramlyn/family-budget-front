import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isParent, canEditTransaction } from "./auth";

// Вспомогательный middleware для проверки аутентификации
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется аутентификация" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка маршрутов аутентификации (login, register, logout, user)
  setupAuth(app);

  // Маршруты для страницы быстрых действий
  app.get("/api/expense/new", isAuthenticated, (req, res) => {
    res.json({ message: "Страница добавления расхода" });
  });

  app.get("/api/income/new", isAuthenticated, (req, res) => {
    res.json({ message: "Страница добавления дохода" });
  });

  app.get("/api/reports", isAuthenticated, (req, res) => {
    res.json({ message: "Страница отчетов" });
  });

  app.get("/api/settings", isAuthenticated, (req, res) => {
    res.json({ message: "Страница настроек" });
  });

  // Маршруты для информационной панели
  app.get("/api/budget-summary", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      // Получаем транзакции для семьи
      const transactions = await storage.getTransactions(req.user.familyId);
      
      // Рассчитываем общий баланс
      const balance = transactions.reduce((total, tx) => {
        if (tx.type === "income") {
          return total + tx.amount;
        } else {
          return total - Math.abs(tx.amount);
        }
      }, 0);
      
      // Рассчитываем ежемесячные расходы (для простоты берем все расходы)
      const expenses = transactions
        .filter(tx => tx.type === "expense")
        .reduce((total, tx) => total + Math.abs(tx.amount), 0);
      
      // Получаем сберегательные цели
      const savingsGoals = await storage.getSavingsGoals(req.user.familyId);
      let savingsGoal = null;
      
      if (savingsGoals.length > 0) {
        const goal = savingsGoals[0];
        const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
        
        savingsGoal = {
          name: goal.name,
          target: goal.targetAmount,
          current: goal.currentAmount,
          progress
        };
      }
      
      // Проверка, нужно ли планировать бюджет
      // В реальном приложении это может зависеть от наличия бюджета на текущий месяц
      const needsBudgetPlanning = true;
      
      // Получаем транзакции пользователя
      const userTransactions = await storage.getTransactionsByUser(req.user.id);
      
      // Группируем транзакции по категориям для расчета расходов
      const userSpendingByCategory = userTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'expense') {
          acc[transaction.category] = (acc[transaction.category] || 0) + Math.abs(transaction.amount);
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Данные о категориях бюджета для текущего пользователя
      const categoryBudgets = [
        { name: "Еда", allocated: 15000, spent: userSpendingByCategory["Еда"] || 0, color: "bg-orange-500" },
        { name: "Транспорт", allocated: 8000, spent: userSpendingByCategory["Транспорт"] || 0, color: "bg-blue-500" },
        { name: "Развлечения", allocated: 6000, spent: userSpendingByCategory["Развлечения"] || 0, color: "bg-purple-500" },
        { name: "Обязательные платежи", allocated: 20000, spent: userSpendingByCategory["Обязательные платежи"] || 0, color: "bg-red-500" },
        { name: "Одежда", allocated: 5000, spent: userSpendingByCategory["Одежда"] || 0, color: "bg-indigo-500" },
        { name: "Здоровье", allocated: 4000, spent: userSpendingByCategory["Здоровье"] || 0, color: "bg-green-500" },
        { name: "Образование", allocated: 3000, spent: userSpendingByCategory["Образование"] || 0, color: "bg-amber-500" },
        { name: "Другое", allocated: 4000, spent: userSpendingByCategory["Другое"] || 0, color: "bg-gray-500" },
      ];
      
      // Текущий месяц для заголовка
      const currentDate = new Date();
      const month = currentDate.toLocaleString('ru-RU', { month: 'long' });
      const year = currentDate.getFullYear();
      const currentPeriod = `${month} ${year}`;
      
      res.json({
        balance,
        monthlyExpenses: expenses,
        savingsGoal,
        needsBudgetPlanning,
        categoryBudgets,
        currentPeriod
      });
    } catch (error) {
      console.error("Error getting budget summary:", error);
      res.status(500).json({ message: "Ошибка при получении сводки бюджета" });
    }
  });
  
  // Маршруты для транзакций
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const transactions = await storage.getTransactions(req.user.familyId);
      res.json(transactions);
    } catch (error) {
      console.error("Error getting transactions:", error);
      res.status(500).json({ message: "Ошибка при получении транзакций" });
    }
  });
  
  app.post("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const { description, amount, type, category, date } = req.body;
      
      const transaction = await storage.createTransaction({
        description,
        amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
        type,
        category,
        date,
        userId: req.user.id,
        familyId: req.user.familyId
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Ошибка при создании транзакции" });
    }
  });
  
  app.put("/api/transactions/:id", isAuthenticated, canEditTransaction, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { description, amount, type, category, date } = req.body;
      
      const updatedTransaction = await storage.updateTransaction(transactionId, {
        description,
        amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
        type,
        category,
        date
      });
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Транзакция не найдена" });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Ошибка при обновлении транзакции" });
    }
  });
  
  app.delete("/api/transactions/:id", isAuthenticated, canEditTransaction, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const result = await storage.deleteTransaction(transactionId);
      
      if (!result) {
        return res.status(404).json({ message: "Транзакция не найдена" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Ошибка при удалении транзакции" });
    }
  });
  
  // Маршруты для категорий расходов
  app.get("/api/spending-categories", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      // Получаем транзакции пользователя для расчета
      const transactions = await storage.getTransactionsByUser(req.user.id);
      
      // Фильтруем только расходы
      const expenses = transactions.filter(tx => tx.type === "expense");
      
      // Если нет расходов, добавляем демо-данные
      if (expenses.length === 0) {
        // Добавляем демо-транзакции для отображения категорий
        return res.json([
          { name: "Еда", percentage: 35, color: '#F97316' },
          { name: "Транспорт", percentage: 20, color: '#3B82F6' },
          { name: "Развлечения", percentage: 15, color: '#10B981' },
          { name: "Обязательные", percentage: 25, color: '#EF4444' },
          { name: "Прочее", percentage: 5, color: '#F59E0B' }
        ]);
      }
      
      // Считаем общую сумму расходов
      const totalExpenses = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      // Группируем по категориям и считаем процентное соотношение
      const categoriesMap = new Map();
      
      expenses.forEach(expense => {
        const categoryAmount = categoriesMap.get(expense.category) || 0;
        categoriesMap.set(expense.category, categoryAmount + Math.abs(expense.amount));
      });
      
      // Цвета для категорий
      const colors: Record<string, string> = {
        'Еда': '#F97316',
        'Транспорт': '#3B82F6',
        'Развлечения': '#10B981',
        'Обязательные': '#EF4444',
        'Прочее': '#F59E0B'
      };
      
      // Формируем результат
      const categories = Array.from(categoriesMap.entries()).map(([name, amount]) => {
        const percentage = totalExpenses ? Math.round((amount as number / totalExpenses) * 100) : 0;
        return {
          name,
          percentage,
          color: colors[name] || '#94A3B8'
        };
      });
      
      res.json(categories);
    } catch (error) {
      console.error("Error getting spending categories:", error);
      res.status(500).json({ message: "Ошибка при получении категорий расходов" });
    }
  });

  // Маршруты для сберегательных целей
  app.get("/api/savings-goals", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const goals = await storage.getSavingsGoals(req.user.familyId);
      res.json(goals);
    } catch (error) {
      console.error("Error getting savings goals:", error);
      res.status(500).json({ message: "Ошибка при получении сберегательных целей" });
    }
  });
  
  app.post("/api/savings-goals", isAuthenticated, isParent, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const { name, targetAmount, currentAmount, deadline, description } = req.body;
      
      const goal = await storage.createSavingsGoal({
        name,
        targetAmount,
        currentAmount: currentAmount || 0,
        deadline,
        description: description || "",
        familyId: req.user.familyId
      });
      
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating savings goal:", error);
      res.status(500).json({ message: "Ошибка при создании сберегательной цели" });
    }
  });
  
  app.put("/api/savings-goals/:id", isAuthenticated, isParent, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const { name, targetAmount, deadline, description } = req.body;
      
      const updatedGoal = await storage.updateSavingsGoal(goalId, {
        name,
        targetAmount,
        deadline,
        description
      });
      
      if (!updatedGoal) {
        return res.status(404).json({ message: "Сберегательная цель не найдена" });
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating savings goal:", error);
      res.status(500).json({ message: "Ошибка при обновлении сберегательной цели" });
    }
  });
  
  app.delete("/api/savings-goals/:id", isAuthenticated, isParent, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const result = await storage.deleteSavingsGoal(goalId);
      
      if (!result) {
        return res.status(404).json({ message: "Сберегательная цель не найдена" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting savings goal:", error);
      res.status(500).json({ message: "Ошибка при удалении сберегательной цели" });
    }
  });
  
  // Маршруты для истории накоплений
  app.get("/api/savings-goals/:id/history", isAuthenticated, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const history = await storage.getSavingsHistory(goalId);
      res.json(history);
    } catch (error) {
      console.error("Error getting savings history:", error);
      res.status(500).json({ message: "Ошибка при получении истории накоплений" });
    }
  });
  
  app.post("/api/savings-goals/:id/deposit", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(400).json({ message: "Пользователь не идентифицирован" });
      }

      const goalId = parseInt(req.params.id);
      const { amount, description } = req.body;
      
      // Получаем текущую цель
      const goal = await storage.getSavingsGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Сберегательная цель не найдена" });
      }
      
      // Обновляем текущую сумму накоплений
      const updatedGoal = await storage.updateSavingsGoal(goalId, {
        currentAmount: goal.currentAmount + amount
      });
      
      // Создаем запись в истории
      const history = await storage.createSavingsHistory({
        amount,
        description,
        date: new Date().toISOString().split('T')[0],
        type: "deposit",
        goalId,
        userId: req.user.id
      });
      
      res.status(201).json({
        goal: updatedGoal,
        history
      });
    } catch (error) {
      console.error("Error depositing to savings goal:", error);
      res.status(500).json({ message: "Ошибка при добавлении средств к сберегательной цели" });
    }
  });
  
  app.post("/api/savings-goals/:id/withdraw", isAuthenticated, isParent, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(400).json({ message: "Пользователь не идентифицирован" });
      }

      const goalId = parseInt(req.params.id);
      const { amount, description } = req.body;
      
      // Получаем текущую цель
      const goal = await storage.getSavingsGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Сберегательная цель не найдена" });
      }
      
      // Проверяем достаточно ли средств
      if (goal.currentAmount < amount) {
        return res.status(400).json({ message: "Недостаточно средств для снятия" });
      }
      
      // Обновляем текущую сумму накоплений
      const updatedGoal = await storage.updateSavingsGoal(goalId, {
        currentAmount: goal.currentAmount - amount
      });
      
      // Создаем запись в истории
      const history = await storage.createSavingsHistory({
        amount,
        description,
        date: new Date().toISOString().split('T')[0],
        type: "withdrawal",
        goalId,
        userId: req.user.id
      });
      
      res.status(201).json({
        goal: updatedGoal,
        history
      });
    } catch (error) {
      console.error("Error withdrawing from savings goal:", error);
      res.status(500).json({ message: "Ошибка при снятии средств из сберегательной цели" });
    }
  });
  
  // Маршруты для обязательных платежей (доступны только родителям)
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const payments = await storage.getPayments(req.user.familyId);
      res.json(payments);
    } catch (error) {
      console.error("Error getting payments:", error);
      res.status(500).json({ message: "Ошибка при получении обязательных платежей" });
    }
  });
  
  app.post("/api/payments", isAuthenticated, isParent, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }

      const { name, amount, dueDate, category, isCompleted } = req.body;
      
      const payment = await storage.createPayment({
        name,
        amount,
        dueDate,
        category,
        isCompleted: isCompleted || false,
        familyId: req.user.familyId
      });
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Ошибка при создании обязательного платежа" });
    }
  });
  
  app.put("/api/payments/:id", isAuthenticated, isParent, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { name, amount, dueDate, category, isCompleted } = req.body;
      
      const updatedPayment = await storage.updatePayment(paymentId, {
        name,
        amount,
        dueDate,
        category,
        isCompleted
      });
      
      if (!updatedPayment) {
        return res.status(404).json({ message: "Обязательный платеж не найден" });
      }
      
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ message: "Ошибка при обновлении обязательного платежа" });
    }
  });
  
  app.delete("/api/payments/:id", isAuthenticated, isParent, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const result = await storage.deletePayment(paymentId);
      
      if (!result) {
        return res.status(404).json({ message: "Обязательный платеж не найден" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Ошибка при удалении обязательного платежа" });
    }
  });
  
  // Маршрут для планирования бюджета на месяц
  app.post("/api/budget-planning", isAuthenticated, isParent, async (req, res) => {
    try {
      if (!req.user?.familyId) {
        return res.status(400).json({ message: "Пользователь не принадлежит ни к одной семье" });
      }
      
      const { totalBudget, categoryAllocations } = req.body;
      
      if (!totalBudget || !categoryAllocations) {
        return res.status(400).json({ message: "Не указан общий бюджет или распределение по категориям" });
      }
      
      // Проверим, что сумма распределений не превышает общий бюджет
      const totalAllocated = Object.values(categoryAllocations).reduce((sum: number, amount: any) => sum + Number(amount), 0);
      
      if (totalAllocated > totalBudget) {
        return res.status(400).json({ message: "Сумма распределений превышает общий бюджет" });
      }
      
      // В реальном приложении здесь будет сохранение данных в БД
      // Для прототипа просто возвращаем успешный результат
      
      // Определяем текущий месяц и год
      const currentDate = new Date();
      const month = currentDate.toLocaleString('ru-RU', { month: 'long' });
      const year = currentDate.getFullYear();
      
      res.status(201).json({ 
        success: true, 
        message: "Бюджет на месяц успешно спланирован",
        plannedBudget: {
          totalBudget,
          categoryAllocations,
          month: `${month} ${year}`,
          unallocated: totalBudget - totalAllocated
        }
      });
    } catch (error) {
      console.error("Error planning budget:", error);
      res.status(500).json({ message: "Ошибка при планировании бюджета" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
