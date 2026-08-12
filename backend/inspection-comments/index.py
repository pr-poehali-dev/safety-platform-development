import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Комментарии (мини-чат) к записям журнала проверок."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        inspection_id = params.get("inspection_id")
        if not inspection_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "inspection_id required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, inspection_id, author_login, author_name, author_role, message, created_at
                FROM {SCHEMA}.inspection_comments
                WHERE inspection_id = %s
                ORDER BY created_at ASC""",
            (inspection_id,)
        )
        rows = cur.fetchall()
        conn.close()

        result = [
            {
                "id": r[0],
                "inspection_id": r[1],
                "author_login": r[2],
                "author_name": r[3],
                "author_role": r[4],
                "message": r[5],
                "created_at": r[6].isoformat() if r[6] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        inspection_id = body.get("inspection_id")
        message = (body.get("message") or "").strip()

        if not inspection_id or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "inspection_id and message required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.inspection_comments
                (inspection_id, author_login, author_name, author_role, message)
                VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at""",
            (inspection_id, body.get("author_login"), body.get("author_name"),
             body.get("author_role"), message)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()}, ensure_ascii=False)}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
