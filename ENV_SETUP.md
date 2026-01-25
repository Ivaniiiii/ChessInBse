# Настройка переменных окружения

## Backend (.env)

Скопируйте `backend/.env.example` в `backend/.env` и заполните значения:

```bash
cd backend
cp .env.example .env
```

### Обязательные переменные:

1. **DATABASE_URL** - строка подключения к PostgreSQL
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/chess_tg?schema=public"
   ```

2. **TELEGRAM_BOT_TOKEN** - токен бота от @BotFather
   ```
   TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
   ```

3. **GEMINI_API_KEY** - ключ API от Google Gemini
   ```
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **WEB_APP_URL** - URL вашего фронтенда
   - Для разработки: `http://localhost:3000`
   - Для production: `https://your-domain.com`

### Опциональные переменные:

- **PORT** - порт сервера (по умолчанию 3001)
- **PLATFORM_COMMISSION** - комиссия платформы в процентах (по умолчанию 5)
- Платежные интеграции (Telegram Stars, криптовалюты, платежные шлюзы)

## Frontend (.env.local)

Создайте файл `.env.local` в корне проекта:

```bash
cp .env.local.example .env.local
```

### Обязательные переменные:

1. **VITE_API_URL** - URL backend API
   ```
   VITE_API_URL="http://localhost:3001"
   ```

2. **VITE_WS_URL** - URL WebSocket сервера
   ```
   VITE_WS_URL="http://localhost:3001"
   ```

## Примеры конфигураций

### Локальная разработка

**backend/.env:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_tg_dev"
TELEGRAM_BOT_TOKEN="your_test_bot_token"
GEMINI_API_KEY="your_gemini_key"
PORT=3001
NODE_ENV=development
WEB_APP_URL="http://localhost:3000"
PLATFORM_COMMISSION=5
```

**.env.local:**
```env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="http://localhost:3001"
```

### Production

**backend/.env:**
```env
DATABASE_URL="postgresql://user:password@db.example.com:5432/chess_tg"
TELEGRAM_BOT_TOKEN="your_production_bot_token"
GEMINI_API_KEY="your_production_gemini_key"
PORT=3001
NODE_ENV=production
WEB_APP_URL="https://chess-tg.example.com"
PLATFORM_COMMISSION=5
TELEGRAM_STARS_API_KEY="your_stars_api_key"
```

**.env.local (для сборки):**
```env
VITE_API_URL="https://api.example.com"
VITE_WS_URL="wss://api.example.com"
```

## Тестирование Telegram Web App локально

Для тестирования Telegram Mini App локально используйте ngrok:

1. Установите ngrok: https://ngrok.com/
2. Запустите фронтенд: `npm run dev`
3. В другом терминале запустите ngrok:
   ```bash
   ngrok http 3000
   ```
4. Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)
5. Установите в `backend/.env`:
   ```
   WEB_APP_URL="https://abc123.ngrok.io"
   ```
6. Настройте Menu Button в BotFather с этим URL

## Безопасность

⚠️ **ВАЖНО:**
- Никогда не коммитьте `.env` и `.env.local` файлы в git
- Используйте разные токены для development и production
- Храните секретные ключи в безопасном месте
- Используйте переменные окружения на сервере вместо файлов .env в production

## Проверка конфигурации

После настройки переменных окружения:

1. **Backend:**
   ```bash
   cd backend
   npm run db:push  # Проверит подключение к БД
   npm run dev      # Запустит сервер
   ```

2. **Frontend:**
   ```bash
   npm run dev      # Запустит dev сервер
   ```

Если есть ошибки, проверьте:
- Правильность значений в .env файлах
- Доступность базы данных
- Корректность токенов и API ключей

