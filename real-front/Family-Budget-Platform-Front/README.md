# Family Budget Management System

Платформа для совместного управления семейным бюджетом с детализированным отслеживанием финансов и персонализированным распределением бюджета между членами семьи и категориями расходов.

## 🚀 Технологии

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, Node.js
- **Authentication:** Keycloak OAuth2/JWT
- **Database:** PostgreSQL
- **Architecture:** Микросервисная архитектура

## 🏗️ Архитектура

Система состоит из трех микросервисов:

- **User Service** (port 8081) - Управление пользователями и семьями
- **Transaction Service** (port 8082) - Обработка транзакций
- **Family Budget Service** (port 8083) - Планирование бюджета, цели и платежи

## 📋 Функции

### Аутентификация
- Вход через Keycloak
- Регистрация новых пользователей
- Управление паролями

### Управление семьей
- Создание и управление семьей
- Добавление членов семьи (только родители)
- Роли: PARENT (родитель) и USER (пользователь)

### Финансовый учет
- Отслеживание доходов и расходов
- Категоризация транзакций
- История операций
- Месячная отчетность

### Планирование бюджета
- Обязательные платежи семьи
- Сберегательные цели
- Бюджетирование по категориям
- Мониторинг выполнения планов

## 🛠️ Установка и запуск

### Требования
- Node.js 18+
- PostgreSQL
- Keycloak (настроенный на порту 1111)

### Запуск в development режиме

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения в `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/family_budget
```

3. Запустите приложение:
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3001

## 🔧 API Endpoints

### User Service (localhost:8081)
- `GET /v1/users/whoami` - Текущий пользователь
- `GET /v1/family/members/{familyId}` - Члены семьи
- `POST /v1/api/user` - Добавление члена семьи
- `PUT /v1/users/{email}` - Обновление профиля
- `POST /v1/users/change-password` - Смена пароля

### Transaction Service (localhost:8082)
- `GET /v1/transaction/by-param?periodId=` - Транзакции по периоду
- `POST /v1/transaction` - Создание транзакции

### Family Budget Service (localhost:8083)
- `GET /v1/budget-period` - Текущий период
- `GET /v1/user-budget?periodId=` - Бюджет пользователя
- `GET /v1/category` - Категории
- `GET /v1/mandatory-payment/family/{familyId}` - Обязательные платежи
- `POST /v1/mandatory-payment/` - Создание платежа
- `PUT /v1/mandatory-payment/{paymentId}` - Закрытие платежа
- `DELETE /v1/mandatory-payment/{paymentId}` - Удаление платежа

## 👥 Роли пользователей

### PARENT (Родитель)
- Полный доступ ко всем функциям
- Управление членами семьи
- Создание и управление обязательными платежами
- Управление сберегательными целями

### USER (Пользователь)
- Просмотр информации о семье
- Создание собственных транзакций
- Просмотр обязательных платежей (без редактирования)
- Просмотр семейного бюджета

## 🔐 Настройка Keycloak

Для работы аутентификации необходимо настроить Keycloak:

1. Realm: `family-budget`
2. Client ID: `family-budget-client`
3. Redirect URLs: `http://localhost:3001/*`
4. Web Origins: `http://localhost:3001`

## 📱 Страницы приложения

- **Дашборд** - Обзор финансов семьи
- **Транзакции** - История и создание операций
- **Обязательные платежи** - Управление регулярными расходами
- **Состав семьи** - Управление членами семьи
- **Сбережения** - Цели накоплений
- **Профиль** - Настройки пользователя

## 🤝 Участие в разработке

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.