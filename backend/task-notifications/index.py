import json
import os
import psycopg2
from datetime import date, timedelta

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Уведомления: получение, отметка прочитанными, проверка сроков."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        login = params.get("login")
        if not login:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "login required"})}

        conn = get_conn()
        cur = conn.cursor()

        # Генерируем уведомления о приближении сроков при входе
        today = date.today()
        for days_left in [3, 2, 1]:
            target_date = today + timedelta(days=days_left)
            cur.execute(
                f"""SELECT ta.id, t.description
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    WHERE ta.assignee_login = %s
                      AND ta.due_date = %s
                      AND ta.status IN ('active', 'revision')
                      AND NOT EXISTS (
                        SELECT 1 FROM {SCHEMA}.task_notifications tn
                        WHERE tn.assignment_id = ta.id
                          AND tn.event_type = %s
                          AND tn.created_at::date = %s
                      )""",
                (login, target_date.isoformat(), f"deadline_{days_left}d", today.isoformat())
            )
            for row in cur.fetchall():
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, assignment_id, event_type, message)
                        VALUES (%s, %s, %s, %s)""",
                    (login, row[0], f"deadline_{days_left}d",
                     f"До срока {days_left} {'день' if days_left == 1 else 'дня'}: {row[1][:70]}")
                )

        # Уведомления о просрочке
        cur.execute(
            f"""SELECT ta.id, t.description
                FROM {SCHEMA}.task_assignments ta
                JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                WHERE ta.assignee_login = %s
                  AND ta.due_date < %s
                  AND ta.status = 'overdue'
                  AND NOT EXISTS (
                    SELECT 1 FROM {SCHEMA}.task_notifications tn
                    WHERE tn.assignment_id = ta.id
                      AND tn.event_type = 'overdue'
                      AND tn.created_at::date = %s
                  )""",
            (login, today.isoformat(), today.isoformat())
        )
        for row in cur.fetchall():
            cur.execute(
                f"""INSERT INTO {SCHEMA}.task_notifications
                    (user_login, assignment_id, event_type, message)
                    VALUES (%s, %s, 'overdue', %s)""",
                (login, row[0], f"Задача просрочена: {row[1][:70]}")
            )

        conn.commit()

        cur.execute(
            f"""SELECT id, assignment_id, event_type, message, is_read, created_at
                FROM {SCHEMA}.task_notifications
                WHERE user_login = %s
                ORDER BY created_at DESC
                LIMIT 50""",
            (login,)
        )
        rows = cur.fetchall()
        conn.close()

        result = [
            {
                "id": r[0],
                "assignment_id": r[1],
                "event_type": r[2],
                "message": r[3],
                "is_read": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        conn = get_conn()
        cur = conn.cursor()

        if action == "mark_read":
            login = body.get("login")
            notification_id = body.get("notification_id")
            if notification_id:
                cur.execute(
                    f"UPDATE {SCHEMA}.task_notifications SET is_read = TRUE WHERE id = %s AND user_login = %s",
                    (notification_id, login)
                )
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.task_notifications SET is_read = TRUE WHERE user_login = %s",
                    (login,)
                )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
