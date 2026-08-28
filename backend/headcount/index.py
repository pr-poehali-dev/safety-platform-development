import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def row_to_entry(r):
    return {
        "date": r[0].isoformat() if hasattr(r[0], "isoformat") else r[0],
        "po": r[1],
        "sbd": r[2],
    }


def handler(event: dict, context) -> dict:
    """Учёт ежедневной численности персонала (ПО и СБД) для расчёта человеко-часов.
    GET ?year=2026 — список записей за год (date, po, sbd)
    POST — создать/обновить запись на дату (upsert): entry_date, po_count, sbd_count, updated_by
    """
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        qs = event.get("queryStringParameters") or {}
        year = qs.get("year")
        conn = get_conn()
        cur = conn.cursor()
        if year:
            cur.execute(
                f"SELECT entry_date, po_count, sbd_count FROM {SCHEMA}.headcount_entries "
                f"WHERE EXTRACT(YEAR FROM entry_date) = %s ORDER BY entry_date",
                (year,),
            )
        else:
            cur.execute(
                f"SELECT entry_date, po_count, sbd_count FROM {SCHEMA}.headcount_entries ORDER BY entry_date"
            )
        rows = cur.fetchall()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps([row_to_entry(r) for r in rows], ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        entry_date = body.get("entry_date")
        po_count = body.get("po_count")
        sbd_count = body.get("sbd_count")
        updated_by = body.get("updated_by")
        if not entry_date:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "entry_date required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.headcount_entries (entry_date, po_count, sbd_count, updated_by)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (entry_date) DO UPDATE SET
                    po_count = EXCLUDED.po_count,
                    sbd_count = EXCLUDED.sbd_count,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
                RETURNING entry_date, po_count, sbd_count""",
            (entry_date, po_count, sbd_count, updated_by),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps(row_to_entry(row), ensure_ascii=False)}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}
