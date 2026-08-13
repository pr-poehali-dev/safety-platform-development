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
        "sessionsInvalidatedAt": row[7].isoformat() if row[7] else None,
    }


def get_user_object_ids(cur, user_id):
    cur.execute(f"SELECT object_id FROM {SCHEMA}.user_objects WHERE user_id=%s", (user_id,))
    return [r[0] for r in cur.fetchall()]


def set_user_objects(cur, user_id, object_ids):
    cur.execute(f"DELETE FROM {SCHEMA}.user_objects WHERE user_id=%s", (user_id,))
    for oid in object_ids or []:
        cur.execute(
            f"INSERT INTO {SCHEMA}.user_objects (user_id, object_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
            (user_id, oid),
        )


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
                f"SELECT id, login, password, name, position, role, contractor, sessions_invalidated_at FROM {SCHEMA}.users ORDER BY created_at"
            )
            rows = cur.fetchall()
            cur.execute(f"SELECT user_id, object_id FROM {SCHEMA}.user_objects")
            objects_map: dict = {}
            for uid, oid in cur.fetchall():
                objects_map.setdefault(uid, []).append(oid)
            users = []
            for r in rows:
                u = row_to_user(r)
                u["objectIds"] = objects_map.get(r[0], [])
                users.append(u)
            return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(users, ensure_ascii=False)}

        if method == "POST" and body.get("action") == "invalidate_sessions":
            user_id = body.get("id")
            cur.execute(
                f"UPDATE {SCHEMA}.users SET sessions_invalidated_at = NOW() WHERE id=%s RETURNING sessions_invalidated_at",
                (user_id,),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "user not found"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "sessionsInvalidatedAt": row[0].isoformat()})}

        if method == "POST":
            u = body
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (id, login, password, name, position, role, contractor) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (u["id"], u["login"], u["password"], u["name"], u.get("position"), u["role"], u.get("contractor")),
            )
            if u.get("role") == "project_team":
                set_user_objects(cur, u["id"], u.get("objectIds", []))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "PUT":
            u = body
            cur.execute(
                f"UPDATE {SCHEMA}.users SET login=%s, password=%s, name=%s, position=%s, role=%s, contractor=%s WHERE id=%s",
                (u["login"], u["password"], u["name"], u.get("position"), u["role"], u.get("contractor"), u["id"]),
            )
            if u.get("role") == "project_team":
                set_user_objects(cur, u["id"], u.get("objectIds", []))
            else:
                set_user_objects(cur, u["id"], [])
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