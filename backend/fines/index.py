import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def row_to_fine(r):
    return {
        "id": r[0],
        "period_date": r[1].isoformat() if r[1] else None,
        "contractor": r[2],
        "contract_number": r[3],
        "act_number": r[4],
        "amount_issued": float(r[5]) if r[5] is not None else 0,
        "amount_paid": float(r[6]) if r[6] is not None else None,
        "amount_proactive": float(r[7]) if r[7] is not None else None,
        "status": r[8],
        "created_by_name": r[9],
        "created_at": r[10].isoformat() if r[10] else None,
    }


def handler(event: dict, context) -> dict:
    """CRUD для журнала штрафов подрядчиков (выставлено/оплачено/проактив, статус)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, period_date, contractor, contract_number, act_number,
                       amount_issued, amount_paid, amount_proactive, status,
                       created_by_name, created_at
                FROM {SCHEMA}.fines
                ORDER BY period_date DESC, id DESC"""
        )
        rows = cur.fetchall()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([row_to_fine(r) for r in rows], ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    if method == "POST":
        if not body.get("period_date") or not body.get("contractor"):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "period_date and contractor required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.fines
                (period_date, contractor, contract_number, act_number, amount_issued, amount_paid, amount_proactive, status, created_by_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id""",
            (
                body["period_date"],
                body["contractor"],
                body.get("contract_number") or None,
                body.get("act_number") or None,
                float(body.get("amount_issued") or 0),
                body.get("amount_paid"),
                body.get("amount_proactive"),
                body.get("status") or None,
                body.get("created_by_name") or None,
            )
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0]}, ensure_ascii=False)}

    if method == "PUT":
        rec_id = body.get("id")
        if not rec_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.fines
                SET period_date=%s, contractor=%s, contract_number=%s, act_number=%s,
                    amount_issued=%s, amount_paid=%s, amount_proactive=%s, status=%s, updated_at=now()
                WHERE id=%s""",
            (
                body["period_date"],
                body["contractor"],
                body.get("contract_number") or None,
                body.get("act_number") or None,
                float(body.get("amount_issued") or 0),
                body.get("amount_paid"),
                body.get("amount_proactive"),
                body.get("status") or None,
                rec_id,
            )
        )
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    if method == "DELETE":
        rec_id = body.get("id")
        if not rec_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.fines WHERE id = %s", (rec_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
