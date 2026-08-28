import json
import os

import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Настройки расчёта человекочасов: название организации ПО и почасовые коэффициенты ПО/СБД."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
        "Content-Type": "application/json",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT po_label, po_rate, sbd_rate FROM {SCHEMA}.headcount_settings WHERE id = 1")
        row = cur.fetchone()
        conn.close()
        data = {
            "po_label": row[0] if row else "ПО",
            "po_rate": row[1] if row else 10,
            "sbd_rate": row[2] if row else 8,
        }
        return {"statusCode": 200, "headers": cors, "body": json.dumps(data)}

    if method == "PUT":
        body = json.loads(event.get("body") or "{}")
        po_label = (body.get("po_label") or "ПО").strip() or "ПО"
        po_rate = int(body.get("po_rate") or 10)
        sbd_rate = int(body.get("sbd_rate") or 8)
        po_rate = max(1, min(12, po_rate))
        sbd_rate = max(1, min(12, sbd_rate))
        updated_by = body.get("updated_by")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""UPDATE {SCHEMA}.headcount_settings
                SET po_label = %s, po_rate = %s, sbd_rate = %s, updated_by = %s, updated_at = now()
                WHERE id = 1""",
            (po_label, po_rate, sbd_rate, updated_by),
        )
        conn.commit()
        conn.close()
        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"po_label": po_label, "po_rate": po_rate, "sbd_rate": sbd_rate}),
        }

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}