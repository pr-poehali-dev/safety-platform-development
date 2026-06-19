import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для справочника видов нарушений."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET — список всех категорий
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order, is_spb FROM {SCHEMA}.violation_categories ORDER BY sort_order, id")
        rows = cur.fetchall()
        conn.close()
        categories = [{"id": r[0], "name": r[1], "sort_order": r[2], "is_spb": r[3]} for r in rows]
        return {"statusCode": 200, "headers": cors, "body": json.dumps(categories, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    # POST — добавить категорию
    if method == "POST":
        name = (body.get("name") or "").strip()
        if not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.violation_categories")
        next_order = cur.fetchone()[0]
        is_spb = bool(body.get("is_spb", False))
        cur.execute(
            f"INSERT INTO {SCHEMA}.violation_categories (name, sort_order, is_spb) VALUES (%s, %s, %s) RETURNING id, name, sort_order, is_spb",
            (name, next_order, is_spb)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": row[0], "name": row[1], "sort_order": row[2], "is_spb": row[3]}, ensure_ascii=False)}

    # PUT — обновить категорию
    if method == "PUT":
        cat_id = body.get("id")
        name = (body.get("name") or "").strip()
        if not cat_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        is_spb = bool(body.get("is_spb", False))
        cur.execute(f"UPDATE {SCHEMA}.violation_categories SET name = %s, is_spb = %s WHERE id = %s", (name, is_spb, cat_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # DELETE — удалить категорию
    if method == "DELETE":
        cat_id = body.get("id")
        if not cat_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.violation_categories WHERE id = %s", (cat_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}