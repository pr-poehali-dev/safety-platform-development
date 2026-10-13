# Архив отключённых функций

Код здесь не деплоится и не считается в количестве функций.

Чтобы вернуть функцию: перенести папку из `archive/<имя>` в `backend/<имя>` и выполнить синхронизацию бэкенда.
После восстановления функция получит новый URL (он появится в `backend/func2url.json`).

- ai-assistant — ИИ-ассистент
- routine-categories — виды рутинной работы
- routine-entries — записи рутинной работы

Для возврата ИИ-ассистента также: в src/App.tsx снова подключить
`import AssistantWidget from "@/components/assistant/AssistantWidget";`
и вывести `{user && <AssistantWidget user={user} />}`, а в src/components/assistant/AssistantWidget.tsx
и src/components/admin/AiSettingsEditor.tsx обновить адрес функции из backend/func2url.json.

Для возврата модуля «Рутина» (routine-categories и routine-entries) также: в src/components/tasks/TasksBlock.tsx
снова подключить `import RoutineWeekPanel from "./RoutineWeekPanel";`, вернуть правую колонку
`<div className="lg:border-l lg:border-border lg:pl-6"><RoutineWeekPanel user={user} /></div>`
внутри сетки (grid-cols-1 lg:grid-cols-2), а в src/hooks/useRoutine.ts обновить CATEGORIES_URL и ENTRIES_URL
из backend/func2url.json. Данные в базе (таблицы рутины) не удаляются.
