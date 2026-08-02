import json
import os

import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Хранит ручные корректировочные числа для Пирамиды происшествий (НИТ): опасные действия/условия и приостановки работ."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT danger_actions, suspended_works FROM {SCHEMA}.pyramid_manual_stats WHERE id = 1")
        row = cur.fetchone()
        conn.close()
        data = {"danger_actions": row[0] if row else 0, "suspended_works": row[1] if row else 0}
        return {"statusCode": 200, "headers": cors, "body": json.dumps(data)}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        danger_actions = int(body.get("danger_actions") or 0)
        suspended_works = int(body.get("suspended_works") or 0)
        updated_by = body.get("updated_by")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.pyramid_manual_stats
                SET danger_actions = %s, suspended_works = %s, updated_by = %s, updated_at = now()
                WHERE id = 1""",
            (danger_actions, suspended_works, updated_by)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}