# EquipTrack

EquipTrack — українськомовна система інвентарного обліку для Дрогобицького механіко-технологічного фахового коледжу. Застосунок веде приміщення, моделі обладнання, фізичні екземпляри з інвентарними й серійними номерами, переміщення, заявки, ремонти, аудити, списання, документи, сповіщення та журнал дій.

## Поточний стан

- інтерфейс локалізований українською;
- ролі: працівник, менеджер обліку, адміністратор;
- дані seed прив’язані до ДМТФК: головний корпус, навчально-лабораторний корпус, виробничо-механічний корпус, навчальний корпус №3 і складський корпус;
- обладнання розділене на модель і конкретні екземпляри;
- кожен екземпляр має окремий `inventoryNumber` і `serialNumber`;
- аудит приміщення перевіряє фактичні екземпляри за інвентарним або серійним номером;
- якщо екземпляр знайдено не в очікуваному приміщенні, аудит показує розбіжність;
- фото й документи зберігаються в SurrealDB, а не в зовнішньому файловому сховищі;
- CRUD-дії виконуються через модальні діалоги з підтвердженнями, валідацією, пошуком, фільтрами й пагінацією;
- дизайн виконаний як технічна інвентарна картотека з правим каталогом, кастомним фоном і плавними анімаціями.

## Стек

- Next.js 15 App Router;
- React 19;
- TypeScript;
- SurrealDB / Surreal Cloud;
- bcryptjs для хешування паролів;
- jose і захищені cookie-сесії;
- Zod для серверної валідації;
- sharp для обробки зображень;
- CSS/Tailwind-пайплайн для стилізації.

## Структура даних

Основні таблиці SurrealDB:

- `user`, `session`;
- `building`, `room_type`, `room`;
- `category`, `supplier`;
- `equipment` — модель або тип обладнання;
- `equipment_instance` — фізичний екземпляр з інвентарним і серійним номером;
- `file` — фото й документи у вигляді DB-backed binary records;
- `movement`;
- `transfer_request`;
- `repair`;
- `audit`, `audit_item`;
- `writeoff_request`;
- `notification`;
- `audit_log`;
- `app_meta`.

У таблиці `file` зберігаються `data` і `previewData` типу `bytes`. Файли відкриваються через захищений маршрут:

```text
/api/files/[fileId]/[variant]
```

## Змінні середовища

Скопіюйте `.env.example` у `.env.local` для локального запуску або додайте такі змінні в Render.

```dotenv
SURREAL_URL=wss://your-instance.surreal.cloud
SURREAL_NAMESPACE=equiptrack
SURREAL_DATABASE=production
SURREAL_USERNAME=your_username
SURREAL_PASSWORD=your_password
SURREAL_WAKE_URL=https://your-instance.surreal.cloud/health
AUTH_SECRET=long-random-secret
NEXT_PUBLIC_APP_URL=https://your-render-service.onrender.com
```

Пояснення:

- `SURREAL_URL` — WebSocket URL інстансу Surreal Cloud. Його беріть у Surreal Cloud на сторінці інстансу в блоці підключення, формат зазвичай `wss://...surreal.cloud`;
- `SURREAL_NAMESPACE` — namespace, який створений для застосунку, наприклад `equiptrack`;
- `SURREAL_DATABASE` — database всередині namespace, наприклад `production`;
- `SURREAL_USERNAME` і `SURREAL_PASSWORD` — root/auth користувач SurrealDB, створений у Surreal Cloud / Surrealist у розділі доступу;
- `SURREAL_WAKE_URL` — опційна адреса health-запиту, наприклад `https://your-instance.surreal.cloud/health`. Якщо змінна порожня, застосунок сам спробує вивести цю адресу з `SURREAL_URL`;
- `AUTH_SECRET` — довгий випадковий секрет для підпису сесій. У PowerShell можна згенерувати так: `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`;
- `NEXT_PUBLIC_APP_URL` — публічна адреса застосунку, наприклад `https://equiptrack-4vm8.onrender.com`.

Якщо SurrealDB Cloud інстанс paused, застосунок показує екран очікування й перевіряє `/api/health/database` кожні 3 секунди. Якщо Cloud не піднімає інстанс від простого health-запиту, відкрийте сторінку інстансу в Surreal Cloud і натисніть `Resume instance`; після готовності база визначиться автоматично, а сторінка оновиться.

Не додавайте `.env.local` до Git.

## Локальний запуск

Встановіть Node.js LTS і виконайте:

```bash
npm install
npm run setup
npm run build
npm run start
```

Або запустіть Windows-файл:

```text
run-equiptrack.bat
```

Launcher:

- створить `.env.local` з `.env.example`, якщо файла ще немає;
- згенерує `AUTH_SECRET`, якщо він порожній;
- встановить залежності;
- виконає `npm run setup`, якщо заповнені SurrealDB-змінні;
- збере production build;
- запустить `next start` на `http://localhost:3000`.

