import json
import os
import psycopg2
from datetime import date

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD задач и поручений."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()

        role = params.get("role", "")
        login = params.get("login", "")
        today = date.today().isoformat()

        # Автоматически переводим просроченные в статус overdue
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'overdue', updated_at = NOW()
                WHERE status = 'active' AND due_date < %s""",
            (today,)
        )
        conn.commit()

        if role == "admin":
            cur.execute(
                f"""SELECT ta.id, ta.task_id, t.description, ta.assignee_login,
                           ta.assignee_name, ta.assignee_role, ta.due_date, ta.status,
                           ta.extension_requested_date, ta.extension_comment,
                           ta.extension_resolution, ta.extension_reject_comment,
                           ta.report_text, ta.report_submitted_at, ta.rejection_comment,
                           ta.created_at, ta.updated_at,
                           t.created_by, t.created_by_name, t.created_at as task_created_at
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    ORDER BY ta.created_at DESC"""
            )
        elif role == "manager":
            cur.execute(
                f"""SELECT ta.id, ta.task_id, t.description, ta.assignee_login,
                           ta.assignee_name, ta.assignee_role, ta.due_date, ta.status,
                           ta.extension_requested_date, ta.extension_comment,
                           ta.extension_resolution, ta.extension_reject_comment,
                           ta.report_text, ta.report_submitted_at, ta.rejection_comment,
                           ta.created_at, ta.updated_at,
                           t.created_by, t.created_by_name, t.created_at as task_created_at
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    WHERE t.created_by = %s
                    ORDER BY ta.created_at DESC""",
                (login,)
            )
        else:
            cur.execute(
                f"""SELECT ta.id, ta.task_id, t.description, ta.assignee_login,
                           ta.assignee_name, ta.assignee_role, ta.due_date, ta.status,
                           ta.extension_requested_date, ta.extension_comment,
                           ta.extension_resolution, ta.extension_reject_comment,
                           ta.report_text, ta.report_submitted_at, ta.rejection_comment,
                           ta.created_at, ta.updated_at,
                           t.created_by, t.created_by_name, t.created_at as task_created_at
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    WHERE ta.assignee_login = %s
                    ORDER BY ta.created_at DESC""",
                (login,)
            )

        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "task_id": r[1],
                "description": r[2],
                "assignee_login": r[3],
                "assignee_name": r[4],
                "assignee_role": r[5],
                "due_date": r[6].isoformat() if r[6] else None,
                "status": r[7],
                "extension_requested_date": r[8].isoformat() if r[8] else None,
                "extension_comment": r[9],
                "extension_resolution": r[10],
                "extension_reject_comment": r[11],
                "report_text": r[12],
                "report_submitted_at": r[13].isoformat() if r[13] else None,
                "rejection_comment": r[14],
                "created_at": r[15].isoformat() if r[15] else None,
                "updated_at": r[16].isoformat() if r[16] else None,
                "created_by": r[17],
                "created_by_name": r[18],
                "task_created_at": r[19].isoformat() if r[19] else None,
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        description = body.get("description", "").strip()
        if not description:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "description required"})}

        assignees = body.get("assignees", [])
        if not assignees:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "assignees required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.tasks (description, created_by, created_by_name)
                VALUES (%s, %s, %s) RETURNING id""",
            (description, body.get("created_by"), body.get("created_by_name"))
        )
        task_id = cur.fetchone()[0]

        assignment_ids = []
        for a in assignees:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.task_assignments
                    (task_id, assignee_login, assignee_name, assignee_role, due_date, status)
                    VALUES (%s, %s, %s, %s, %s, 'active') RETURNING id""",
                (task_id, a["login"], a["name"], a["role"], a["due_date"])
            )
            assignment_ids.append(cur.fetchone()[0])

        # Уведомления назначенным
        for i, a in enumerate(assignees):
            cur.execute(
                f"""INSERT INTO {SCHEMA}.task_notifications
                    (user_login, assignment_id, event_type, message)
                    VALUES (%s, %s, 'new_task', %s)""",
                (a["login"], assignment_ids[i], f"Вам назначена новая задача: {description[:80]}")
            )

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"task_id": task_id, "assignment_ids": assignment_ids})}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        task_id = body.get("task_id")
        if not task_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "task_id required"})}

        description = body.get("description", "").strip()
        assignees = body.get("assignees", [])

        conn = get_conn()
        cur = conn.cursor()

        if description:
            cur.execute(
                f"UPDATE {SCHEMA}.tasks SET description = %s WHERE id = %s",
                (description, task_id)
            )

        for a in assignees:
            if a.get("assignment_id"):
                cur.execute(
                    f"""UPDATE {SCHEMA}.task_assignments
                        SET due_date = %s, updated_at = NOW()
                        WHERE id = %s""",
                    (a["due_date"], a["assignment_id"])
                )
                # Уведомление об изменении срока
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, assignment_id, event_type, message)
                        VALUES (%s, %s, 'due_date_changed', %s)""",
                    (a["login"], a["assignment_id"], f"Изменён срок по задаче: {description[:80] if description else ''}")
                )

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    if method == "DELETE":
        params = event.get("queryStringParameters") or {}
        task_id = params.get("task_id")
        assignment_id = params.get("assignment_id")

        conn = get_conn()
        cur = conn.cursor()

        if task_id:
            # Уведомить всех назначенных
            cur.execute(
                f"""SELECT ta.assignee_login, ta.id, t.description
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    WHERE ta.task_id = %s""",
                (task_id,)
            )
            for row in cur.fetchall():
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, event_type, message)
                        VALUES (%s, 'task_deleted', %s)""",
                    (row[0], f"Задача удалена: {row[2][:80]}")
                )
            cur.execute(f"DELETE FROM {SCHEMA}.task_assignments WHERE task_id = %s", (task_id,))
            cur.execute(f"DELETE FROM {SCHEMA}.tasks WHERE id = %s", (task_id,))

        elif assignment_id:
            cur.execute(
                f"""SELECT ta.assignee_login, t.description
                    FROM {SCHEMA}.task_assignments ta
                    JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                    WHERE ta.id = %s""",
                (assignment_id,)
            )
            row = cur.fetchone()
            if row:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, assignment_id, event_type, message)
                        VALUES (%s, %s, 'task_deleted', %s)""",
                    (row[0], assignment_id, f"Задача удалена: {row[1][:80]}")
                )
            cur.execute(f"DELETE FROM {SCHEMA}.task_assignments WHERE id = %s", (assignment_id,))

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
