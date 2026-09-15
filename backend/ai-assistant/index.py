import json
import os
import psycopg2
import requests

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}

PROVIDERS = ("gemini", "yandexgpt", "gigachat", "deepseek", "openai_compatible")

SYSTEM_PROMPT = """Ты — ИИ-помощник в корпоративном веб-приложении SafeWork для управления охраной труда на строительных объектах.
Твои задачи:
1. Консультировать пользователей по вопросам охраны труда, техники безопасности, норм и правил.
2. Помогать формулировать нарушения и замечания для предписаний и проверок (чёткая формулировка, ссылка на категорию нарушения, разумный срок устранения).
3. Помогать анализировать текущие данные приложения (сводка по предписаниям, проверкам, происшествиям, штрафам), которые тебе передаются в контексте ниже.

Отвечай кратко, по делу, на русском языке, простым языком без лишних канцеляризмов. Если вопрос не по теме охраны труда или приложения — вежливо скажи, что помогаешь только с вопросами по охране труда и SafeWork."""


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "•" * len(key)
    return f"{key[:4]}{'•' * 8}{key[-4:]}"


DEFAULT_SETTINGS = {
    "assistant_enabled": True,
    "provider": "gemini",
    "api_key": "",
    "api_base_url": "",
    "model": "",
}


