# Water Meters List (React + TypeScript + MST)

Тестовое приложение для отображения списка счётчиков горячей и холодной воды.

## Стек

- React 19
- TypeScript
- mobx-state-tree
- Vite

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`.

## Скрипты

- `npm run dev` — запуск в режиме разработки
- `npm run lint` — проверка ESLint
- `npx tsc -b` — проверка типов TypeScript
- `npm run check` — lint + typecheck
- `npm run format` — форматирование Prettier
- `npm run build` — прод-сборка

## Архитектура

### Слои

- `src/api.ts`
  - HTTP-запросы (`GET meters`, `GET areas`, `DELETE meter`)
  - нормализация нестабильного формата API
  - безопасная обработка разных ключей ответа (`results`, `data`, `items`, ...)
- `src/store.ts`
  - MST-модели и корневой стор
  - загрузка страниц (`limit=20`, `offset`)
  - кэш адресов (не запрашиваем уже известные `areaId`)
  - удаление счётчика с повторной загрузкой текущей страницы
- `src/App.tsx`
  - UI таблицы
  - внутренний скролл
  - пагинация
  - hover-кнопка удаления

### Поток данных

1. `store.fetchPage(offset)` вызывает `fetchMeters(limit, offset)`.
2. Результат нормализуется и попадает в `store.meters`.
3. Для неизвестных `areaId` вызывается `fetchAreasByIds(...)` параллельно.
4. Адреса сохраняются в `store.addresses` (map-кэш).
5. UI реагирует на изменения стора и перерисовывает таблицу.

## Принятые решения

- `id` и `area.id` в API строковые (`ObjectId`) — вся модель хранит их как `string`.
- Адрес нормализуется из нескольких источников, в том числе:
  - `house.address`
  - `str_number_full` / `str_number` / `number`
- Для защиты от гонок запросов в сторе используется:
  - `AbortController` (отмена старого запроса)
  - `fetchVersion` (игнор устаревших ответов)
- API-base задан как `https://showroom.eis24.me/c300/api/v4/test`.

## Качество и стабильность

- Линтер и типизация должны проходить перед сдачей.
- Проверка безопасности зависимостей:
  - `npm audit` (на момент последней проверки — без уязвимостей).
- Из проекта удалены лишние dev-зависимости от старой babel-конфигурации.

## Ручная проверка

Используйте подробный чек-лист:

- [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md)
