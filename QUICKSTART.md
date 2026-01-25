# Быстрый старт

## Шаг 1: Настройка Backend

```bash
cd backend
npm install

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env и добавьте:
# - DATABASE_URL (PostgreSQL)
# - TELEGRAM_BOT_TOKEN
# - GEMINI_API_KEY

# Настройте базу данных
npm run db:push
npm run db:generate

# Запустите сервер
npm run dev
```

## Шаг 2: Настройка Frontend

```bash
# В корневой директории проекта
npm install

# Создайте .env.local
echo "VITE_WS_URL=http://localhost:3001" > .env.local
echo "VITE_API_URL=http://localhost:3001" >> .env.local

# Запустите dev сервер
npm run dev
```

## Шаг 3: Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Скопируйте токен бота
4. Добавьте токен в `backend/.env` как `TELEGRAM_BOT_TOKEN`

## Шаг 4: Настройка Web App

1. В BotFather выберите вашего бота
2. Выберите "Bot Settings" -> "Menu Button"
3. Установите URL: `http://localhost:3000` (для разработки) или ваш production URL

## Шаг 5: Тестирование

1. Запустите backend: `cd backend && npm run dev`
2. Запустите frontend: `npm run dev`
3. Откройте бота в Telegram
4. Отправьте `/start`
5. Создайте игру через `/play`

## Структура проекта

- `backend/` - Backend сервер (Node.js + TypeScript + PostgreSQL)
- `src/` - Frontend (React + TypeScript)
- `public/` - Статические файлы

## Полезные команды

### Backend
- `npm run dev` - Запуск в режиме разработки
- `npm run build` - Сборка для production
- `npm run db:push` - Применить изменения схемы БД
- `npm run db:generate` - Сгенерировать Prisma Client
- `npm run db:studio` - Открыть Prisma Studio

### Frontend
- `npm run dev` - Запуск dev сервера
- `npm run build` - Сборка для production
- `npm run preview` - Предпросмотр production сборки

## Troubleshooting

### База данных не подключается
- Проверьте DATABASE_URL в `.env`
- Убедитесь, что PostgreSQL запущен
- Проверьте права доступа к базе данных

### Telegram бот не отвечает
- Проверьте TELEGRAM_BOT_TOKEN в `.env`
- Убедитесь, что backend сервер запущен
- Проверьте логи backend сервера

### WebSocket не подключается
- Проверьте VITE_WS_URL в `.env.local`
- Убедитесь, что backend сервер запущен на правильном порту
- Проверьте CORS настройки в backend

## Следующие шаги

1. Настройте платежные интеграции (см. `backend/src/integrations/`)
2. Настройте production окружение (см. `DEPLOYMENT.md`)
3. Добавьте мониторинг и логирование
4. Настройте CI/CD

