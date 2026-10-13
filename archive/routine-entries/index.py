import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def row_to_entry(r):
    return {
        "id": r[0], "user_login": r[1], "user_name": r[2],
        "category_id": r[3], "category_name": r[4],
        "entry_date": r[5].isoformat() if hasattr(r[5], "isoformat") else r[5],
        "hours": float(r[6]), "comment": r[7] or "",
        "created_at": r[8].isoformat() if hasattr(r[8], "isoformat") else r[8],
    }

def handler(event: dict, context) -> dict:
    """CRUD для записей рутинной работы специалиста ОТ.
    GET ?login=X&from=YYYY-MM-DD&to=YYYY-MM-DD — записи пользователя за период (например, за неделю)
    POST — создать запись
    PUT — обновить запись
    DELETE ?id=X — удалить запись
    """
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        qs = event.get("queryStringParameters") or {}
        login = qs.get("login")
        date_from = qs.get("from")
        date_to = qs.get("to")
        if not login:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "login required"})}

        conn = get_conn()
        cur = conn.cursor()
        query = (
            f"SELECT id, user_login, user_name, category_id, category_name, entry_date, hours, comment, created_at "
            f"FROM {SCHEMA}.routine_entries WHERE user_login = %s"
        )
        params = [login]
        if date_from:
            query += " AND entry_date >= %s"
            params.append(date_from)
        if date_to:
            query += " AND entry_date <= %s"
            params.append(date_to)
        query += " ORDER BY entry_date, id"
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps([row_to_entry(r) for r in rows], ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    if method == "POST":
        user_login = body.get("user_login")
        user_name = body.get("user_name")
        category_id = body.get("category_id")
        category_name = body.get("category_name")
        entry_date = body.get("entry_date")
        hours = body.get("hours", 1)
        comment = body.get("comment", "")
        if not user_login or not category_name or not entry_date:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "user_login, category_name and entry_date required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.routine_entries (user_login, user_name, category_id, category_name, entry_date, hours, comment) "
            f"VALUES (%s,%s,%s,%s,%s,%s,%s) "
            f"RETURNING id, user_login, user_name, category_id, category_name, entry_date, hours, comment, created_at",
            (user_login, user_name, category_id, category_name, entry_date, hours, comment)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps(row_to_entry(row), ensure_ascii=False)}

    if method == "PUT":
        entry_id = body.get("id")
        if not entry_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.routine_entries SET category_id=%s, category_name=%s, entry_date=%s, hours=%s, comment=%s "
            f"WHERE id=%s "
            f"RETURNING id, user_login, user_name, category_id, category_name, entry_date, hours, comment, created_at",
            (body.get("category_id"), body.get("category_name"), body.get("entry_date"), body.get("hours", 1), body.get("comment", ""), entry_id)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        if not row:
            return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "not found"})}
        return {"statusCode": 200, "headers": cors, "body": json.dumps(row_to_entry(row), ensure_ascii=False)}

    if method == "DELETE":
        qs = event.get("queryStringParameters") or {}
        entry_id = body.get("id") or qs.get("id")
        if not entry_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.routine_entries WHERE id = %s", (entry_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}
