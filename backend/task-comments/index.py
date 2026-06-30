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
    """Комментарии (мини-чат) к поручениям."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        assignment_id = params.get("assignment_id")
        if not assignment_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "assignment_id required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, assignment_id, author_login, author_name, author_role, message, created_at
                FROM {SCHEMA}.task_comments
                WHERE assignment_id = %s
                ORDER BY created_at ASC""",
            (assignment_id,)
        )
        rows = cur.fetchall()
        conn.close()

        result = [
            {
                "id": r[0],
                "assignment_id": r[1],
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
        assignment_id = body.get("assignment_id")
        message = (body.get("message") or "").strip()

        if not assignment_id or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "assignment_id and message required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.task_comments
                (assignment_id, author_login, author_name, author_role, message)
                VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at""",
            (assignment_id, body.get("author_login"), body.get("author_name"),
             body.get("author_role"), message)
        )
        row = cur.fetchone()

        # Уведомить второго участника
        cur.execute(
            f"""SELECT ta.assignee_login, ta.assignee_name, t.created_by, t.description
                FROM {SCHEMA}.task_assignments ta
                JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                WHERE ta.id = %s""",
            (assignment_id,)
        )
        task_row = cur.fetchone()
        if task_row:
            author_login = body.get("author_login")
            msg_preview = message[:60]
            task_desc = task_row[3][:50] if task_row[3] else ""
            author_name = body.get("author_name", "")

            if author_login == task_row[0]:
                notify_login = task_row[2]
            else:
                notify_login = task_row[0]

            cur.execute(
                f"""INSERT INTO {SCHEMA}.task_notifications
                    (user_login, assignment_id, event_type, message)
                    VALUES (%s, %s, 'new_comment', %s)""",
                (notify_login, assignment_id,
                 f"Новый комментарий от {author_name} по задаче «{task_desc}»: {msg_preview}")
            )

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "created_at": row[1].isoformat()})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
