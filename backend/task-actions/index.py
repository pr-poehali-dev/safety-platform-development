import json
import os
import psycopg2
from datetime import date

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def notify(cur, user_login, assignment_id, event_type, message):
    cur.execute(
        f"""INSERT INTO {SCHEMA}.task_notifications
            (user_login, assignment_id, event_type, message)
            VALUES (%s, %s, %s, %s)""",
        (user_login, assignment_id, event_type, message)
    )

def log_history(cur, assignment_id, event_type, old_value="", new_value="", comment="", by="", by_name=""):
    cur.execute(
        f"""INSERT INTO {SCHEMA}.task_history
            (task_id, assignment_id, event_type, old_value, new_value, comment, changed_by, changed_by_name)
            VALUES ((SELECT task_id FROM {SCHEMA}.task_assignments WHERE id = %s), %s, %s, %s, %s, %s, %s, %s)""",
        (assignment_id, assignment_id, event_type, str(old_value or ""), str(new_value or ""), comment or "", by or "", by_name or "")
    )

def get_state(cur, assignment_id):
    cur.execute(f"SELECT due_date, status FROM {SCHEMA}.task_assignments WHERE id = %s", (assignment_id,))
    r = cur.fetchone()
    return (r[0].isoformat() if r and r[0] else "", r[1] if r else "")

