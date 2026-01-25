# Chess Battle

Мультиплеерная шахматная игра для Base Mini App с ETH-ставками и голосовым общением с AI-фигурами.

## Возможности

- 🎮 Мультиплеерные игры 1v1
- 💰 ETH ставки через смарт-контракт на Base
- 🔐 Безопасный эскроу - средства на контракте до завершения игры
- 🎤 Голосовое общение с AI-фигурами (Gemini Live API)
- 📱 Base Mini App / Farcaster Frame интерфейс
- ⚡ Real-time обновления через WebSocket

## Структура проекта

```
ChessInTg/
├── backend/          # Backend сервер (Node.js + TypeScript)
├── src/              # Frontend (React + TypeScript)
└── public/           # Статические файлы
```

## Быстрый старт

### Backend

1. Перейдите в директорию backend:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте `.env` файл (см. `backend/.env.example`)

4. Запустите миграции базы данных:
```bash
npm run db:push
npm run db:generate
```

5. Запустите сервер:
```bash
npm run dev
```

### Frontend

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения (создайте `.env.local`):
```
VITE_WS_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

3. Запустите dev сервер:
```bash
npm run dev
```

## Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Добавьте токен в `backend/.env`:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

4. Настройте Web App:
   - В BotFather выберите вашего бота
   - Выберите "Bot Settings" -> "Menu Button"
   - Установите URL вашего Web App

## Платежные интеграции

### Внутренние токены
Работают из коробки - виртуальная валюта платформы.

### Telegram Stars
Требует настройки через Telegram Bot API.

### Криптовалюты (TON, USDT)
Требуют интеграции с блокчейном.

### Платежные системы
Требуют интеграции с платежными шлюзами (YooKassa, Stripe и т.д.).

## Разработка

### Backend API
См. `backend/README.md` для деталей.

### Frontend
Frontend использует React + TypeScript и адаптирован для работы как в Telegram Web App, так и в standalone режиме.

## Base Mini App Deployment

### 1. Deploy Smart Contract

```bash
cd contracts
npm install
# Configure .env with DEPLOYER_PRIVATE_KEY
npm run deploy:base
```

После деплоя сохраните адрес контракта в `.env`:
```
CHESS_ESCROW_CONTRACT_ADDRESS=0x...
```

### 2. Configure MiniKit

1. Задеплойте frontend на Vercel
2. Перейдите на https://www.base.dev/preview?tab=account
3. Введите URL вашего приложения
4. Сгенерируйте `accountAssociation` credentials
5. Обновите `public/.well-known/farcaster.json` с credentials

### 3. Environment Variables

**Frontend (.env.local):**
```
VITE_API_URL=https://api.your-domain.com
VITE_WS_URL=wss://api.your-domain.com
VITE_BASE_RPC_URL=https://mainnet.base.org
VITE_CHESS_ESCROW_CONTRACT_ADDRESS=0x...
VITE_APP_URL=https://your-app.vercel.app
```

**Backend (.env):**
```
BASE_RPC_URL=https://mainnet.base.org
CHESS_ESCROW_CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...  # Wallet with ETH for gas
PLATFORM_WALLET_ADDRESS=0x...
```

### 4. Oracle Setup

Oracle кошелек должен иметь:
- Достаточно ETH на Base для оплаты газа (~0.01 ETH)
- Быть настроен как oracle в смарт-контракте

## Как работают ставки

1. **Создание игры**: Игрок 1 вызывает `createGame()` на контракте, отправляя ETH
2. **Присоединение**: Игрок 2 вызывает `joinGame()` с такой же суммой ETH
3. **Игра**: Ходы обрабатываются через WebSocket backend
4. **Завершение**: Backend Oracle вызывает `declareWinner()` на контракте
5. **Выплата**: Контракт автоматически отправляет выигрыш победителю

## Лицензия

MIT
