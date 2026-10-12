import json
import os
import datetime
import decimal
import boto3
import psycopg2
from psycopg2.extras import Json, execute_values

SCHEMA = "t_p5901577_safety_platform_deve"
MAX_BACKUPS = 30

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}

SECTIONS = {
    "prescriptions": ["prescriptions", "remarks", "remark_history"],
    "inspections": ["inspections"],
    "headcount": ["headcount_entries"],
    "fines": ["fines"],
    "suspensions": ["suspensions"],
    "incidents": ["incidents"],
}


def resp(code, body):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(body, ensure_ascii=False, default=str)}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def jsonable(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()
    if isinstance(v, decimal.Decimal):
        return float(v)
    return v


def dump_table(cur, table):
    cur.execute(f"SELECT * FROM {SCHEMA}.{table} ORDER BY 1")
    cols = [d[0] for d in cur.description]
    return [{c: jsonable(v) for c, v in zip(cols, row)} for row in cur.fetchall()]


def table_columns(cur, table):
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=%s AND table_name=%s",
        (SCHEMA, table),
    )
    return {r[0] for r in cur.fetchall()}


def restore_table(cur, table, rows):
    if not rows:
        return 0
    allowed = table_columns(cur, table)
    cols = [c for c in rows[0].keys() if c in allowed]
    if not cols:
        return 0
    values = [
        tuple(Json(r.get(c)) if isinstance(r.get(c), (dict, list)) else r.get(c) for c in cols)
        for r in rows
    ]
    col_sql = ", ".join(cols)
    before = count_rows(cur, table)
    execute_values(
        cur,
        f"INSERT INTO {SCHEMA}.{table} ({col_sql}) VALUES %s ON CONFLICT DO NOTHING",
        values,
    )
    return count_rows(cur, table) - before


def count_rows(cur, table):
    cur.execute(f"SELECT count(*) FROM {SCHEMA}.{table}")
    return cur.fetchone()[0]


def get_admin(cur, event):
    uid = (event.get("headers") or {}).get("X-User-Id") or (event.get("headers") or {}).get("x-user-id")
    if not uid:
        return None
    cur.execute(f"SELECT id, login, name, role FROM {SCHEMA}.users WHERE id=%s", (str(uid),))
    row = cur.fetchone()
    if not row or row[3] != "admin":
        return None
    return {"id": row[0], "login": row[1], "name": row[2]}


def list_backups(cur):
    cur.execute(
        f"""SELECT id, created_at, created_by_name, sections, counts, size_bytes
            FROM {SCHEMA}.backups ORDER BY created_at DESC, id DESC"""
    )
    return [
        {
            "id": r[0],
            "created_at": r[1].isoformat(),
            "created_by_name": r[2],
            "sections": r[3],
            "counts": r[4],
            "size_bytes": r[5],
        }
        for r in cur.fetchall()
    ]


def create_backup(cur, conn, admin, sections):
    data = {}
    counts = {}
    for sec in sections:
        data[sec] = {}
        total = 0
        for table in SECTIONS[sec]:
            rows = dump_table(cur, table)
            data[sec][table] = rows
            if table == SECTIONS[sec][0]:
                total = len(rows)
        counts[sec] = total
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = json.dumps(
        {"version": 1, "created_at": now.isoformat(), "created_by": admin["name"], "sections": sections, "data": data},
        ensure_ascii=False,
    ).encode("utf-8")
    key = f"backups/backup_{now.strftime('%Y%m%d_%H%M%S')}.json"
    get_s3().put_object(Bucket="files", Key=key, Body=payload, ContentType="application/json")
    cur.execute(
        f"""INSERT INTO {SCHEMA}.backups (created_by, created_by_name, sections, counts, size_bytes, s3_key)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (admin["login"], admin["name"], sections, Json(counts), len(payload), key),
    )
    new_id = cur.fetchone()[0]
    cur.execute(f"SELECT id, s3_key FROM {SCHEMA}.backups ORDER BY created_at DESC, id DESC OFFSET {MAX_BACKUPS}")
    old = cur.fetchall()
    s3 = get_s3()
    for oid, okey in old:
        s3.delete_object(Bucket="files", Key=okey)
        cur.execute(f"DELETE FROM {SCHEMA}.backups WHERE id=%s", (oid,))
    conn.commit()
    return new_id


def load_backup(cur, backup_id):
    cur.execute(f"SELECT s3_key FROM {SCHEMA}.backups WHERE id=%s", (backup_id,))
    row = cur.fetchone()
    if not row:
        return None
    obj = get_s3().get_object(Bucket="files", Key=row[0])
    return json.loads(obj["Body"].read().decode("utf-8"))


def handler(event: dict, context) -> dict:
    """Бэкапы разделов (предписания, проверки, человекочасы, штрафы, приостановки, происшествия): создание, список, скачивание, восстановление недостающих записей, удаление. Только для администратора."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()
    admin = get_admin(cur, event)
    if not admin:
        return resp(403, {"error": "forbidden"})

    if method == "GET":
        if params.get("id"):
            data = load_backup(cur, int(params["id"]))
            if data is None:
                return resp(404, {"error": "not found"})
            return resp(200, data)
        return resp(200, {"backups": list_backups(cur)})

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action", "create")

        if action == "create":
            sections = [s for s in (body.get("sections") or list(SECTIONS)) if s in SECTIONS]
            if not sections:
                return resp(400, {"error": "sections required"})
            new_id = create_backup(cur, conn, admin, sections)
            return resp(200, {"id": new_id, "backups": list_backups(cur)})

        if action == "restore_rows":
            table = body.get("table")
            allowed_tables = [t for tables in SECTIONS.values() for t in tables]
            if table not in allowed_tables:
                return resp(400, {"error": "unknown table"})
            rows = body.get("rows") or []
            if not isinstance(rows, list) or not all(isinstance(r, dict) for r in rows):
                return resp(400, {"error": "bad rows"})
            added = restore_table(cur, table, rows)
            conn.commit()
            return resp(200, {"added": added})

        if action == "restore":
            data = load_backup(cur, int(body.get("id") or 0))
            if data is None:
                return resp(404, {"error": "not found"})
            wanted = [s for s in (body.get("sections") or data["sections"]) if s in data["sections"] and s in SECTIONS]
            added = {}
            for sec in wanted:
                added[sec] = 0
                for table in SECTIONS[sec]:
                    n = restore_table(cur, table, data["data"][sec].get(table, []))
                    if table == SECTIONS[sec][0]:
                        added[sec] = n
            conn.commit()
            return resp(200, {"added": added})

    if method == "DELETE":
        bid = int(params.get("id") or 0)
        cur.execute(f"SELECT s3_key FROM {SCHEMA}.backups WHERE id=%s", (bid,))
        row = cur.fetchone()
        if not row:
            return resp(404, {"error": "not found"})
        get_s3().delete_object(Bucket="files", Key=row[0])
        cur.execute(f"DELETE FROM {SCHEMA}.backups WHERE id=%s", (bid,))
        conn.commit()
        return resp(200, {"ok": True})

    return resp(400, {"error": "bad request"})
