import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для журнала проверок."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET — список проверок с фильтрами
    if method == "GET":
        params = event.get("queryStringParameters") or {}
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        contractor_list = [v for v in (params.get("contractor") or "").split("|") if v]
        object_list = [v for v in (params.get("object_name") or "").split("|") if v]
        inspector_list = [v for v in (params.get("inspector_name") or "").split("|") if v]
        violation_list = [v for v in (params.get("violation_type") or "").split("|") if v]

        where = []
        args = []

        if date_from:
            where.append("inspection_date >= %s")
            args.append(date_from)
        if date_to:
            where.append("inspection_date <= %s")
            args.append(date_to)
        if contractor_list:
            where.append("contractor = ANY(%s)")
            args.append(contractor_list)
        if object_list:
            where.append("object_name = ANY(%s)")
            args.append(object_list)
        if inspector_list:
            where.append("inspector_name = ANY(%s)")
            args.append(inspector_list)
        if violation_list:
            where.append("violation_type = ANY(%s)")
            args.append(violation_list)

        where_sql = ("WHERE " + " AND ".join(where)) if where else ""

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, inspection_date, contractor, violation_type, object_name,
                       remarks_count, works_suspended, inspector_name, note, created_by, created_at, photos
                FROM {SCHEMA}.inspections {where_sql}
                ORDER BY inspection_date DESC, created_at DESC""",
            args
        )
        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            photos = r[11] if r[11] else []
            if isinstance(photos, str):
                photos = json.loads(photos)
            result.append({
                "id": r[0],
                "inspection_date": r[1].isoformat() if r[1] else None,
                "contractor": r[2],
                "violation_type": r[3],
                "object_name": r[4],
                "remarks_count": r[5],
                "works_suspended": r[6],
                "inspector_name": r[7],
                "note": r[8],
                "created_by": r[9],
                "created_at": r[10].isoformat() if r[10] else None,
                "photos": photos,
            })
        return {"statusCode": 200, "headers": cors, "body": json.dumps(result, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    # POST — добавить запись
    if method == "POST":
        required = ["inspection_date", "contractor", "violation_type", "object_name", "inspector_name", "created_by"]
        for field in required:
            if not body.get(field):
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": f"{field} required"})}

        remarks_count = max(1, min(15, int(body.get("remarks_count", 1))))
        photos = body.get("photos", [])[:5]

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.inspections
                (inspection_date, contractor, violation_type, object_name, remarks_count, works_suspended, inspector_name, note, created_by, photos)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at""",
            (
                body["inspection_date"],
                body["contractor"],
                body["violation_type"],
                body["object_name"],
                remarks_count,
                bool(body.get("works_suspended", False)),
                body["inspector_name"],
                body.get("note") or None,
                body["created_by"],
                json.dumps(photos, ensure_ascii=False),
            )
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": row[0]}, ensure_ascii=False)}

    # PUT — обновить запись
    if method == "PUT":
        rec_id = body.get("id")
        if not rec_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        remarks_count = max(1, min(15, int(body.get("remarks_count", 1))))
        photos = body.get("photos", [])[:5]

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.inspections
                SET inspection_date=%s, contractor=%s, violation_type=%s, object_name=%s,
                    remarks_count=%s, works_suspended=%s, inspector_name=%s, note=%s, photos=%s
                WHERE id=%s""",
            (
                body["inspection_date"],
                body["contractor"],
                body["violation_type"],
                body["object_name"],
                remarks_count,
                bool(body.get("works_suspended", False)),
                body["inspector_name"],
                body.get("note") or None,
                json.dumps(photos, ensure_ascii=False),
                rec_id,
            )
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # DELETE — удалить запись
    if method == "DELETE":
        rec_id = body.get("id")
        if not rec_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.inspections WHERE id = %s", (rec_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}