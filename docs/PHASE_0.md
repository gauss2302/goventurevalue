# Phase 0 — платформенный спайк: результаты

Гейт из `docs/PRODUCT_PLAN.md` §7. Ниже — что проверено фактически, а что осталось
непроверенным и почему. Ничего не помечено зелёным «по аналогии» или «должно работать».

## Проверено фактически

| Пункт | Результат |
|---|---|
| TanStack Start собирается под Workers через `@cloudflare/vite-plugin` | ✅ `pnpm build` проходит. Server-бандл **0.71 МБ gzip** — с большим запасом под лимиты, важно для startup time ≤ 1 с (§5.3) |
| Порядок плагинов Vite | ✅ `cloudflare()` **первым**, затем `tanstackStart()`. Порядок несущий — иначе плагин не владеет SSR-окружением |
| Как получить env/биндинги в server functions | ✅ **`import { env } from "cloudflare:workers"`**. Это была главная неизвестная. Дополнительно нашёлся `waitUntil` из того же модуля — им закрывается соединение с БД, не задерживая ответ |
| Биндинги доезжают до собранного воркера | ✅ В `dist/server/wrangler.json` присутствуют `hyperdrive`, `kv_namespaces`, `r2_buckets`, `queues`, `ai`, `triggers.crons`, `compatibility_flags: ["nodejs_compat"]` |
| Типизация биндингов | ✅ `wrangler types` работает офлайн, без авторизации. `worker-configuration.d.ts` закоммичен, чтобы typecheck и CI были герметичны |
| Схема Drizzle ↔ сгенерированный SQL | ✅ Миграция применена к живому **Postgres 16.13** с `ON_ERROR_STOP=1`: 28 таблиц, 22 enum'а, 67 индексов |
| pgvector | ✅ Расширение 0.6.0, колонки `vector(768)`, **HNSW-индексы созданы**. Косинусное ранжирование проверено: расстояние 0 для совпадающего направления, 2 для противоположного |
| Drizzle + pg читают и пишут | ✅ 4 интеграционных теста в `src/db/schema.integration.test.ts` проходят против реального Postgres, включая запрос «публикуем только при принятом SLA» и срабатывание unique-констрейнта |
| `withDb` / `src/lib/env.ts` на не-Worker пути | ✅ Те же интеграционные тесты идут через `withDb`, то есть fallback-путь на `DATABASE_URL` рабочий |
| Контракт честности данных (§6.4) | ✅ 28 юнит-тестов, по одному блоку на каждое из шести правил |
| Typecheck и тесты | ✅ `pnpm typecheck` чист, `pnpm test` — 46 passed, 4 skipped (интеграционные, без БД) |

## Не проверено — нужен аккаунт Cloudflare

В этом окружении **нет `CLOUDFLARE_API_TOKEN` и нет базы Neon**, поэтому следующее
физически невозможно было проверить. Не считать сделанным.

| Пункт | Что именно неизвестно | Как проверить |
|---|---|---|
| **Реальный деплой** | `wrangler deploy` не запускался ни разу | `wrangler deploy` после `wrangler login` |
| **Hyperdrive → Neon** | Проверено соединение с Postgres напрямую, **не через Hyperdrive**. Латентность и поведение пула неизвестны | Создать Hyperdrive-конфиг, замерить p50/p95 запроса |
| **Латентность pgvector на объёме** | Корректность подтверждена, производительность — нет. Плана §7 требует замера на 50k вакансий | Засеять 50k строк в Neon, замерить HNSW-поиск |
| **`pnpm dev`** | Локальный dev **упирается в отсутствие токена**: биндинг `AI` не эмулируется локально, плагин открывает remote-сессию и требует `CLOUDFLARE_API_TOKEN` | Задать токен, либо временно убрать биндинг `ai` для офлайн-разработки |
| **Better Auth на Workers** | Код переписан на per-request factory, но **ни разу не исполнялся на Workers**. Google OAuth и KV secondaryStorage не проверены | Задеплоить, пройти OAuth-флоу |
| **Workers AI: эмбеддинги** | Модель и размерность (768) зафиксированы в коде, вызов не выполнялся | Вызвать `env.AI.run(EMBEDDING_MODEL, ...)` на задеплоенном воркере |
| **Queues producer → consumer** | Биндинг объявлен, обработчик не написан | Phase 2 |
| **`unpdf` внутри Worker** | Пакет установлен, **парсинг не запускался**. По документации нужны полифилы (`FinalizationRegistry`) и инлайн воркера pdf.js — это может потребовать правок сборки | Написать пробный Queue consumer, прогнать реальное PDF-резюме |
| **Polar SDK на Workers** | Код адаптирован (убран модульный кэш клиента, `process.env` → `optionalEnv`), но SDK на Workers не исполнялся. По плану §7 решение о переходе на Stripe принимается **здесь**, а не позже | Задеплоить и вызвать checkout в sandbox |

