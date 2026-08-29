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

# Конфигурация типов уведомлений: таблица и колонка с id связанной сущности
ENTITY_CONFIG = {
    "task": {"table": "task_notifications", "ref_col": "assignment_id"},
    "inspection": {"table": "inspection_notifications", "ref_col": "inspection_id"},
    "prescription": {"table": "prescription_notifications", "ref_col": "prescription_id"},
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def generate_task_deadline_notifications(cur, login):
    """Для задач: генерируем уведомления о приближающихся/просроченных дедлайнах прямо при чтении."""
    today = date.today()
    today_str = today.isoformat()
    d1 = (today + timedelta(days=1)).isoformat()
    d2 = (today + timedelta(days=2)).isoformat()
    d3 = (today + timedelta(days=3)).isoformat()

    cur.execute(
        f"""SELECT ta.id, t.description, ta.due_date
            FROM {SCHEMA}.task_assignments ta
            JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
            WHERE ta.assignee_login = %s
              AND ta.due_date IN (%s, %s, %s)
              AND ta.status IN ('active', 'revision')
              AND NOT EXISTS (
                SELECT 1 FROM {SCHEMA}.task_notifications tn
                WHERE tn.assignment_id = ta.id
                  AND tn.event_type LIKE 'deadline_%%'
                  AND tn.created_at::date = %s
              )""",
        (login, d1, d2, d3, today_str)
    )
    deadline_rows = cur.fetchall()

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
        (login, today_str, today_str)
    )
    overdue_rows = cur.fetchall()

    notif_values = []
    for row in deadline_rows:
        due = row[2]
        due_date = due if isinstance(due, date) else date.fromisoformat(str(due))
        days_left = (due_date - today).days
        label = "день" if days_left == 1 else "дня"
        notif_values.append((login, row[0], f"deadline_{days_left}d", f"До срока {days_left} {label}: {row[1][:70]}"))
    for row in overdue_rows:
        notif_values.append((login, row[0], "overdue", f"Задача просрочена: {row[1][:70]}"))

    if notif_values:
        cur.executemany(
            f"""INSERT INTO {SCHEMA}.task_notifications (user_login, assignment_id, event_type, message)
                VALUES (%s, %s, %s, %s)""",
            notif_values
        )


def handler(event: dict, context) -> dict:
    """Универсальные уведомления по задачам/проверкам/предписаниям: получение, отметка прочитанными."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    entity_type = params.get("type", "task")
    config = ENTITY_CONFIG.get(entity_type)
    if not config:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid type"})}
    table = config["table"]
    ref_col = config["ref_col"]

    if method == "GET":
        login = params.get("login")
        if not login:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "login required"})}

        conn = get_conn()
        cur = conn.cursor()

        if entity_type == "task":
            generate_task_deadline_notifications(cur, login)
            conn.commit()

        cur.execute(
            f"""SELECT id, {ref_col}, event_type, message, is_read, created_at
                FROM {SCHEMA}.{table}
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
                ref_col: r[1],
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

        if action != "mark_read":
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

        login = body.get("login")
        notification_id = body.get("notification_id")

        conn = get_conn()
        cur = conn.cursor()
        if notification_id:
            cur.execute(
                f"UPDATE {SCHEMA}.{table} SET is_read = TRUE WHERE id = %s AND user_login = %s",
                (notification_id, login)
            )
        else:
            cur.execute(
                f"UPDATE {SCHEMA}.{table} SET is_read = TRUE WHERE user_login = %s",
                (login,)
            )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