def get_settings() -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT assistant_enabled, provider, api_key, api_base_url, model
            FROM {SCHEMA}.ai_settings WHERE id = 1"""
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return dict(DEFAULT_SETTINGS)
    return {
        "assistant_enabled": row[0] if row[0] is not None else True,
        "provider": row[1] or "gemini",
        "api_key": row[2] or "",
        "api_base_url": row[3] or "",
        "model": row[4] or "",
    }


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


def call_gemini(cfg: dict, contents: list) -> str:
    model = cfg["model"] or "gemini-flash-latest"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={cfg['api_key']}"
    gemini_contents = []
    for role, text in contents:
        gemini_contents.append({"role": "model" if role == "model" else "user", "parts": [{"text": text}]})
    payload = {"contents": gemini_contents, "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024}}
    resp = requests.post(url, json=payload, timeout=25)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return "Не удалось получить ответ от ИИ. Попробуйте переформулировать вопрос."
    parts = candidates[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in parts).strip() or "Пустой ответ от ИИ."


def call_openai_compatible(cfg: dict, contents: list, default_base_url: str, default_model: str) -> str:
    """Единый вызов для DeepSeek / любого OpenAI-совместимого API (chat/completions)."""
    base_url = (cfg["api_base_url"] or default_base_url).rstrip("/")
    model = cfg["model"] or default_model
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for role, text in contents:
        messages.append({"role": "assistant" if role == "model" else "user", "content": text})
    resp = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
        json={"model": model, "messages": messages, "temperature": 0.4, "max_tokens": 1024},
        timeout=25,
    )
    resp.raise_for_status()
    data = resp.json()
    return (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip() or "Пустой ответ от ИИ."


def call_yandexgpt(cfg: dict, contents: list) -> str:
    folder_id, api_key = (cfg["api_key"].split(":", 1) + [""])[:2] if ":" in cfg["api_key"] else (cfg["api_base_url"], cfg["api_key"])
    model = cfg["model"] or "yandexgpt-lite"
    messages = [{"role": "system", "text": SYSTEM_PROMPT}]
    for role, text in contents:
        messages.append({"role": "assistant" if role == "model" else "user", "text": text})
    resp = requests.post(
        "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
        headers={"Authorization": f"Api-Key {api_key}", "Content-Type": "application/json"},
        json={
            "modelUri": f"gpt://{folder_id}/{model}",
            "completionOptions": {"stream": False, "temperature": 0.4, "maxTokens": 1024},
            "messages": messages,
        },
        timeout=25,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["result"]["alternatives"][0]["message"]["text"].strip()


def call_gigachat(cfg: dict, contents: list) -> str:
    token_resp = requests.post(
        "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
        headers={
            "Authorization": f"Basic {cfg['api_key']}",
            "RqUID": os.urandom(16).hex(),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"scope": cfg["api_base_url"] or "GIGACHAT_API_PERS"},
        timeout=15,
        verify=False,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for role, text in contents:
        messages.append({"role": "assistant" if role == "model" else "user", "content": text})
    resp = requests.post(
        "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        json={"model": cfg["model"] or "GigaChat", "messages": messages, "temperature": 0.4, "max_tokens": 1024},
        timeout=25,
        verify=False,
    )
    resp.raise_for_status()
    data = resp.json()
    return (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip() or "Пустой ответ от ИИ."


def call_provider(cfg: dict, contents: list) -> str:
    provider = cfg["provider"]
    if provider == "gemini":
        return call_gemini(cfg, contents)
    if provider == "deepseek":
        return call_openai_compatible(cfg, contents, "https://api.deepseek.com", "deepseek-chat")
    if provider == "openai_compatible":
        return call_openai_compatible(cfg, contents, cfg["api_base_url"], cfg["model"] or "gpt-4o-mini")
    if provider == "yandexgpt":
        return call_yandexgpt(cfg, contents)
    if provider == "gigachat":
        return call_gigachat(cfg, contents)
    raise RuntimeError(f"Неизвестный провайдер: {provider}")


def handler(event: dict, context) -> dict:
    """Настройки и чат ИИ-помощника: хранение ключей/провайдера (GET/PUT) и обработка сообщений (POST)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        cfg = get_settings()
        if params.get("public") == "1":
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"assistant_enabled": bool(cfg["assistant_enabled"])}),
            }
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps(
                {
                    "assistant_enabled": bool(cfg["assistant_enabled"]),
                    "provider": cfg["provider"],
                    "api_base_url": cfg["api_base_url"],
                    "model": cfg["model"],
                    "api_key_masked": mask_key(cfg["api_key"]),
                    "has_api_key": bool(cfg["api_key"]),
                },
                ensure_ascii=False,
            ),
        }

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        assistant_enabled = bool(body.get("assistant_enabled", True))
        provider = body.get("provider") if body.get("provider") in PROVIDERS else "gemini"
        api_base_url = (body.get("api_base_url") or "").strip()
        model = (body.get("model") or "").strip()
        new_api_key = (body.get("api_key") or "").strip()
        updated_by = body.get("updated_by")

        conn = get_conn()
        cur = conn.cursor()
        if new_api_key:
            cur.execute(
                f"""UPDATE {SCHEMA}.ai_settings
                    SET assistant_enabled = %s, provider = %s, api_base_url = %s, model = %s,
                        api_key = %s, updated_by = %s, updated_at = now()
                    WHERE id = 1""",
                (assistant_enabled, provider, api_base_url, model, new_api_key, updated_by),
            )
        else:
            cur.execute(
                f"""UPDATE {SCHEMA}.ai_settings
                    SET assistant_enabled = %s, provider = %s, api_base_url = %s, model = %s,
                        updated_by = %s, updated_at = now()
                    WHERE id = 1""",
                (assistant_enabled, provider, api_base_url, model, updated_by),
            )
        conn.commit()
        cur.execute(f"SELECT api_key FROM {SCHEMA}.ai_settings WHERE id = 1")
        current_key = cur.fetchone()[0] or ""
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps(
                {
                    "assistant_enabled": assistant_enabled,
                    "provider": provider,
                    "api_base_url": api_base_url,
                    "model": model,
                    "api_key_masked": mask_key(current_key),
                    "has_api_key": bool(current_key),
                },
                ensure_ascii=False,
            ),
        }

    if method == "POST":
        cfg = get_settings()
        if not cfg["assistant_enabled"]:
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"reply": "ИИ-помощник временно отключён администратором."}, ensure_ascii=False),
            }
        if not cfg["api_key"]:
            return {
                "statusCode": 500,
                "headers": CORS,
                "body": json.dumps({"error": "API-ключ ИИ-провайдера не настроен"}, ensure_ascii=False),
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
            ("user", SYSTEM_PROMPT),
            ("model", "Понял, готов помогать."),
            ("user", f"{data_context}\n\nПользователь: {user_name} (роль: {user_role})"),
            ("model", "Учту эти данные при ответах."),
        ]
        for h in history[-10:]:
            role = "model" if h.get("role") == "model" else "user"
            text = (h.get("text") or "").strip()
            if text:
                contents.append((role, text))
        contents.append(("user", message))

        try:
            reply = call_provider(cfg, contents)
        except requests.HTTPError as e:
            error_body = e.response.text[:300] if e.response is not None else str(e)
            safe_error = error_body.replace(cfg["api_key"], "***")
            return {
                "statusCode": 502,
                "headers": CORS,
                "body": json.dumps({"error": f"Ошибка ИИ-провайдера: {safe_error}"}, ensure_ascii=False),
            }
        except Exception as e:
            safe_error = str(e).replace(cfg["api_key"], "***") if cfg["api_key"] else str(e)
            return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": safe_error}, ensure_ascii=False)}

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply}, ensure_ascii=False)}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
