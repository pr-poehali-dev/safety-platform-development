import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "•" * len(key)
    return f"{key[:4]}{'•' * 8}{key[-4:]}"


def handler(event: dict, context) -> dict:
    """Настройки ИИ-помощника: включение/выключение, прокси (Proxmint / платный) и API-ключ Gemini."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT mode, paid_proxy_url, paid_proxy_port, paid_proxy_protocol,
                       paid_proxy_login, paid_proxy_password, assistant_enabled, gemini_api_key
                FROM {SCHEMA}.proxy_settings WHERE id = 1"""
        )
        row = cur.fetchone()
        conn.close()

        assistant_enabled = row[6] if row else True

        if params.get("public") == "1":
            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({"assistant_enabled": bool(assistant_enabled)}),
            }

        data = {
            "mode": row[0] if row else "proxmint",
            "paid_proxy_url": row[1] if row else "",
            "paid_proxy_port": row[2] if row else "",
            "paid_proxy_protocol": row[3] if row else "http",
            "paid_proxy_login": row[4] if row else "",
            "paid_proxy_password": row[5] if row else "",
            "assistant_enabled": bool(assistant_enabled),
            "gemini_api_key_masked": mask_key(row[7] if row else ""),
            "has_gemini_api_key": bool(row[7]) if row else False,
        }
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        mode = body.get("mode") if body.get("mode") in ("proxmint", "paid") else "proxmint"
        paid_proxy_url = (body.get("paid_proxy_url") or "").strip()
        paid_proxy_port = (body.get("paid_proxy_port") or "").strip()
        paid_proxy_protocol = body.get("paid_proxy_protocol") if body.get("paid_proxy_protocol") in ("http", "https", "socks5") else "http"
        paid_proxy_login = (body.get("paid_proxy_login") or "").strip()
        paid_proxy_password = (body.get("paid_proxy_password") or "").strip()
        assistant_enabled = bool(body.get("assistant_enabled", True))
        new_gemini_key = (body.get("gemini_api_key") or "").strip()
        updated_by = body.get("updated_by")

        conn = get_conn()
        cur = conn.cursor()

        if new_gemini_key:
            cur.execute(
                f"""UPDATE {SCHEMA}.proxy_settings
                    SET mode = %s, paid_proxy_url = %s, paid_proxy_port = %s, paid_proxy_protocol = %s,
                        paid_proxy_login = %s, paid_proxy_password = %s, assistant_enabled = %s,
                        gemini_api_key = %s, updated_by = %s, updated_at = now()
                    WHERE id = 1""",
                (mode, paid_proxy_url, paid_proxy_port, paid_proxy_protocol, paid_proxy_login,
                 paid_proxy_password, assistant_enabled, new_gemini_key, updated_by),
            )
        else:
            cur.execute(
                f"""UPDATE {SCHEMA}.proxy_settings
                    SET mode = %s, paid_proxy_url = %s, paid_proxy_port = %s, paid_proxy_protocol = %s,
                        paid_proxy_login = %s, paid_proxy_password = %s, assistant_enabled = %s,
                        updated_by = %s, updated_at = now()
                    WHERE id = 1""",
                (mode, paid_proxy_url, paid_proxy_port, paid_proxy_protocol, paid_proxy_login,
                 paid_proxy_password, assistant_enabled, updated_by),
            )
        conn.commit()

        cur.execute(f"SELECT gemini_api_key FROM {SCHEMA}.proxy_settings WHERE id = 1")
        current_key = cur.fetchone()[0] or ""
        conn.close()

        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps(
                {
                    "mode": mode,
                    "paid_proxy_url": paid_proxy_url,
                    "paid_proxy_port": paid_proxy_port,
                    "paid_proxy_protocol": paid_proxy_protocol,
                    "paid_proxy_login": paid_proxy_login,
                    "paid_proxy_password": paid_proxy_password,
                    "assistant_enabled": assistant_enabled,
                    "gemini_api_key_masked": mask_key(current_key),
                    "has_gemini_api_key": bool(current_key),
                },
                ensure_ascii=False,
            ),
        }

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
