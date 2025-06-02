import { 
  users, families, transactions, savingsGoals, savingsHistory, familyMembers, payments, notifications,
  type User, type InsertUser, type Family, type Transaction, type SavingsGoal, type SavingsHistory, 
  type FamilyMember, type Payment, type Notification, userRoles
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Пользователи
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User | undefined>;
  getUsersByFamilyId(familyId: number): Promise<User[]>;
  getUsersByRole(familyId: number, role: string): Promise<User[]>;
  
  // Семьи
  getFamily(id: number): Promise<Family | undefined>;
  createFamily(name: string): Promise<Family>;
  
  // Транзакции
  getTransactions(familyId: number): Promise<Transaction[]>;
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  updateTransaction(id: number, update: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Сберегательные цели
  getSavingsGoals(familyId: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, update: Partial<SavingsGoal>): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;
  
  // История накоплений
  getSavingsHistory(goalId: number): Promise<SavingsHistory[]>;
  createSavingsHistory(history: Omit<SavingsHistory, 'id' | 'createdAt'>): Promise<SavingsHistory>;
  
  // Члены семьи
  getFamilyMembers(familyId: number): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt'>): Promise<FamilyMember>;
  updateFamilyMember(id: number, update: Partial<FamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: number): Promise<boolean>;
  
  // Обязательные платежи
  getPayments(familyId: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
  updatePayment(id: number, update: Partial<Payment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<boolean>;
  
  // Уведомления
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private families: Map<number, Family>;
  private transactions: Map<number, Transaction>;
  private savingsGoals: Map<number, SavingsGoal>;
  private savingsHistory: Map<number, SavingsHistory>;
  private familyMembers: Map<number, FamilyMember>;
  private payments: Map<number, Payment>;
  private notifications: Map<number, Notification>;
  
  private userIdCounter: number;
  private familyIdCounter: number;
  private transactionIdCounter: number;
  private savingsGoalIdCounter: number;
  private savingsHistoryIdCounter: number;
  private familyMemberIdCounter: number;
  private paymentIdCounter: number;
  private notificationIdCounter: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.families = new Map();
    this.transactions = new Map();
    this.savingsGoals = new Map();
    this.savingsHistory = new Map();
    this.familyMembers = new Map();
    this.payments = new Map();
    this.notifications = new Map();
    
    this.userIdCounter = 1;
    this.familyIdCounter = 1;
    this.transactionIdCounter = 1;
    this.savingsGoalIdCounter = 1;
    this.savingsHistoryIdCounter = 1;
    this.familyMemberIdCounter = 1;
    this.paymentIdCounter = 1;
    this.notificationIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Добавляем демо данные для тестирования
    this.setupDemoData();
  }

  // Методы для пользователей
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, update: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...update };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsersByFamilyId(familyId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.familyId === familyId,
    );
  }
  
  async getUsersByRole(familyId: number, role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.familyId === familyId && user.role === role,
    );
  }
  
  // Методы для семей
  async getFamily(id: number): Promise<Family | undefined> {
    return this.families.get(id);
  }
  
  async createFamily(name: string): Promise<Family> {
    const id = this.familyIdCounter++;
    const createdAt = new Date();
    const family: Family = { id, name, createdAt };
    this.families.set(id, family);
    return family;
  }
  
  // Методы для транзакций
  async getTransactions(familyId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.familyId === familyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const createdAt = new Date();
    const newTransaction: Transaction = { ...transaction, id, createdAt };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async updateTransaction(id: number, update: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...update };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  // Методы для сберегательных целей
  async getSavingsGoals(familyId: number): Promise<SavingsGoal[]> {
    return Array.from(this.savingsGoals.values())
      .filter(goal => goal.familyId === familyId);
  }
  
  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    return this.savingsGoals.get(id);
  }
  
  async createSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'createdAt'>): Promise<SavingsGoal> {
    const id = this.savingsGoalIdCounter++;
    const createdAt = new Date();
    const newGoal: SavingsGoal = { ...goal, id, createdAt };
    this.savingsGoals.set(id, newGoal);
    return newGoal;
  }
  
  async updateSavingsGoal(id: number, update: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const goal = this.savingsGoals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...update };
    this.savingsGoals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  async deleteSavingsGoal(id: number): Promise<boolean> {
    return this.savingsGoals.delete(id);
  }
  
  // Методы для истории накоплений
  async getSavingsHistory(goalId: number): Promise<SavingsHistory[]> {
    return Array.from(this.savingsHistory.values())
      .filter(history => history.goalId === goalId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createSavingsHistory(history: Omit<SavingsHistory, 'id' | 'createdAt'>): Promise<SavingsHistory> {
    const id = this.savingsHistoryIdCounter++;
    const createdAt = new Date();
    const newHistory: SavingsHistory = { ...history, id, createdAt };
    this.savingsHistory.set(id, newHistory);
    return newHistory;
  }
  
  // Методы для членов семьи
  async getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values())
      .filter(member => member.familyId === familyId);
  }
  
  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }
  
  async createFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt'>): Promise<FamilyMember> {
    const id = this.familyMemberIdCounter++;
    const createdAt = new Date();
    const newMember: FamilyMember = { ...member, id, createdAt };
    this.familyMembers.set(id, newMember);
    return newMember;
  }
  
  async updateFamilyMember(id: number, update: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const member = this.familyMembers.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, ...update };
    this.familyMembers.set(id, updatedMember);
    return updatedMember;
  }
  
  async deleteFamilyMember(id: number): Promise<boolean> {
    return this.familyMembers.delete(id);
  }
  
  // Методы для обязательных платежей
  async getPayments(familyId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.familyId === familyId);
  }
  
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const id = this.paymentIdCounter++;
    const createdAt = new Date();
    const newPayment: Payment = { ...payment, id, createdAt };
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async updatePayment(id: number, update: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...update };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  async deletePayment(id: number): Promise<boolean> {
    return this.payments.delete(id);
  }
  
  // Методы для уведомлений
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const createdAt = new Date();
    const newNotification: Notification = { ...notification, id, createdAt };
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  // Метод для создания демо-данных
  private setupDemoData() {
    // Пример: добавление демо-транзакций
    const demoTransactions = [
      {
        id: this.transactionIdCounter++,
        date: "15 мая",
        description: "Продукты в магазине",
        amount: -5200,
        category: "Еда",
        type: "expense",
        userId: 1,
        familyId: 1,
        createdAt: new Date("2023-05-15")
      },
      {
        id: this.transactionIdCounter++,
        date: "12 мая",
        description: "Зарплата",
        amount: 65000,
        category: "Доход",
        type: "income",
        userId: 1,
        familyId: 1,
        createdAt: new Date("2023-05-12")
      },
      {
        id: this.transactionIdCounter++,
        date: "10 мая",
        description: "Кино с семьей",
        amount: -2800,
        category: "Развлечения",
        type: "expense",
        userId: 1,
        familyId: 1,
        createdAt: new Date("2023-05-10")
      }
    ];
    
    demoTransactions.forEach(tx => {
      this.transactions.set(tx.id, tx as Transaction);
    });
  }
}

export const storage = new MemStorage();
