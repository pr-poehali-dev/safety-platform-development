import json
import os
import psycopg2
import urllib.request
import urllib.error

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = """Ты — ИИ-помощник в корпоративном веб-приложении SafeWork для управления охраной труда на строительных объектах.
Твои задачи:
1. Консультировать пользователей по вопросам охраны труда, техники безопасности, норм и правил.
2. Помогать формулировать нарушения и замечания для предписаний и проверок (чёткая формулировка, ссылка на категорию нарушения, разумный срок устранения).
3. Помогать анализировать текущие данные приложения (сводка по предписаниям, проверкам, происшествиям, штрафам), которые тебе передаются в контексте ниже.

Отвечай кратко, по делу, на русском языке, простым языком без лишних канцеляризмов. Если вопрос не по теме охраны труда или приложения — вежливо скажи, что помогаешь только с вопросами по охране труда и SafeWork."""


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def build_data_context() -> str:
    """Собирает краткую сводку по ключевым таблицам для контекста ассистента."""
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.prescriptions")
        prescriptions_count = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.remarks WHERE status != 'Устранено'")
        open_remarks = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.inspections WHERE works_suspended = true")
        suspended = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.inspections")
        inspections_count = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.incidents")
        incidents_count = cur.fetchone()[0]

        cur.execute(
            f"SELECT COALESCE(SUM(microtrauma),0), COALESCE(SUM(light_injury),0), "
            f"COALESCE(SUM(severe_injury),0), COALESCE(SUM(fatal),0) FROM {SCHEMA}.incidents"
        )
        micro, light, severe, fatal = cur.fetchone()

        cur.execute(f"SELECT COALESCE(SUM(amount_issued),0), COALESCE(SUM(amount_paid),0) FROM {SCHEMA}.fines")
        fines_issued, fines_paid = cur.fetchone()

        conn.close()

        return (
            f"Текущие данные в системе SafeWork:\n"
            f"- Всего предписаний: {prescriptions_count}\n"
            f"- Незакрытых замечаний в предписаниях: {open_remarks}\n"
            f"- Всего проверок: {inspections_count}, из них с приостановкой работ: {suspended}\n"
            f"- Всего происшествий: {incidents_count} "
            f"(микротравмы: {micro}, лёгкие: {light}, тяжёлые: {severe}, со смертельным исходом: {fatal})\n"
            f"- Штрафы: выставлено {fines_issued} ₽, оплачено {fines_paid} ₽"
        )
    except Exception:
        return "Данные приложения временно недоступны."


def call_gemini(api_key: str, contents: list) -> str:
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024},
    }
    req = urllib.request.Request(
        f"{GEMINI_URL}?key={api_key}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    candidates = data.get("candidates") or []
    if not candidates:
        return "Не удалось получить ответ от ИИ. Попробуйте переформулировать вопрос."
    parts = candidates[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts).strip() or "Пустой ответ от ИИ."


def handler(event: dict, context) -> dict:
    """Чат с ИИ-помощником (Google Gemini) по вопросам охраны труда и данным SafeWork."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {
            "statusCode": 500,
            "headers": CORS,
            "body": json.dumps({"error": "GEMINI_API_KEY не настроен"}, ensure_ascii=False),
        }

    body = json.loads(event.get("body") or "{}")
    message = (body.get("message") or "").strip()
    if not message:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "message required"})}

    history = body.get("history") or []
    user_name = body.get("user_name") or ""
    user_role = body.get("user_role") or ""

    data_context = build_data_context()

    contents = [
        {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
        {"role": "model", "parts": [{"text": "Понял, готов помогать."}]},
        {"role": "user", "parts": [{"text": f"{data_context}\n\nПользователь: {user_name} (роль: {user_role})"}]},
        {"role": "model", "parts": [{"text": "Учту эти данные при ответах."}]},
    ]

    for h in history[-10:]:
        role = "model" if h.get("role") == "model" else "user"
        text = (h.get("text") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        reply = call_gemini(api_key, contents)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {
            "statusCode": 502,
            "headers": CORS,
            "body": json.dumps({"error": f"Ошибка Gemini API: {error_body[:300]}"}, ensure_ascii=False),
        }

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply}, ensure_ascii=False)}
