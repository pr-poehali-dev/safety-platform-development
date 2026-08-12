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
    """Уведомления о новых комментариях к предписаниям."""
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
        cur.execute(
            f"""SELECT id, prescription_id, event_type, message, is_read, created_at
                FROM {SCHEMA}.prescription_notifications
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
                "prescription_id": r[1],
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
                    f"UPDATE {SCHEMA}.prescription_notifications SET is_read = TRUE WHERE id = %s AND user_login = %s",
                    (notification_id, login)
                )
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.prescription_notifications SET is_read = TRUE WHERE user_login = %s",
                    (login,)
                )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
