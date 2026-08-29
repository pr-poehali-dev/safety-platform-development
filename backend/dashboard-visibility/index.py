import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}

TAB_KEYS = ["prescriptions", "inspections", "incidents", "tasks", "headcount", "fines"]
BLOCK_KEYS = [
    "presCards", "inspCards", "tasksWidget", "headcountWidget", "finesWidget",
    "spb", "pyramid", "topContractors", "pivotTable", "remarksChart",
]

DEFAULT_SETTINGS = {
    "tabs": {k: True for k in TAB_KEYS},
    "blocks": {k: True for k in BLOCK_KEYS},
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def normalize_settings(raw):
    raw = raw or {}
    tabs = raw.get("tabs") or {}
    blocks = raw.get("blocks") or {}
    return {
        "tabs": {k: bool(tabs.get(k, True)) for k in TAB_KEYS},
        "blocks": {k: bool(blocks.get(k, True)) for k in BLOCK_KEYS},
    }


def fetch_settings(cur, scope_type, scope_key):
    cur.execute(
        f"SELECT settings FROM {SCHEMA}.dashboard_visibility_settings WHERE scope_type=%s AND scope_key=%s",
        (scope_type, scope_key),
    )
    row = cur.fetchone()
    if not row:
        return None
    settings = row[0]
    if isinstance(settings, str):
        settings = json.loads(settings)
    return settings


def handler(event: dict, context) -> dict:
    """Настройки видимости вкладок и блоков Главной страницы по роли или конкретному пользователю."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            qs = event.get("queryStringParameters") or {}

            if qs.get("resolve"):
                user_id = qs.get("user_id")
                role = qs.get("role")
                settings = None
                if user_id:
                    settings = fetch_settings(cur, "user", user_id)
                if settings is None and role:
                    settings = fetch_settings(cur, "role", role)
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"settings": normalize_settings(settings)})}

            scope_type = qs.get("scope_type")
            scope_key = qs.get("scope_key")
            if not scope_type or not scope_key:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "scope_type and scope_key required"})}
            settings = fetch_settings(cur, scope_type, scope_key)
            normalized = normalize_settings(settings) if settings is not None else None
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"settings": normalized})}

        body = json.loads(event.get("body") or "{}")

        if method == "PUT":
            scope_type = body.get("scope_type")
            scope_key = body.get("scope_key")
            if scope_type not in ("role", "user") or not scope_key:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "scope_type (role|user) and scope_key required"})}
            settings = normalize_settings(body.get("settings"))
            updated_by = body.get("updated_by")
            cur.execute(
                f"""INSERT INTO {SCHEMA}.dashboard_visibility_settings (scope_type, scope_key, settings, updated_by)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (scope_type, scope_key) DO UPDATE SET
                        settings = EXCLUDED.settings,
                        updated_by = EXCLUDED.updated_by,
                        updated_at = now()""",
                (scope_type, scope_key, json.dumps(settings), updated_by),
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"settings": settings})}

        if method == "DELETE":
            scope_type = body.get("scope_type")
            scope_key = body.get("scope_key")
            if scope_type not in ("role", "user") or not scope_key:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "scope_type (role|user) and scope_key required"})}
            cur.execute(
                f"DELETE FROM {SCHEMA}.dashboard_visibility_settings WHERE scope_type=%s AND scope_key=%s",
                (scope_type, scope_key),
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
    finally:
        conn.close()