def handler(event: dict, context) -> dict:
    """Действия над поручениями: отчёт, продление, принятие/отклонение, массовые действия."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    conn = get_conn()
    cur = conn.cursor()
    by = body.get("changed_by", "")
    by_name = body.get("changed_by_name", "")
    if body.get("assignment_id"):
        _, old_status = get_state(cur, body["assignment_id"])
        old_due = get_state(cur, body["assignment_id"])[0]
    else:
        old_status, old_due = "", ""

    if action == "submit_report":
        assignment_id = body["assignment_id"]
        report_text = body.get("report_text", "")
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET report_text = %s, report_submitted_at = NOW(),
                    status = 'pending_report', updated_at = NOW()
                WHERE id = %s RETURNING task_id, assignee_name""",
            (report_text, assignment_id)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT created_by, description FROM {SCHEMA}.tasks WHERE id = %s", (row[0],))
            task = cur.fetchone()
            if task:
                notify(cur, task[0], assignment_id, "report_submitted",
                       f"Поступил отчёт от {row[1]} по задаче: {task[1][:60]}")

    elif action == "accept_report":
        assignment_id = body["assignment_id"]
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'done', rejection_comment = NULL, updated_at = NOW()
                WHERE id = %s RETURNING assignee_login, task_id""",
            (assignment_id,)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT description FROM {SCHEMA}.tasks WHERE id = %s", (row[1],))
            task = cur.fetchone()
            if task:
                notify(cur, row[0], assignment_id, "report_accepted",
                       f"Ваш отчёт принят по задаче: {task[0][:60]}")

    elif action == "reject_report":
        assignment_id = body["assignment_id"]
        comment = body.get("comment", "")
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'revision', rejection_comment = %s, updated_at = NOW()
                WHERE id = %s RETURNING assignee_login, task_id""",
            (comment, assignment_id)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT description FROM {SCHEMA}.tasks WHERE id = %s", (row[1],))
            task = cur.fetchone()
            if task:
                notify(cur, row[0], assignment_id, "report_rejected",
                       f"Отчёт отклонён, требуется доработка: {task[0][:60]}")

    elif action == "request_extension":
        assignment_id = body["assignment_id"]
        new_date = body["new_date"]
        comment = body.get("comment", "")
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'extension_pending',
                    extension_requested_date = %s,
                    extension_comment = %s,
                    extension_resolved_at = NULL,
                    extension_resolution = NULL,
                    extension_reject_comment = NULL,
                    updated_at = NOW()
                WHERE id = %s RETURNING task_id, assignee_name""",
            (new_date, comment, assignment_id)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT created_by, description FROM {SCHEMA}.tasks WHERE id = %s", (row[0],))
            task = cur.fetchone()
            if task:
                notify(cur, task[0], assignment_id, "extension_requested",
                       f"Запрос продления срока от {row[1]} по задаче: {task[1][:60]}")

    elif action == "accept_extension":
        assignment_id = body["assignment_id"]
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'active',
                    due_date = extension_requested_date,
                    extension_resolved_at = NOW(),
                    extension_resolution = 'accepted',
                    updated_at = NOW()
                WHERE id = %s RETURNING assignee_login, extension_requested_date, task_id""",
            (assignment_id,)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT description FROM {SCHEMA}.tasks WHERE id = %s", (row[2],))
            task = cur.fetchone()
            if task:
                notify(cur, row[0], assignment_id, "extension_accepted",
                       f"Продление срока согласовано до {row[1]} по задаче: {task[0][:60]}")

    elif action == "reject_extension":
        assignment_id = body["assignment_id"]
        comment = body.get("comment", "")
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'active',
                    extension_resolved_at = NOW(),
                    extension_resolution = 'rejected',
                    extension_reject_comment = %s,
                    updated_at = NOW()
                WHERE id = %s RETURNING assignee_login, task_id""",
            (comment, assignment_id)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT description FROM {SCHEMA}.tasks WHERE id = %s", (row[1],))
            task = cur.fetchone()
            if task:
                notify(cur, row[0], assignment_id, "extension_rejected",
                       f"Продление срока отклонено по задаче: {task[0][:60]}")

    elif action == "bulk_close":
        # Один UPDATE + один SELECT для всех id вместо цикла
        ids = body.get("assignment_ids", [])
        if ids:
            cur.execute(
                f"""UPDATE {SCHEMA}.task_assignments
                    SET status = 'done', updated_at = NOW()
                    WHERE id = ANY(%s)
                    RETURNING id, assignee_login, task_id""",
                (ids,)
            )
            updated = cur.fetchall()
            for r in updated:
                log_history(cur, r[0], "status_changed", "", "done", "Массовое закрытие", by, by_name)
            if updated:
                task_ids = list({r[2] for r in updated})
                cur.execute(
                    f"SELECT id, description FROM {SCHEMA}.tasks WHERE id = ANY(%s)",
                    (task_ids,)
                )
                task_map = {r[0]: r[1] for r in cur.fetchall()}
                # Bulk INSERT уведомлений одним запросом
                notif_values = [
                    (r[1], r[0], "report_accepted",
                     f"Задача закрыта руководителем: {task_map.get(r[2], '')[:60]}")
                    for r in updated
                ]
                cur.executemany(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, assignment_id, event_type, message)
                        VALUES (%s, %s, %s, %s)""",
                    notif_values
                )

    elif action == "bulk_extend":
        # Один UPDATE + bulk INSERT уведомлений
        ids = body.get("assignment_ids", [])
        new_date = body["new_date"]
        if ids:
            cur.execute(f"SELECT id, due_date, status FROM {SCHEMA}.task_assignments WHERE id = ANY(%s)", (ids,))
            before = {r[0]: (r[1].isoformat() if r[1] else "", r[2]) for r in cur.fetchall()}
            is_future = date.fromisoformat(str(new_date)[:10]) >= date.today()
            cur.execute(
                f"""UPDATE {SCHEMA}.task_assignments
                    SET due_date = %s,
                        status = CASE WHEN status = 'overdue' AND %s THEN 'active' ELSE status END,
                        updated_at = NOW()
                    WHERE id = ANY(%s)
                    RETURNING id, assignee_login, task_id, status""",
                (new_date, is_future, ids)
            )
            updated = cur.fetchall()
            for r in updated:
                ob = before.get(r[0], ("", ""))
                log_history(cur, r[0], "due_date_changed", ob[0], str(new_date)[:10], "Массовый перенос срока", by, by_name)
                if ob[1] != r[3]:
                    log_history(cur, r[0], "status_changed", ob[1], r[3], "", by, by_name)
            if updated:
                task_ids = list({r[2] for r in updated})
                cur.execute(
                    f"SELECT id, description FROM {SCHEMA}.tasks WHERE id = ANY(%s)",
                    (task_ids,)
                )
                task_map = {r[0]: r[1] for r in cur.fetchall()}
                notif_values = [
                    (r[1], r[0], "due_date_changed",
                     f"Срок продлён до {new_date} по задаче: {task_map.get(r[2], '')[:60]}")
                    for r in updated
                ]
                cur.executemany(
                    f"""INSERT INTO {SCHEMA}.task_notifications
                        (user_login, assignment_id, event_type, message)
                        VALUES (%s, %s, %s, %s)""",
                    notif_values
                )

    elif action == "complete_self":
        # Самозадача: постановщик и исполнитель — один и тот же человек, поэтому задача
        # закрывается сразу в "Выполнено", минуя отчёт и согласование
        assignment_id = body["assignment_id"]
        cur.execute(
            f"""SELECT ta.assignee_login, t.created_by
                FROM {SCHEMA}.task_assignments ta
                JOIN {SCHEMA}.tasks t ON t.id = ta.task_id
                WHERE ta.id = %s""",
            (assignment_id,)
        )
        row = cur.fetchone()
        if not row or row[0] != row[1]:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "not a self-assigned task"})}
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET status = 'done', updated_at = NOW()
                WHERE id = %s""",
            (assignment_id,)
        )

    elif action == "reassign":
        assignment_id = body["assignment_id"]
        new_login = body["new_login"]
        new_name = body["new_name"]
        new_role = body["new_role"]
        cur.execute(
            f"""UPDATE {SCHEMA}.task_assignments
                SET assignee_login = %s, assignee_name = %s, assignee_role = %s, updated_at = NOW()
                WHERE id = %s RETURNING task_id""",
            (new_login, new_name, new_role, assignment_id)
        )
        row = cur.fetchone()
        if row:
            cur.execute(f"SELECT description FROM {SCHEMA}.tasks WHERE id = %s", (row[0],))
            task = cur.fetchone()
            if task:
                notify(cur, new_login, assignment_id, "new_task",
                       f"Вам переназначена задача: {task[0][:60]}")

    else:
        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    aid = body.get("assignment_id")
    if aid and action in ("submit_report", "accept_report", "reject_report", "request_extension",
                          "accept_extension", "reject_extension", "complete_self", "reassign"):
        new_due, new_status = get_state(cur, aid)
        if action == "submit_report":
            log_history(cur, aid, "report_submitted", "", "", body.get("report_text", ""), by, by_name)
        elif action == "accept_report":
            log_history(cur, aid, "report_accepted", "", "", "", by, by_name)
        elif action == "reject_report":
            log_history(cur, aid, "report_rejected", "", "", body.get("comment", ""), by, by_name)
        elif action == "request_extension":
            log_history(cur, aid, "extension_requested", old_due, body.get("new_date", ""), body.get("comment", ""), by, by_name)
        elif action == "accept_extension":
            log_history(cur, aid, "extension_accepted", old_due, new_due, "", by, by_name)
        elif action == "reject_extension":
            log_history(cur, aid, "extension_rejected", "", "", body.get("comment", ""), by, by_name)
        elif action == "complete_self":
            log_history(cur, aid, "completed_self", "", "", "", by, by_name)
        elif action == "reassign":
            log_history(cur, aid, "reassigned", "", body.get("new_name", ""), "", by, by_name)
        if old_status != new_status and action not in ("reassign",):
            log_history(cur, aid, "status_changed", old_status, new_status, "", by, by_name)

    conn.commit()
    conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}