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


def handler(event: dict, context) -> dict:
    """Настройки прокси для ИИ-помощника: режим (Proxmint / платный), адрес, порт, протокол и логин/пароль платного прокси."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT mode, paid_proxy_url, paid_proxy_port, paid_proxy_protocol,
                       paid_proxy_login, paid_proxy_password
                FROM {SCHEMA}.proxy_settings WHERE id = 1"""
        )
        row = cur.fetchone()
        conn.close()
        data = {
            "mode": row[0] if row else "proxmint",
            "paid_proxy_url": row[1] if row else "",
            "paid_proxy_port": row[2] if row else "",
            "paid_proxy_protocol": row[3] if row else "http",
            "paid_proxy_login": row[4] if row else "",
            "paid_proxy_password": row[5] if row else "",
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
        updated_by = body.get("updated_by")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.proxy_settings
                SET mode = %s, paid_proxy_url = %s, paid_proxy_port = %s, paid_proxy_protocol = %s,
                    paid_proxy_login = %s, paid_proxy_password = %s,
                    updated_by = %s, updated_at = now()
                WHERE id = 1""",
            (mode, paid_proxy_url, paid_proxy_port, paid_proxy_protocol, paid_proxy_login, paid_proxy_password, updated_by),
        )
        conn.commit()
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
                },
                ensure_ascii=False,
            ),
        }

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
