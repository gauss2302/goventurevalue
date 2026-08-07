# Startup Job Search Platform — продуктовый и технический план

> Рабочее название: **Runway** (кандидат видит не только вакансию, но и «сколько у стартапа
> взлётной полосы»). Финальный нейминг — открытый вопрос, см. §11.
>
> Статус документа: план к согласованию. Код не пишем, пока не утвердим §1–§5.

---

## 1. Идея и позиционирование

### 1.1 Что делаем

Платформа поиска работы **в стартапах** для global remote-first рынка. Не «ещё один джоб-борд»,
а **инвесторский взгляд на работодателя, отданный кандидату**.

### 1.2 Проблема

Человек, который идёт в стартап, принимает решение с гораздо большим риском, чем при найме
в корпорацию: компания может закрыться через 8 месяцев, опционы могут не стоить ничего,
«Series A» может означать и $3M, и $30M. При этом кандидат почти всегда решает **вслепую**:

1. **Нет данных о самой компании.** Вакансия говорит «fast-growing startup», но не говорит:
   какая стадия, когда был последний раунд, сколько поднято, сколько людей в команде,
   растёт ли команда или сокращается, сколько примерно осталось runway.
2. **Мусор и мёртвые вакансии.** На больших бордах 30–40% вакансий — ghost jobs: закрытые,
   висящие «для сбора базы» или дубли одной позиции с пяти агрегаторов.
3. **Матчинг по ключевым словам.** «Ищем React» находит человека, который писал React,
   а не человека, который был третьим инженером в seed-стартапе и умеет работать в хаосе.
   Стартапу нужен именно второй тип, и это не выражается тегами.

### 1.3 Кто уже на рынке и почему есть место

| Игрок | Сильная сторона | Где не закрывает |
|---|---|---|
| **Wellfound** (ex-AngelList Talent) | Огромная база, бренд в стартап-мире | Шум, много stale-вакансий, низкий response rate, данных о компании почти нет |
| **YC Work at a Startup** | Отличное качество компаний, доверие | Только YC-портфель — узкий срез рынка |
| **Otta / Welcome to the Jungle** | Хороший UX и матчинг | Не про стартапы специально; фокус UK/EU |
| **LinkedIn / Indeed** | Охват | Вообще не про стартапы, максимальный шум |
| **Crunchbase / Dealroom** | Данные о компаниях | Это не про поиск работы, и платят инвесторы, а не кандидаты |

**Свободная ниша:** никто не соединяет *данные о здоровье стартапа* с *поиском работы*.
Crunchbase знает про компании, но не про вакансии. Wellfound знает про вакансии, но не про
компании. Мы делаем пересечение.

### 1.4 Три дифференциатора (это и есть продукт)

**① Startup Signal — «дью-дилидженс для кандидата»**

Каждая карточка компании показывает то, что обычно видит только инвестор:

- стадия и история раундов (сумма, дата, лид-инвестор, инвесторы);
- **months since last raise** и оценка runway — главный красный флаг, который никто не показывает;
- динамика размера команды (растёт / плато / сокращается) по срезам во времени;
- темп найма: сколько вакансий открыто, как долго они висят, куда идёт рост (sales-heavy? eng-heavy?);
- бенчмарки по стадии: «медианная зарплата Senior BE в seed-стартапе US remote — X».

Это **прямое переиспользование того, что в репозитории уже написано и покрыто тестами**:
`src/lib/calculations.ts` (538 строк: DCF, VC valuation, funding need, runway, cap table),
`src/lib/traction-calculations.ts` (288 строк: stage classification, multiples, cohort metrics),
`src/lib/metrics.ts`. Мы не выбрасываем этот код — мы разворачиваем его на 180°:
раньше он считал модель **для основателя**, теперь считает сигнал **для кандидата**.
Это наш моат: конкурент-джоб-борд такой движок с нуля не напишет.

**② Freshness by default — «здесь нет мёртвых вакансий»**

