# Руководство по деплою

## Требования

- Node.js 20+
- PostgreSQL 14+
- Telegram Bot Token
- Gemini API Key

## Локальная разработка

### Backend

1. Установите зависимости:
```bash
cd backend
npm install
```

2. Настройте базу данных:
```bash
# Создайте базу данных PostgreSQL
createdb chess_tg

# Настройте .env файл
cp .env.example .env
# Отредактируйте DATABASE_URL и другие переменные

# Запустите миграции
npm run db:push
npm run db:generate
```

3. Запустите сервер:
```bash
npm run dev
```

### Frontend

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
# Создайте .env.local
VITE_WS_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

3. Запустите dev сервер:
```bash
npm run dev
```

## Production деплой

### Backend

#### Вариант 1: Docker

```bash
cd backend
docker build -t chess-tg-backend .
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e TELEGRAM_BOT_TOKEN="..." \
  -e GEMINI_API_KEY="..." \
  chess-tg-backend
```

#### Вариант 2: PM2

```bash
cd backend
npm install -g pm2
npm run build
pm2 start dist/index.js --name chess-tg-backend
pm2 save
pm2 startup
```

### Frontend

#### Вариант 1: Vercel/Netlify

1. Подключите репозиторий к Vercel/Netlify
2. Настройте переменные окружения:
   - `VITE_WS_URL` - URL WebSocket сервера
   - `VITE_API_URL` - URL API сервера
3. Деплой автоматический при push в main

#### Вариант 2: Статический хостинг

```bash
npm run build
# Загрузите содержимое dist/ на ваш хостинг
```

### База данных

Рекомендуется использовать управляемый PostgreSQL (например, AWS RDS, DigitalOcean, Supabase).

### Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен и добавьте в `.env`
3. Настройте Web App:
   - Bot Settings -> Menu Button
   - Установите URL вашего фронтенда
   - Например: `https://your-domain.com`

## Переменные окружения

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@host:5432/chess_tg
TELEGRAM_BOT_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_key
PORT=3001
NODE_ENV=production
WEB_APP_URL=https://your-domain.com
PLATFORM_COMMISSION=5
```

### Frontend (.env.local)

```env
VITE_WS_URL=wss://your-backend-domain.com
VITE_API_URL=https://your-backend-domain.com
```

## Мониторинг

Рекомендуется настроить:
- Логирование (Winston, Pino)
- Мониторинг ошибок (Sentry)
- Метрики (Prometheus/Grafana)
- Health checks (`/health` endpoint)

## Масштабирование

Для масштабирования WebSocket:
- Используйте Redis для pub/sub между серверами
- Настройте sticky sessions или используйте Redis adapter для Socket.IO

Пример с Redis:
```bash
npm install @socket.io/redis-adapter redis
```

## Безопасность

- Используйте HTTPS для всех соединений
- Настройте CORS правильно
- Валидируйте все входные данные
- Используйте rate limiting
- Регулярно обновляйте зависимости

