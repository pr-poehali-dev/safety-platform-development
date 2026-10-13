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
    qs = event.get("queryStringParameters") or {}
    pyramid_id = 2 if str(qs.get("id", "1")) == "2" else 1

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT danger_actions, suspended_works, visible FROM {SCHEMA}.pyramid_manual_stats WHERE id = {pyramid_id}")
        row = cur.fetchone()
        conn.close()
        data = {"danger_actions": row[0] if row else 0, "suspended_works": row[1] if row else 0, "visible": bool(row[2]) if row else True}
        return {"statusCode": 200, "headers": cors, "body": json.dumps(data)}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        if "visible" in body and "danger_actions" not in body:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {SCHEMA}.pyramid_manual_stats SET visible = %s, updated_by = %s, updated_at = now() WHERE id = {pyramid_id}",
                (bool(body["visible"]), body.get("updated_by"))
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}
        danger_actions = int(body.get("danger_actions") or 0)
        suspended_works = int(body.get("suspended_works") or 0)
        updated_by = body.get("updated_by")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.pyramid_manual_stats
                SET danger_actions = %s, suspended_works = %s, updated_by = %s, updated_at = now()
                WHERE id = {pyramid_id}""",
            (danger_actions, suspended_works, updated_by)
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}