## Команди

```bash
npm run dev          # режим розробки
npm run typecheck    # перевірка TypeScript
npm run build        # production build
npm run start        # production server
npm run setup        # схема + seed, якщо база ще не підготовлена
npm run db:migrate   # тільки схема
npm run db:seed      # seed-дані
npm run check        # typecheck + build
```

`npm run setup` застосовує схему й seed. Seed має версію в `app_meta`; якщо база вже актуальна, повторний запуск не дублює дані.

## Початкові облікові записи

Початковий пароль для всіх seed-користувачів:

```text
EquipTrack2026!
```

Основні акаунти:

| Роль            | Email                                     | Користувач                  |
| --------------- | ----------------------------------------- | --------------------------- |
| Адміністратор   | `stakhiv.andrii.ihorovych@gmail.com`      | Стахів Андрій Ігорович      |
| Менеджер обліку | `yatsynych.oksana.borysivna@gmail.com`    | Яцинич Оксана Борисівна     |
| Менеджер обліку | `lazariv.mykhailo.mykolaiovych@gmail.com` | Лазарів Михайло Миколайович |
| Працівник       | `prokopiv.roman.vasylovych@gmail.com`     | Прокопів Роман Васильович   |

Після першого реального розгортання змініть пароль адміністратора.

## Ролі

`staff`:

- перегляд приміщень і обладнання;
- подання заявок на передачу;
- повідомлення про несправності;
- перегляд власних сповіщень.

`inventory_manager`:

- ведення приміщень;
- ведення моделей та екземплярів обладнання;
- переміщення;
- заявки;
- ремонти;
- аудити;
- пропозиції списання.

`admin`:

- усе з рівня менеджера;
- користувачі;
- довідники;
- остаточне списання;
- журнал дій.

Система не дозволяє деактивувати останнього активного адміністратора.

## Робота з обладнанням

`equipment` описує модель: назва, категорія, виробник, модель, постачальник, опис і фото.

`equipment_instance` описує конкретну одиницю: інвентарний номер, серійний номер, поточне приміщення, відповідальна особа, вартість, стан, дата надходження й статус.

Це потрібно для ситуацій, коли в коледжі є багато однакового обладнання, але кожна одиниця має окремий серійний номер і окрему історію руху.

## Аудити

Аудит створюється для конкретного приміщення. При створенні система автоматично формує очікуваний перелік екземплярів, які зараз мають бути в цьому приміщенні.

Життєвий цикл:

```text
Заплановано -> У роботі -> Завершено
```

Також аудит можна скасувати або видалити.

Під час аудиту менеджер вносить знайдені екземпляри:

- вибором через кастомний пошук;
- або вручну за `serialNumber` / `inventoryNumber`.

Результати `audit_item`:

- знайдено;
- відсутнє;
- пошкоджене;
- переміщено / знайдено не в тому приміщенні.

## Файли

Підтримуються:

- JPEG;
- PNG;
- WebP;
- PDF.

Обмеження за замовчуванням — до 3 МБ на файл.

Фото стискаються до WebP, для списків створюється preview. Документи й фото зберігаються в SurrealDB у таблиці `file`; у спискових запитах не передаються важкі binary-поля.

## Render deployment

Цей застосунок треба розгортати як Render Web Service, не як Static Site, бо тут є server actions, SSR/Server Components і API route для файлів.

Рекомендовані налаштування Render:

| Поле Render        | Значення                                               |
| ------------------ | ------------------------------------------------------ |
| Service Type       | `Web Service`                                          |
| Runtime / Language | `Node`                                                 |
| Branch             | `main`                                                 |
| Root Directory     | порожньо, якщо репозиторій містить цей проєкт у корені |
| Build Command      | `npm ci && npm run setup && npm run build`             |
| Start Command      | `npm run start`                                        |
| Auto-Deploy        | `Yes`                                                  |

Node.js версія зафіксована у файлі `.node-version`.

У Render додайте Environment Variables:

```dotenv
SURREAL_URL=wss://your-instance.surreal.cloud
SURREAL_NAMESPACE=equiptrack
SURREAL_DATABASE=production
SURREAL_USERNAME=your_username
SURREAL_PASSWORD=your_password
SURREAL_WAKE_URL=https://your-instance.surreal.cloud/health
AUTH_SECRET=long-random-secret
NEXT_PUBLIC_APP_URL=https://your-render-service.onrender.com
```

Після першого deploy:

1. відкрийте Render service URL;
2. якщо бачите `/setup`, перевірте змінні середовища;
3. після виправлення змінних натисніть `Manual Deploy -> Clear build cache & deploy`;
4. увійдіть під адміністратором;
5. змініть пароль адміністратора.

## Перевірка перед деплоєм

Перед push або deploy виконуйте:

```bash
npm run check
```

Це запускає TypeScript-перевірку й production build.