- каждая вакансия **реверифицируется ежедневно** у первоисточника; исчезла из источника — уходит в архив автоматически;
- на карточке видно `first_seen` / `last_verified`, а не «Posted recently»;
- **Ghost Job Score** — эвристика: сколько дней висит, менялась ли, есть ли вилка, отвечает ли компания вообще;
- дедупликация: одна позиция = одна карточка, даже если пришла из четырёх источников;
- публичная метрика по компании: median time-to-first-response. Компании, которые не отвечают, ранжируются ниже. Это дисциплинирует рынок и это наша репутационная фича.

**③ Матчинг по траектории, а не по тегам**

- профиль кандидата → эмбеддинг (не только скиллы: стадии компаний, размер команд, зона ответственности, «был ли первым в функции»);
- гибридный поиск: жёсткие фильтры (виза/таймзона/вилка/стадия) → векторное сходство → реранк;
- **explainability обязательна**: под каждой рекомендацией — «почему это тебе»
  («ты дважды был early-stage инженером; здесь ищут #4 в команде; таймзона совпадает; вилка выше твоей планки»).
  Матчинг без объяснения не вызывает доверия и не конвертит.

### 1.5 Позиционирование одной фразой

> Мы показываем стартап-вакансии так, как их видел бы инвестор: с данными о компании,
> без мёртвых объявлений и с объяснением, почему это подходит именно тебе.

---

## 2. Пользователи

### 2.1 Кандидат (главный пользователь, но не платит)

**Портрет:** senior IC или early-stage generalist, 3–12 лет опыта, ищет remote или релокацию,
рассматривает стартапы осознанно (не «хоть куда»). Инженеры, продукт, дизайн, GTM.

Jobs-to-be-done:
1. «Покажи мне живые вакансии в стартапах, которые мне реально подходят, без просеивания сотен.»
2. «Помоги понять, не утону ли я вместе с этой компанией.»
3. «Дай откликнуться быстро и увидеть, что происходит с моим откликом.»

### 2.2 Стартап (платит)

**Портрет:** seed / Series A, 5–60 человек, найм ведёт founder или первый recruiter, бюджета на
LinkedIn Recruiter ($10k+/год) нет, нужен качественный поток, а не объём.

Jobs-to-be-done:
1. «Приведи мне кандидатов, которым интересны именно стартапы, а не любой оффер.»
2. «Дай выделиться среди компаний покрупнее.»
3. «Дай минимальный инструмент для работы с потоком, чтобы не вести найм в Google Sheets.»

### 2.3 Куратор (мы, внутренняя роль)

Модерация входящего потока агрегации, ручной отбор, разрешение конфликтов дедупликации,
верификация claim-заявок от компаний. **Внутренняя админка — часть MVP, не «потом»:**
без неё кураторская модель не работает.

---

## 3. Как решаем cold start и монетизацию

Здесь есть встроенное противоречие, которое надо разрешить явно: **вакансии мы агрегируем,
а деньги хотим брать со стартапов.** Стандартный ответ — воронка claim:

```
Cron: импорт из публичных ATS-API
        ↓
Автосоздание профиля компании + вакансий  ←── база непустая с первого дня
        ↓
Компания видит свой профиль в поиске / получает письмо
        ↓
"Claim your company"  (бесплатно, верификация по корп. домену)
        ↓
FREE tier: брендинг, редактирование вакансий, ответы кандидатам, базовая аналитика
        ↓
PAID tier: Featured posting, доступ к базе кандидатов, ATS-lite, полная аналитика
```

Почему это работает: компания приходит не на пустое место, а туда, где её профиль **уже есть**
и уже получает трафик. Продавать «займите свой профиль и получите контроль» в разы легче,
чем «разместите вакансию на новом борде». Это ровно тот путь, которым прошёл AngelList.

**Тарифы (гипотеза, валидируем на первых 20 компаниях):**

| Tier | Цена | Что входит |
|---|---|---|
| Free (claimed) | $0 | Профиль, до 3 активных вакансий, ответы кандидатам |
| Growth | ~$149/мес | Неограниченные вакансии, 2 Featured slot, поиск по базе кандидатов, аналитика |
| Scale | ~$399/мес | + ATS-lite (пайплайн, заметки, командный доступ), приоритет в матчинге, API |
| Featured (one-off) | ~$99/вакансия | Разовое усиление без подписки — низкий порог входа |

**Кандидат платит только за то, чего не ждёт бесплатно** (осознанно держим бесплатным всё
основное — кандидаты это трафик и ценность для платящей стороны). Позже: `Runway Pro` ~$12/мес —
расширенные Startup Signal, приоритетные алерты, аналитика откликов. **В MVP не включаем.**

Биллинг: **Polar остаётся** — он уже интегрирован с Better Auth в этом репозитории
(`@polar-sh/better-auth`), и переписывать это без причины смысла нет. Проверить
Workers-совместимость SDK на спайке (§7.1); fallback — Stripe.

---

## 4. Фичи по фазам

### MVP (Phase 1–3) — то, без чего продукта нет

**Кандидат**
- Поиск и фильтры: роль, стек, стадия компании, remote/таймзона, вилка, размер команды, виза/релокация
- Карточка вакансии: описание, вилка (или явная метка «вилка скрыта»), `last_verified`, Ghost Job Score
- **Карточка компании со Startup Signal** (раунды, months-since-raise, динамика команды, темп найма)
- Профиль: резюме (загрузка PDF + автопарсинг), карьерная траектория, предпочтения
- Матчинг: персональная лента + explainability
- Сохранённые поиски и email-алерты (daily / weekly digest)
- Отклик: внутренний (если компания claimed) или outbound-ссылка на источник, с трекингом
- Трекер откликов кандидата

**Стартап**
- Claim компании с верификацией по корпоративному домену
- Редактирование профиля и вакансий
- Просмотр откликов, смена статуса, ответ кандидату
- Базовая аналитика вакансии (показы → клики → отклики)
- Checkout (Polar) на Growth / Featured

**Система**
- Пайплайн агрегации: fetch → normalize → dedupe → enrich → embed → moderate → publish
- Ежедневная реверификация и авто-архив
- Админка куратора: очередь модерации, разрешение дублей, blacklist источников, claim-заявки
- Транзакционные письма (алерты, дайджесты, уведомления об откликах)

### Phase 4 (v1.1) — усиление
- Сравнение вакансий/компаний сайдбайсайд (в репо уже есть паттерн `models/$modelId/compare`)
- Salary Benchmarks по стадии/роли/региону на собственных данных
- AI-помощник кандидату: подгонка резюме и cover letter под вакансию (переиспользуем
  провайдерную абстракцию из `src/lib/pitchDeck/providers/`)
- Поиск по базе кандидатов для платных компаний + inbound-заявки от стартапов
- Публичные SEO-страницы (`/remote-react-jobs-at-seed-startups`) — главный органический канал

### Phase 5 (v2) — платформа
- ATS-lite: канбан-пайплайн, заметки, командный доступ, scorecards
- Realtime-чат кандидат ↔ компания (Durable Objects + WebSockets)
- Referral / warm intro граф
- Публичное API и партнёрские интеграции
- Talent Collections — курируемые подборки кандидатов (высокомаржинальный продукт)

### Явно НЕ делаем
- Собственный полноценный ATS (конкуренция с Greenhouse — не наша игра)
- Скрейпинг LinkedIn/Indeed (ToS + юридический риск, см. §6.3)
- Не-стартап вакансии (корпораты) — размывает позиционирование
- Мобильные приложения до подтверждения PMF (PWA достаточно)

---

## 5. Технический стек

### 5.1 Итоговый выбор

| Слой | Решение | Почему |
|---|---|---|
| Фреймворк | **TanStack Start** (остаётся) | Уже в проекте, официально поддержан Cloudflare через `@cloudflare/vite-plugin`; SSR нужен для SEO |
| Runtime | **Cloudflare Workers**, `nodejs_compat`, compat date ≥ `2026-08-03` | Задано условиями |
| БД | **Neon Postgres + Hyperdrive + Drizzle**, драйвер `pg` ≥ 8.16.3 | Решено. В проекте уже `pg@8.16.3` и Drizzle — миграция схемы, а не переписывание |
| Векторный поиск | **pgvector на Neon** | Матчинг рядом с реляционными данными: один запрос вместо «Vectorize → собери id → сходи в Postgres». Vectorize держим как fallback, если pgvector не вытянет по latency |
| Auth | **Better Auth** + `drizzleAdapter({provider:'pg'})`, **per-request factory** | Остаётся, но требует рефакторинга (§7.1) |
| Сессии (кэш) | **Workers KV** как `secondaryStorage` | Убирает обращение к БД на каждый запрос |
| Файлы | **R2** | Резюме, логотипы, OG-картинки |
| Кэш / флаги | **KV** | Горячие списки, конфиги |
| Rate limiting | **Durable Objects** | Точные счётчики; KV даёт eventual consistency и для лимитов не годится |
| Фоновые задачи | **Cloudflare Queues** | Замена BullMQ (тот требует Redis — на Workers не работает) |
| Расписание | **Cron Triggers** | Импорт, реверификация, дайджесты |
| Эмбеддинги | **Workers AI** (`@cf/baai/bge-base-en-v1.5`, 768d) | Рынок англоязычный. Мультиязычность (`bge-m3`) — если понадобится RU/UZ |
| LLM (нормализация вакансий) | Абстракция провайдера, уже есть в `src/lib/pitchDeck/providers/` | Workers AI для дешёвых задач, OpenAI/Gemini для сложных. Не привязываемся к одному |
| Парсинг PDF-резюме | **`unpdf`** в Queue consumer | Edge-safe, zero native deps; нужны полифилы (`FinalizationRegistry`) и worker inlining. 3–5 c на файл — только асинхронно, не в реквесте |
| Career-страницы без API | **Browser Rendering / `/crawl`** | 10 конкурентных инстансов, 600 req/min на Paid — хватает для батчей по Cron |
| Email | **Resend** (HTTP API) | Workers-совместим, Node SMTP на Workers недоступен |
| Биллинг | **Polar** (остаётся), fallback Stripe | Уже интегрирован с Better Auth |
| Realtime (v2) | **Durable Objects + WebSockets** | Нативно для Workers |
| Наблюдаемость | Workers Logs + Logpush, Sentry (Workers SDK) | — |

### 5.2 Что удаляем из зависимостей

| Пакет | Причина |
|---|---|
| `bullmq` | Нужен Redis, на Workers не работает → Cloudflare Queues |
| `exceljs`, `xlsx` | Excel-экспорт не нужен продукту; `xlsx` вдобавок с известными уязвимостями |
| `@react-pdf/renderer`, `pdfmake`, `jspdf`, `html2canvas` | Генерация PDF-питчдеков уходит вместе с фичей |
| `mathjs` | Тянется под финмодели; нужные функции есть в `calculations.ts` |
| `motion` **или** `framer-motion` | Дубль одного и того же — оставить один |
| `pg` | **Оставляем** — Hyperdrive требует именно нативный драйвер, ≥ 8.16.3 |

### 5.3 Ограничения платформы, которые формируют архитектуру

Это не сноски — это то, из-за чего архитектура именно такая:

1. **Hyperdrive-биндинг доступен только внутри request context.** Отсюда per-request
   инициализация `db` и `auth`. Текущий `src/lib/auth/server.ts` создаёт `betterAuth` и
   читает `process.env` **на уровне модуля** — на Workers это упадёт. Это блокер №1.
2. **CPU: 30 с по умолчанию на Paid, до 5 мин через `limits.cpu_ms`.** Парсинг резюме и
   LLM-нормализация — в Queues, не в HTTP-обработчике.
3. **Subrequests: 10 000 на инвокацию (Paid), поднимается до 10M конфигом.** Батчевый импорт
   всё равно дробим по Queue-сообщениям, а не одним прогоном.
4. **Нет Node `fs`/`net`.** Любая библиотека с нативными зависимостями отпадает — отсюда `unpdf`.
5. **Startup time ≤ 1 с** — держим бандл воркера компактным, тяжёлое выносим в отдельные воркеры
   (Auxiliary Workers теперь поддерживаются с CF Vite plugin).
6. **Секреты — через `wrangler secret` / биндинги, не `process.env` на уровне модуля.**

### 5.4 Топология воркеров

```
┌─────────────────────────────────────────────────────────┐
│  web (TanStack Start SSR + API)                         │
│  Bindings: HYPERDRIVE, KV, R2, QUEUE(producer), AI, DO   │
└─────────────────────────────────────────────────────────┘
┌──────────────────────────┐  ┌──────────────────────────┐
│ ingest-worker            │  │ jobs-worker              │
│ Cron: импорт,            │  │ Queue consumer:          │
│ реверификация, дайджесты │  │ normalize / embed /      │
│                          │  │ parse-resume / email     │
└──────────────────────────┘  └──────────────────────────┘
```

Разделение не косметическое: у ingest и jobs другой профиль CPU и свои лимиты, и они не должны
раздувать бандл SSR-воркера (см. ограничение о startup time).

---

## 6. Данные

### 6.1 Основные таблицы (Drizzle / Postgres)

```
── Идентичность (из Better Auth, остаётся как есть) ──
user, session, account, verification

── Компании ──
company              id, slug, name, domain, description, logo_r2_key, website,
                     hq_location, remote_policy, team_size, team_size_updated_at,
                     stage, founded_year, is_claimed, claimed_by_user_id,
                     tier ('free'|'growth'|'scale'), ats_provider, ats_external_id
company_funding      company_id, round_type, amount_usd, announced_at, lead_investor,
                     investors jsonb, source_url
company_signal       company_id, months_since_last_raise, runway_estimate_months,
                     team_growth_rate_90d, open_roles_count, median_days_to_first_response,
                     hiring_mix jsonb, signal_score, computed_at
company_headcount    company_id, observed_at, headcount        -- временной ряд

── Вакансии ──
job                  id, company_id, title, role_family, seniority, description_md,
                     salary_min, salary_max, salary_currency, salary_is_public,
                     equity_min, equity_max, remote_type, timezones text[],
                     locations text[], visa_sponsorship, tech_stack text[],
                     status ('pending'|'published'|'archived'), ghost_score,
                     first_seen_at, last_verified_at, published_at, apply_url,
                     source_id, source_external_id, canonical_job_id, content_hash
job_embedding        job_id, embedding vector(768), model, computed_at

── Агрегация ──
source               id, kind ('greenhouse'|'lever'|'ashby'|'workable'|'rss'|'crawl'),
                     config jsonb, is_enabled, last_run_at, health
ingest_run           source_id, started_at, finished_at, fetched, created, updated,
                     archived, errors jsonb
raw_posting          source_id, external_id, r2_key, content_hash, fetched_at
moderation_item      job_id, reason, state ('open'|'approved'|'rejected'), curator_id, note

── Кандидаты ──
candidate_profile    user_id, headline, bio, years_experience, role_families text[],
                     seniority, tech_stack text[], timezone, locations text[],
                     needs_visa, open_to ('remote'|'relocate'|'hybrid'),
                     salary_expectation_min, preferred_stages text[],
                     resume_r2_key, resume_parsed jsonb, visibility, updated_at
candidate_embedding  user_id, embedding vector(768), model, computed_at
candidate_experience user_id, company_name, company_stage_at_join, team_size_at_join,
                     title, started_at, ended_at, was_first_in_function

── Взаимодействие ──
application          job_id, user_id, status, cover_letter, applied_at,
                     first_response_at, status_history jsonb
saved_job            user_id, job_id, created_at
saved_search         user_id, name, filters jsonb, alert_cadence, last_sent_at
job_view             job_id, user_id?, session_hash, occurred_at   -- аналитика
company_claim        company_id, user_id, work_email, state, verified_at

── Биллинг (остаётся) ──
billing_subscriptions
```

### 6.2 Матчинг: как именно

Гибридный, в три шага — в этом порядке, потому что каждый следующий дороже предыдущего:

1. **Hard filters (SQL).** Таймзона, виза, вилка ≥ ожиданий, стадия, role_family, `status='published'`.
   Дёшево, режет 95% выборки.
2. **Векторное сходство (pgvector, HNSW-индекс).** `candidate_embedding <=> job_embedding`,
   top-200 из отфильтрованного.
3. **Реранк.** Взвешенная композиция: сходство + Startup Signal (сильная компания выше) +
   freshness + response-rate компании + tier (платные получают буст, но **не ломая релевантность**).
   Later: LLM-реранк top-20.

**Explainability** генерируем из структурных совпадений (не из LLM-фантазии): совпавшие
скиллы, совпадение стадии с прошлым опытом, таймзона, вилка. Правило: **не показываем причину,
которую не можем подтвердить данными.**

Эмбеддинг кандидата строим не из «списка скиллов», а из нарратива траектории — стадии компаний,
размеры команд, зона ответственности. Иначе матчинг вырождается в поиск по тегам, который мы
и критикуем в §1.2.

### 6.3 Юридическая рамка агрегации — обязательное ограничение

**Берём только официальные публичные job-board API** ATS-систем, которые сами компании
публикуют для своих career-страниц:

- Greenhouse Job Board API (`boards-api.greenhouse.io`)
- Lever Postings API (`api.lever.co/v0/postings`)
- Ashby Posting API, Workable, Recruitee, SmartRecruiters
- RSS/JSON-фиды career-страниц
- Собственный crawl career-страниц — только с уважением `robots.txt`, лимитом частоты и
  идентифицирующим User-Agent

**Не скрейпим LinkedIn, Indeed, Glassdoor** — прямое нарушение ToS и реальный юридический риск.

Дополнительно: каждая вакансия хранит `source_url` и атрибуцию; `apply_url` ведёт на
первоисточник, пока компания не claimed; по запросу компании профиль удаляется (opt-out).
Персональные данные кандидатов — GDPR: экспорт и удаление аккаунта в MVP, не «потом».

---

## 7. План работ

Оценки — в неделях для одного разработчика, работающего плотно. Фазы 1–2 строго
последовательны, дальше есть параллелизм.

### Phase 0 — Спайк платформы (3–5 дней) ⚠️ ДО всего остального

Цель — снять технические неизвестные, пока не написано ничего дорогого. Это самая важная фаза:
если что-то из списка не работает, меняется стек, а не код.

- [ ] Голый TanStack Start деплоится на Workers через `@cloudflare/vite-plugin`
- [ ] Hyperdrive → Neon: `pg` + Drizzle читают и пишут из server function
- [ ] **Как получить env/биндинги в TanStack Start server functions** (`cloudflare:workers` env
      vs request context) — от ответа зависит вся обвязка `db`/`auth`
- [ ] Better Auth на Workers: per-request factory + Google OAuth + KV secondaryStorage
- [ ] pgvector на Neon: HNSW-индекс, замер latency на 50k синтетических вакансий
- [ ] Workers AI: эмбеддинг за приемлемое время; Queue producer → consumer
- [ ] `unpdf` реально парсит PDF-резюме внутри Worker (полифилы!)
- [ ] Polar SDK работает на Workers (иначе — решение о переходе на Stripe **здесь**, не позже)

**Выход:** работающий скелет + документ «что подтвердилось / что меняем». Гейт: не проходим
дальше, пока не зелено.

### Phase 1 — Фундамент (1.5–2 недели)
- Чистка репозитория: удалить финмодели/питчдеки/академию (§5.2, §8), оставив библиотеки расчётов
- Новая Drizzle-схема (§6.1) + миграции; `drizzle.config.ts` под Neon
- Per-request `db` и `auth`; `wrangler.jsonc` со всеми биндингами
- Дизайн-система: переиспользуем `docs/design-system.md` + `docs/tokens.json` и shadcn-компоненты
- Каркас лейаута, роутинг, две роли (candidate / company), CI на Workers

### Phase 2 — Пайплайн агрегации (2–3 недели) — ядро продукта
- Абстракция `Source` + адаптеры: Greenhouse, Lever, Ashby (3 покрывают большую часть рынка)
- Cron → fetch → сырьё в R2 → Queue
- Нормализация: LLM извлекает role_family, seniority, вилку, стек, remote-политику из свободного текста
- Дедупликация: `content_hash` + fuzzy по (company, title, location) → `canonical_job_id`
- Обогащение компании: раунды, headcount, вычисление `company_signal` **через существующий
  `calculations.ts` / `traction-calculations.ts`**
- Эмбеддинги в Queue consumer
- Реверификация + авто-архив
- **Админка куратора** (очередь модерации, дубли, blacklist)

Гейт фазы: 5 000+ живых вакансий от 500+ компаний, прошедших модерацию.

### Phase 3 — Кандидатский продукт (2–3 недели)
- Поиск, фильтры, карточка вакансии, карточка компании со Startup Signal
- Онбординг + профиль + загрузка и автопарсинг резюме
- Матчинг-лента с explainability
- Сохранённые поиски, email-алерты, дайджесты (Resend + Cron)
- Отклик (внутренний / outbound) + трекер
- SEO: SSR, sitemap, JSON-LD `JobPosting`, OG-картинки, статический пререндер SEO-страниц

Гейт: **можно запускать публично.** Дальше — параллельно с реальным трафиком.

### Phase 4 — Сторона стартапа и монетизация (2–3 недели)
- Claim-флоу с верификацией по домену
- Кабинет компании: профиль, вакансии, отклики, ответы, аналитика
- Polar checkout, tiers, гейтинг фич, вебхуки
- Featured placement в ранжировании
- Поиск по базе кандидатов для платных tiers (с уважением `visibility`)

### Phase 5 — Усиление (по данным, не по плану)
Salary benchmarks, AI-подгонка резюме, сравнение, ATS-lite, чат на Durable Objects.
Приоритет определяем метриками, а не этим документом.

### Суммарно
**~10–14 недель до публичного запуска** (Phase 0–4) для одного разработчика.
Phase 0–3 (~7–9 недель) даёт публично запускаемый продукт без монетизации.

---

## 8. Судьба текущего кода

| Что | Решение |
|---|---|
| `src/lib/calculations.ts`, `traction-calculations.ts`, `metrics.ts`, `calculations.test.ts` | **Оставляем** — движок Startup Signal, наш дифференциатор |
| `src/lib/pitchDeck/providers/*`, `improveText.ts`, `normalize.ts` | **Адаптируем** — абстракция LLM-провайдера для нормализации вакансий и AI-фич |
| `src/lib/auth/*` | **Рефакторим** под per-request factory (блокер §5.3) |
| `src/lib/billing/*` (+ тесты) | **Оставляем**, перенастраиваем на новые tiers |
| `src/components/ui/*`, `docs/design-system.md`, `docs/tokens.json` | **Оставляем** |
| `src/lib/logger.ts`, `dto.ts`, `hooks/*` | **Оставляем** |
| Финмодели: `routes/models/*`, `components/FinancialModel*`, `CohortTable`, `MonthlyMetricsTable`, `FundraisingPanel`, `InvestorSnapshot`, `assumptions.tsx` | **Удаляем** (UI; логика расчётов остаётся) |
| Питчдеки: `routes/pitch-decks/*`, `components/pitch-deck/*`, `lib/pitchDeck/pdf.tsx`, `templates.ts` | **Удаляем** |
| `lib/excel.ts`, `lib/pdf.ts`, `routes/academy.tsx`, `todos` | **Удаляем** |
| `Dockerfile`, `docker-compose.yml`, `scripts/run-migrations.mjs`, BullMQ-обвязка | **Удаляем** — Workers-деплой вместо контейнеров |
| `AUTH_DEBUG.md`, `AUTH_FIXES.md`, `bun.lock` (при `pnpm-lock.yaml`) | **Удаляем** |

Порядок: сначала Phase 0 на текущем коде (спайк), потом чистка. Не наоборот — иначе спайк
не на чем проверять.

---

## 9. Метрики успеха

**Здоровье контента:** живых вакансий, компаний, % прошедших модерацию, доля с публичной
вилкой, **точность дедупликации**, средний возраст вакансии.

**Кандидат:** signup → completed profile (цель > 60%), profile → первый отклик (> 40%),
откликов на активного кандидата в неделю, **CTR матчинг-ленты vs обычный поиск** — прямая
проверка гипотезы матчинга, retention W4.

**Стартап:** claim rate от «засеянных» компаний (цель > 5%), claimed → paid (> 10%),
median time-to-first-response, MRR, churn.

**Северная звезда:** *подтверждённых интро/интервью в месяц.* Не «просмотров вакансий» —
метрика должна отражать реальную ценность, иначе оптимизируем шум.

---

## 10. Риски

| Риск | Влияние | Что делаем |
|---|---|---|
| **Cold start со стороны компаний** | Высокое | Агрегация даёт контент без продаж; claim-воронка вместо холодного постинга |
| **Качество данных агрегации** | Высокое | Кураторская модерация в MVP, а не «потом»; гейт фазы 2 по качеству |
| **Дедупликация сложнее, чем кажется** | Среднее | `content_hash` + fuzzy + ручное разрешение в админке; заложить время |
| **Startup Signal неточен** (runway/headcount — оценки) | **Высокое, репутационное** | Показываем как *оценку* с источником и датой; никогда не выдаём за факт; где данных нет — пишем «нет данных», а не додумываем |
| Юридические претензии по агрегации | Среднее | Только официальные API, атрибуция, opt-out (§6.3) |
| Лимиты Workers (CPU/startup) | Среднее | Разделение воркеров, всё тяжёлое в Queues, проверка на Phase 0 |
| Latency Hyperdrive vs D1 | Среднее | Замер на Phase 0; KV-кэш горячих списков; при провале — Vectorize для матчинга |
| Vendor lock-in в Cloudflare | Низкое | БД внешняя (Neon) — главное состояние переносимо |
| **Растянуть скоуп** | **Высокое** | §4 «Явно НЕ делаем»; гейты между фазами |

---

## 11. Открытые вопросы к тебе

Отвечать не обязательно все сразу — но 1–3 нужны до старта Phase 1.

1. **Нейминг и домен.** «Runway» — рабочая заготовка. Есть предпочтения? От этого зависят
   slug'и, брендинг и то, оставляем ли мы вообще имя `havamind`/`goventurevalue` в репозитории.
2. **Вертикальный фокус на старте.** Рекомендую сузиться: *только инженерные и продуктовые
   роли в seed/Series A AI- и dev-tools-стартапах*. Узкий фокус даёт лучший матчинг на малых
   данных и внятное позиционирование. Расширяться легче, чем сфокусироваться потом. Согласен?
3. **Что делаем с существующими данными в БД** (финмодели, питчдеки) — есть ли живые
   пользователи, которых нельзя потерять, или чистим полностью?
4. **Neon vs Supabase.** Рекомендую Neon: branching баз под превью-деплои, документированная
   связка с Hyperdrive, pgvector из коробки. Supabase имеет смысл, если хочется его Auth/Storage —
   но Auth у нас Better Auth, а Storage — R2, так что перевес у Neon.
5. **Бюджет на LLM/AI** в пайплайне нормализации: агрессивно использовать внешние модели
   (лучше качество, дороже) или максимум на Workers AI (дешевле, слабее)? Влияет на качество
   извлечения вилок и стека из свободного текста.
6. **Кто модерирует.** Кураторская модель требует человеко-часов ежедневно. Это ты, или нужно
   проектировать автомодерацию агрессивнее с самого начала?

---

## 12. Что дальше

1. Ты проходишь §1–§5 и §11 → правки и ответы на вопросы.
2. Фиксируем скоуп MVP.
3. **Phase 0 (спайк)** — единственное, что стоит кодить до полного согласования: он проверяет
   платформу и может изменить стек.
4. После зелёного Phase 0 — чистка репозитория и Phase 1.

Источники по платформе, на которые опирается §5:
[TanStack Start on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
[Neon + Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/),
[node-postgres + Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[Subrequests limit увеличен](https://developers.cloudflare.com/changelog/post/2026-02-11-subrequests-limit/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/) (для сравнения),
[Browser Rendering limits](https://developers.cloudflare.com/browser-rendering/platform/limits/),
[Workers AI models](https://developers.cloudflare.com/workers-ai/models/),
[unpdf](https://www.npmjs.com/package/unpdf),
[better-auth-cloudflare](https://github.com/zpg6/better-auth-cloudflare).
