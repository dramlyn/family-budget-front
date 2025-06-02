import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, userRoles } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware для проверки, является ли пользователь родителем
export function isParent(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется аутентификация" });
  }
  
  if (req.user.role !== userRoles.PARENT) {
    return res.status(403).json({ message: "Доступ запрещен. Требуются права родителя" });
  }
  
  next();
}

// Middleware для проверки, принадлежит ли пользователь к той же семье
export function isSameFamily(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется аутентификация" });
  }
  
  const familyId = parseInt(req.params.familyId || req.body.familyId);
  
  if (!familyId || req.user.familyId !== familyId) {
    return res.status(403).json({ message: "Доступ запрещен. Вы не являетесь членом этой семьи" });
  }
  
  next();
}

// Middleware для проверки, что пользователь может редактировать транзакцию
export function canEditTransaction(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется аутентификация" });
  }
  
  const transactionId = parseInt(req.params.id);
  
  // Родитель может редактировать любые транзакции
  if (req.user.role === userRoles.PARENT) {
    return next();
  }
  
  // Получаем транзакцию и проверяем, принадлежит ли она пользователю
  storage.getTransaction(transactionId)
    .then(transaction => {
      if (!transaction) {
        return res.status(404).json({ message: "Транзакция не найдена" });
      }
      
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ message: "Доступ запрещен. Вы не можете редактировать чужие транзакции" });
      }
      
      next();
    })
    .catch(err => {
      next(err);
    });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "family-budget-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Неверное имя пользователя или пароль" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Регистрация нового пользователя (только родители-основатели семьи)
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email } = req.body;
      
      // Проверка на существующего пользователя
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Имя пользователя уже занято" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email уже используется" });
      }
      
      // Создание новой семьи
      const familyName = req.body.familyName || `Семья ${req.body.lastName || username}`;
      const family = await storage.createFamily(familyName);
      
      // Создание пользователя с ролью родителя и связью с семьей
      const user = await storage.createUser({
        ...req.body,
        role: userRoles.PARENT,
        familyId: family.id,
        password: await hashPassword(req.body.password),
      });
      
      // Создание уведомления для нового пользователя
      await storage.createNotification({
        title: "Добро пожаловать!",
        message: `Вы успешно зарегистрировались в приложении "Семейный бюджет". Теперь вы можете добавить членов своей семьи.`,
        userId: user.id,
        isRead: false,
      });
      
      // Аутентификация нового пользователя
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Авторизация пользователя
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Неверное имя пользователя или пароль" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Выход из системы
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Получение данных текущего пользователя
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Забыли пароль
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security reasons, don't reveal that the email doesn't exist
        return res.status(200).json({ message: "Если указанный email зарегистрирован, инструкции по восстановлению пароля будут отправлены." });
      }
      
      // In a real app, we would send an email with a reset link
      // For this demo, we'll just return a success message
      res.status(200).json({ message: "Инструкции по восстановлению пароля отправлены на ваш email" });
    } catch (error) {
      res.status(500).json({ message: "Произошла ошибка при обработке запроса" });
    }
  });
  
  // Только для родителей: добавление нового члена семьи (пользователя)
  app.post("/api/family/member", isParent, async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName, role } = req.body;
      
      // Проверка на существующего пользователя
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }
      
      // Проверка кол-ва родителей в семье
      if (role === userRoles.PARENT) {
        const parents = await storage.getUsersByRole(req.user.familyId, userRoles.PARENT);
        if (parents.length >= 2) {
          return res.status(400).json({ message: "В семье уже 2 родителя, нельзя добавить больше" });
        }
      }
      
      // Создание нового пользователя в той же семье
      const newUser = await storage.createUser({
        username,
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        role: role || userRoles.USER,
        familyId: req.user.familyId,
      });
      
      // Создание уведомления для нового пользователя
      await storage.createNotification({
        title: "Добро пожаловать!",
        message: `Вы были добавлены в семью. Добро пожаловать в семейный бюджет!`,
        userId: newUser.id,
        isRead: false,
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  });
  
  // Получение всех членов семьи для текущего пользователя
  app.get("/api/family/members", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Требуется аутентификация" });
      
      const familyMembers = await storage.getUsersByFamilyId(req.user.familyId);
      res.json(familyMembers);
    } catch (error) {
      next(error);
    }
  });
  
  // Получение непрочитанных уведомлений
  app.get("/api/notifications/unread", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Требуется аутентификация" });
      
      const notifications = await storage.getUnreadNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  });
  
  // Получение всех уведомлений
  app.get("/api/notifications", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Требуется аутентификация" });
      
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  });
  
  // Отметить уведомление как прочитанное
  app.post("/api/notifications/:id/read", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Требуется аутентификация" });
      
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Уведомление не найдено" });
      }
      
      res.json(notification);
    } catch (error) {
      next(error);
    }
  });
}
