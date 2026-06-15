import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def row_to_user(row):
    return {
        "id": row[0],
        "login": row[1],
        "password": row[2],
        "name": row[3],
        "position": row[4],
        "role": row[5],
        "contractor": row[6],
    }


def handler(event: dict, context) -> dict:
    """Управление пользователями системы ОТ"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            cur.execute(
                f"SELECT id, login, password, name, position, role, contractor FROM {SCHEMA}.users ORDER BY created_at"
            )
            users = [row_to_user(r) for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(users, ensure_ascii=False)}

        if method == "POST":
            u = body
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (id, login, password, name, position, role, contractor) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (u["id"], u["login"], u["password"], u["name"], u.get("position"), u["role"], u.get("contractor")),
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "PUT":
            u = body
            cur.execute(
                f"UPDATE {SCHEMA}.users SET login=%s, password=%s, name=%s, position=%s, role=%s, contractor=%s WHERE id=%s",
                (u["login"], u["password"], u["name"], u.get("position"), u["role"], u.get("contractor"), u["id"]),
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "DELETE":
            user_id = body.get("id")
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id=%s", (user_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    finally:
        cur.close()
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": "Method not allowed"}
