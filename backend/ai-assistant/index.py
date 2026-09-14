import json
import os
import random
import psycopg2
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
PROXMINT_LIST_URL = "https://raw.githubusercontent.com/proxmint/free-proxy-list/main/proxies/socks5.txt"

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


def get_proxy_settings() -> dict:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT mode, paid_proxy_url, paid_proxy_login, paid_proxy_password FROM {SCHEMA}.proxy_settings WHERE id = 1"
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"mode": "proxmint", "paid_proxy_url": "", "paid_proxy_login": "", "paid_proxy_password": ""}
        return {
            "mode": row[0] or "proxmint",
            "paid_proxy_url": row[1] or "",
            "paid_proxy_login": row[2] or "",
            "paid_proxy_password": row[3] or "",
        }
    except Exception:
        return {"mode": "proxmint", "paid_proxy_url": "", "paid_proxy_login": "", "paid_proxy_password": ""}


def build_paid_proxy_url(cfg: dict) -> str | None:
    url = (cfg.get("paid_proxy_url") or "").strip()
    if not url:
        return None
    login = (cfg.get("paid_proxy_login") or "").strip()
    password = (cfg.get("paid_proxy_password") or "").strip()
    if "://" not in url:
        url = f"http://{url}"
    if login and "@" not in url:
        scheme, rest = url.split("://", 1)
        url = f"{scheme}://{login}:{password}@{rest}"
    return url


def fetch_proxmint_list() -> list:
    try:
        resp = requests.get(PROXMINT_LIST_URL, timeout=2)
        return [line.strip() for line in resp.text.splitlines() if line.strip()]
    except Exception:
        return []


def call_gemini(api_key: str, contents: list, proxy_cfg: dict) -> dict:
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024},
    }
    url = f"{GEMINI_URL}?key={api_key}"

    if proxy_cfg["mode"] == "paid":
        proxy_url = build_paid_proxy_url(proxy_cfg)
        if not proxy_url:
            raise RuntimeError("Платный прокси включён, но не настроен. Укажите адрес прокси в настройках.")
        resp = requests.post(url, json=payload, proxies={"http": proxy_url, "https": proxy_url}, timeout=25)
        resp.raise_for_status()
        return resp.json()

    candidates = fetch_proxmint_list()
    random.shuffle(candidates)
    candidates = candidates[:15]
    if not candidates:
        raise RuntimeError("Список бесплатных прокси Proxmint временно недоступен.")

    def try_proxy(proxy_ip: str):
        proxy_url = f"socks5://{proxy_ip}"
        resp = requests.post(url, json=payload, proxies={"http": proxy_url, "https": proxy_url}, timeout=3)
        if resp.status_code >= 400:
            raise RuntimeError(f"{resp.status_code}: {resp.text[:200]}")
        return resp.json()

    last_error = None
    pool = ThreadPoolExecutor(max_workers=15)
    futures = {pool.submit(try_proxy, ip): ip for ip in candidates}
    try:
        for future in as_completed(futures, timeout=3.5):
            try:
                result = future.result()
                pool.shutdown(wait=False, cancel_futures=True)
                return result
            except Exception as e:
                last_error = e
                continue
    except FuturesTimeoutError:
        last_error = last_error or "таймаут ожидания ответа от прокси"
    pool.shutdown(wait=False, cancel_futures=True)
    raise RuntimeError(f"Не удалось подключиться через бесплатные прокси Proxmint: {str(last_error).replace(api_key, '***')}")


def handler(event: dict, context) -> dict:
    """Чат с ИИ-помощником (Google Gemini через прокси) по вопросам охраны труда и данным SafeWork."""
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
    proxy_cfg = get_proxy_settings()

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
        data = call_gemini(api_key, contents, proxy_cfg)
    except requests.HTTPError as e:
        error_body = e.response.text[:300] if e.response is not None else str(e)
        return {
            "statusCode": 502,
            "headers": CORS,
            "body": json.dumps({"error": f"Ошибка Gemini API: {error_body}"}, ensure_ascii=False),
        }
    except Exception as e:
        safe_error = str(e).replace(api_key, "***")
        return {
            "statusCode": 502,
            "headers": CORS,
            "body": json.dumps({"error": safe_error}, ensure_ascii=False),
        }

    candidates = data.get("candidates") or []
    if not candidates:
        reply = "Не удалось получить ответ от ИИ. Попробуйте переформулировать вопрос."
    else:
        parts = candidates[0].get("content", {}).get("parts", [])
        reply = "".join(p.get("text", "") for p in parts).strip() or "Пустой ответ от ИИ."

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"reply": reply}, ensure_ascii=False)}