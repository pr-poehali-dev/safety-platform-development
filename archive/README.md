# Архив отключённых функций

Код здесь не деплоится и не считается в количестве функций.

Чтобы вернуть функцию: перенести папку из `archive/<имя>` в `backend/<имя>` и выполнить синхронизацию бэкенда.
После восстановления функция получит новый URL (он появится в `backend/func2url.json`).

- ai-assistant — ИИ-ассистент

Для возврата ИИ-ассистента также: в src/App.tsx снова подключить
`import AssistantWidget from "@/components/assistant/AssistantWidget";`
и вывести `{user && <AssistantWidget user={user} />}`, а в src/components/assistant/AssistantWidget.tsx
и src/components/admin/AiSettingsEditor.tsx обновить адрес функции из backend/func2url.json.
