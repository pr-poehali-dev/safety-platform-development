"""
CRUD для предписаний. GET — список, POST — создать, PUT — обновить, DELETE — удалить.
"""
import json
import os
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


def row_to_prescription(row, remarks):
    return {
        "id": row[0],
        "number": row[1],
        "date": row[2],
        "object": row[3],
        "contractor": row[4],
        "inspector": row[5],
        "representative": row[6],
        "responsible": row[7],
        "replyEmail": row[8],
        "reportDeadline": row[9],
        "comments": row[10] if row[10] else [],
        "remarks": remarks,
    }


def fetch_remarks(cur, prescription_id):
    cur.execute(
        f"SELECT id, place, description, norm_ref, deadline, status FROM {SCHEMA}.remarks "
        f"WHERE prescription_id = '{prescription_id}' ORDER BY sort_order, id"
    )
    return [
        {"id": r[0], "place": r[1], "description": r[2], "normRef": r[3], "deadline": r[4], "status": r[5]}
        for r in cur.fetchall()
    ]


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET — получить все предписания
        if method == "GET":
            cur.execute(
                f"SELECT id, number, date, object, contractor, inspector, representative, responsible, reply_email, report_deadline, comments "
                f"FROM {SCHEMA}.prescriptions ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            result = []
            for row in rows:
                remarks = fetch_remarks(cur, row[0])
                result.append(row_to_prescription(row, remarks))
            return ok(result)

        # POST — создать предписание
        if method == "POST":
            p = body
            pid = p["id"]
            cur.execute(
                f"INSERT INTO {SCHEMA}.prescriptions (id, number, date, object, contractor, inspector, representative, responsible, reply_email, report_deadline, comments) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (pid, p["number"], p["date"], p["object"], p["contractor"],
                 p.get("inspector",""), p.get("representative",""), p.get("responsible",""),
                 p.get("replyEmail",""), p.get("reportDeadline",""), json.dumps(p.get("comments",[]), ensure_ascii=False))
            )
            for i, r in enumerate(p.get("remarks", [])):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, description, norm_ref, deadline, status, sort_order) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (r["id"], pid, r.get("place",""), r["description"], r.get("normRef",""), r.get("deadline",""), r.get("status","Выдано"), i)
                )
            conn.commit()
            return ok({"ok": True})

        # PUT — обновить предписание
        if method == "PUT":
            p = body
            pid = p["id"]
            cur.execute(
                f"UPDATE {SCHEMA}.prescriptions SET number=%s, date=%s, object=%s, contractor=%s, inspector=%s, "
                f"representative=%s, responsible=%s, reply_email=%s, report_deadline=%s, comments=%s WHERE id=%s",
                (p["number"], p["date"], p["object"], p["contractor"],
                 p.get("inspector",""), p.get("representative",""), p.get("responsible",""),
                 p.get("replyEmail",""), p.get("reportDeadline",""),
                 json.dumps(p.get("comments",[]), ensure_ascii=False), pid)
            )
            cur.execute(f"DELETE FROM {SCHEMA}.remarks WHERE prescription_id = %s", (pid,))
            for i, r in enumerate(p.get("remarks", [])):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, description, norm_ref, deadline, status, sort_order) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (r["id"], pid, r.get("place",""), r["description"], r.get("normRef",""), r.get("deadline",""), r.get("status","Выдано"), i)
                )
            conn.commit()
            return ok({"ok": True})

        # DELETE — удалить предписание
        if method == "DELETE":
            pid = body.get("id") or (event.get("queryStringParameters") or {}).get("id")
            if not pid:
                return err("id required")
            cur.execute(f"DELETE FROM {SCHEMA}.remarks WHERE prescription_id = %s", (pid,))
            cur.execute(f"DELETE FROM {SCHEMA}.prescriptions WHERE id = %s", (pid,))
            conn.commit()
            return ok({"ok": True})

        return err("Method not allowed", 405)

    finally:
        cur.close()
        conn.close()
