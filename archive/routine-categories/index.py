import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для справочника видов деятельности рутины."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order FROM {SCHEMA}.routine_categories ORDER BY sort_order, id")
        rows = cur.fetchall()
        conn.close()
        categories = [{"id": r[0], "name": r[1], "sort_order": r[2]} for r in rows]
        return {"statusCode": 200, "headers": cors, "body": json.dumps(categories, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    if method == "POST":
        name = (body.get("name") or "").strip()
        if not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.routine_categories")
        next_order = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.routine_categories (name, sort_order) VALUES (%s, %s) RETURNING id, name, sort_order",
            (name, next_order)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": row[0], "name": row[1], "sort_order": row[2]}, ensure_ascii=False)}

    if method == "PUT":
        cat_id = body.get("id")
        name = (body.get("name") or "").strip()
        if not cat_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.routine_categories SET name = %s WHERE id = %s", (name, cat_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    if method == "DELETE":
        cat_id = body.get("id")
        if not cat_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.routine_categories WHERE id = %s", (cat_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}
