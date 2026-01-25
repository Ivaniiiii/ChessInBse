# Chess Telegram Backend

Backend сервер для Telegram Chess Multiplayer с системой ставок.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте базу данных PostgreSQL и создайте файл `.env` на основе `.env.example`

3. Запустите миграции Prisma:
```bash
npm run db:push
# или
npm run db:migrate
```

4. Сгенерируйте Prisma Client:
```bash
npm run db:generate
```

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Структура проекта

- `src/bot/` - Telegram бот логика
- `src/api/` - REST API endpoints
- `src/websocket/` - WebSocket сервер
- `src/services/` - Бизнес-логика
- `src/db/` - Работа с базой данных
- `src/integrations/` - Платежные интеграции

## API Endpoints

### Games
- `POST /api/games` - создать игру
- `GET /api/games/:id` - получить игру
- `POST /api/games/:id/join` - присоединиться к игре
- `POST /api/games/:id/move` - сделать ход
- `GET /api/games/:id/moves` - история ходов

### Users
- `GET /api/users/:id/balance` - получить баланс
- `GET /api/users/:id/games` - история игр

### Payments
- `POST /api/payments/deposit` - пополнить баланс
- `POST /api/payments/withdraw` - вывести средства
- `GET /api/payments/:userId/transactions` - история транзакций

## WebSocket Events

### Client -> Server
- `join_game` - присоединиться к игре
- `leave_game` - покинуть игру
- `make_move` - сделать ход
- `get_moves` - получить историю ходов

### Server -> Client
- `game_state` - состояние игры
- `move_made` - ход сделан
- `move_success` - успешный ход
- `move_error` - ошибка хода
- `moves_history` - история ходов

## Переменные окружения

См. `.env.example` для полного списка переменных.

## База данных

Используется PostgreSQL с Prisma ORM. Схема определена в `prisma/schema.prisma`.

