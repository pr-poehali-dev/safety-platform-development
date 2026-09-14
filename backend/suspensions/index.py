"""
CRUD для реестра актов о приостановке работ.
GET — список, POST — создать (с генерацией номера), PUT — обновить, DELETE — удалить.
"""
import json
import os
import datetime
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def row_to_suspension(row):
    return {
        "id": row[0],
        "number": row[1],
        "issuedAt": row[2].isoformat() if row[2] else None,
        "object": row[3],
        "place": row[4],
        "contractor": row[5],
        "issuedBy": row[6],
        "reason": row[7],
        "status": row[8],
        "createdBy": row[9],
    }


def handle_numbering(method, body, cur, conn):
    if method == "GET":
        cur.execute(
            f"SELECT id, prefix, start_number, next_number, auto_reset_yearly, last_year "
            f"FROM {SCHEMA}.suspension_numbering ORDER BY id LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            return ok({"prefix": "", "start_number": 1, "next_number": 1, "auto_reset_yearly": False})
        return ok({
            "id": row[0], "prefix": row[1], "start_number": row[2],
            "next_number": row[3], "auto_reset_yearly": row[4], "last_year": row[5],
        })

    if method == "PUT":
        s = body
        prefix = (s.get("prefix") or "").strip()
        start_number = int(s.get("start_number", 1))
        auto_reset_yearly = bool(s.get("auto_reset_yearly", False))
        cur.execute(f"SELECT id FROM {SCHEMA}.suspension_numbering ORDER BY id LIMIT 1")
        row = cur.fetchone()
        if row:
            cur.execute(
                f"UPDATE {SCHEMA}.suspension_numbering "
                f"SET prefix=%s, start_number=%s, next_number=%s, auto_reset_yearly=%s WHERE id=%s",
                (prefix, start_number, start_number, auto_reset_yearly, row[0])
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.suspension_numbering (prefix, start_number, next_number, auto_reset_yearly) "
                f"VALUES (%s,%s,%s,%s)",
                (prefix, start_number, start_number, auto_reset_yearly)
            )
        conn.commit()
        return ok({"ok": True})

    return err("Method not allowed", 405)


def next_suspension_number(cur):
    cur.execute(
        f"SELECT id, prefix, start_number, next_number, auto_reset_yearly, last_year "
        f"FROM {SCHEMA}.suspension_numbering ORDER BY id LIMIT 1 FOR UPDATE"
    )
    row = cur.fetchone()
    current_year = datetime.datetime.now().year

    if not row:
        cur.execute(
            f"INSERT INTO {SCHEMA}.suspension_numbering (prefix, start_number, next_number, auto_reset_yearly, last_year) "
            f"VALUES ('', 1, 2, FALSE, %s)",
            (current_year,)
        )
        return "1"

    nid, prefix, start_number, next_number, auto_reset_yearly, last_year = row

    if auto_reset_yearly and last_year is not None and last_year != current_year:
        next_number = start_number

    number_value = next_number
    upcoming_next = next_number + 1

    cur.execute(
        f"UPDATE {SCHEMA}.suspension_numbering SET next_number=%s, last_year=%s WHERE id=%s",
        (upcoming_next, current_year, nid)
    )

    return f"{prefix}{number_value}" if prefix else str(number_value)


def handler(event: dict, context) -> dict:
    """CRUD для актов о приостановке работ подрядчика на объекте."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        qs = event.get("queryStringParameters") or {}
        if qs.get("type") == "numbering" or body.get("_type") == "numbering":
            return handle_numbering(method, body, cur, conn)

        if method == "GET":
            cur.execute(
                f"""SELECT id, number, issued_at, object, place, contractor, issued_by, reason, status, created_by
                    FROM {SCHEMA}.suspensions ORDER BY issued_at DESC"""
            )
            return ok([row_to_suspension(r) for r in cur.fetchall()])

        if method == "POST":
            s = body
            sid = s["id"]
            number = next_suspension_number(cur)
            cur.execute(
                f"""INSERT INTO {SCHEMA}.suspensions
                    (id, number, issued_at, object, place, contractor, issued_by, reason, status, created_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (sid, number, s.get("issuedAt"), s["object"], s.get("place", ""),
                 s["contractor"], s.get("issuedBy", ""), s.get("reason", ""),
                 s.get("status", "Приостановлено"), s.get("createdBy", ""))
            )
            conn.commit()
            return ok({"ok": True, "number": number})

        if method == "PUT":
            s = body
            sid = s["id"]
            cur.execute(
                f"""UPDATE {SCHEMA}.suspensions SET
                    object=%s, place=%s, contractor=%s, issued_by=%s, reason=%s, status=%s, updated_at=now()
                    WHERE id=%s""",
                (s["object"], s.get("place", ""), s["contractor"], s.get("issuedBy", ""),
                 s.get("reason", ""), s.get("status", "Приостановлено"), sid)
            )
            conn.commit()
            return ok({"ok": True})

        if method == "DELETE":
            sid = body.get("id") or (event.get("queryStringParameters") or {}).get("id")
            if not sid:
                return err("id required")
            cur.execute(f"DELETE FROM {SCHEMA}.suspensions WHERE id = %s", (sid,))
            conn.commit()
            return ok({"ok": True})

        return err("Method not allowed", 405)
    finally:
        cur.close()
        conn.close()