## Что нужно от тебя, чтобы закрыть гейт

1. **Аккаунт Cloudflare, план Paid** (§11.2). На Free спайк упрётся в 10 мс CPU и даст неверные выводы.
2. **База Neon** + `DATABASE_URL`.
3. `CLOUDFLARE_API_TOKEN` в окружении — без него не работает даже `pnpm dev`.

Команды провижининга после этого:

```bash
wrangler kv namespace create CACHE
wrangler r2 bucket create startup-jobs-files
wrangler queues create startup-jobs-work
wrangler queues create startup-jobs-work-dlq
wrangler hyperdrive create startup-jobs-db --connection-string="<neon-connection-string>"
# подставить выданные id в wrangler.jsonc вместо REPLACE_WITH_*
pnpm cf-typegen
```

Секреты:

```bash
wrangler secret put BETTER_AUTH_SECRET   # openssl rand -base64 32
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put OPENAI_API_KEY       # опционально, tier "accurate"
wrangler secret put GEMINI_API_KEY       # опционально, fallback
wrangler secret put POLAR_ACCESS_TOKEN   # опционально, Phase 4.5
```

Локальная база для миграций и интеграционных тестов:

```bash
createdb startup_jobs
psql -d startup_jobs -f drizzle/0000_wise_iron_man.sql
DATABASE_URL=postgresql://localhost/startup_jobs pnpm vitest run src/db
```

## Найденные ограничения, которые уже повлияли на код

1. **Hyperdrive-биндинг доступен только в request context.** Подтверждено как блокер:
   прежний `src/lib/auth/server.ts` создавал `betterAuth` и читал `process.env` на уровне
   модуля. Переписано на per-request factory (`withDb`, `withAuth`), всё чтение окружения —
   через функции в `src/lib/env.ts`, ни одна не исполняется при импорте.

2. **Vitest не может грузить `cloudflare:workers`.** Тесты идут через отдельный
   `vitest.config.ts` с алиасом на `src/test/cloudflare-workers-stub.ts`, который моделирует
   запуск вне Worker'а. Следствие для дисциплины: чистую логику держим свободной от
   Worker-импортов, иначе она перестаёт быть тестируемой.

3. **`drizzle-kit` не выпускает `CREATE EXTENSION`.** Строка `CREATE EXTENSION IF NOT EXISTS
   vector;` добавлена в начало baseline-миграции вручную и должна там остаться.

4. **Durable Object нельзя объявить, не экспортировав класс.** Биндинг `RATE_LIMITER` из §5.1
   **сознательно не объявлен**: `main` — это entry самого фреймворка, а экспорт DO-класса требует
   кастомного entry. Объявленный без класса биндинг ломает `wrangler deploy`. Возвращается в
   Phase 4 вместе с публичными эндпоинтами. Недельный лимит откликов от него не зависит — он
   в Postgres, потому что должен быть транзакционным (§3.2).
