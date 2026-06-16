"""
CRUD для предписаний и шаблонов.
/          — предписания (GET, POST, PUT, DELETE)
/templates — шаблоны    (GET, POST, PUT, DELETE)
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
        "id": row[0], "number": row[1], "date": row[2], "object": row[3],
        "contractor": row[4], "inspector": row[5], "representative": row[6],
        "responsible": row[7], "replyEmail": row[8], "reportDeadline": row[9],
        "comments": row[10] if row[10] else [], "remarks": remarks,
    }


def fetch_remarks(cur, prescription_id):
    cur.execute(
        f"SELECT id, place, description, norm_ref, deadline, status FROM {SCHEMA}.remarks "
        f"WHERE prescription_id = '{prescription_id}' ORDER BY sort_order, id"
    )
    return [{"id": r[0], "place": r[1], "description": r[2], "normRef": r[3], "deadline": r[4], "status": r[5]} for r in cur.fetchall()]


def row_to_template(row):
    cols = row[5]
    if isinstance(cols, str):
        cols = json.loads(cols)
    return {
        "id": row[0], "name": row[1], "title": row[2], "subtitle": row[3],
        "companyName": row[4], "tableColumns": cols,
        "blockObjectLabel": row[6], "blockContractorLabel": row[7],
        "blockInspectorLabel": row[8], "blockRepresentativeLabel": row[9],
        "blockViolationsTitle": row[10], "blockCopiesText": row[11],
        "blockReportText": row[12], "fontSize": row[13], "fontFamily": row[14],
        "marginTop": row[15], "marginRight": row[16], "marginBottom": row[17], "marginLeft": row[18],
        "sigIssuerLabel": row[19], "sigReceiverLabel": row[20], "isDefault": row[21],
    }


TEMPLATE_FIELDS = (
    "id, name, title, subtitle, company_name, table_columns, block_object_label, block_contractor_label, "
    "block_inspector_label, block_representative_label, block_violations_title, block_copies_text, "
    "block_report_text, font_size, font_family, margin_top, margin_right, margin_bottom, margin_left, "
    "sig_issuer_label, sig_receiver_label, is_default"
)


def handle_templates(method, body, cur, conn):
    if method == "GET":
        cur.execute(f"SELECT {TEMPLATE_FIELDS} FROM {SCHEMA}.templates ORDER BY is_default DESC, created_at ASC")
        return ok([row_to_template(r) for r in cur.fetchall()])

    if method == "POST":
        import time
        t = body
        tid = t.get("id", str(int(time.time() * 1000)))
        cur.execute(
            f"INSERT INTO {SCHEMA}.templates (id, name, title, subtitle, company_name, table_columns, "
            f"block_object_label, block_contractor_label, block_inspector_label, block_representative_label, "
            f"block_violations_title, block_copies_text, block_report_text, font_size, font_family, "
            f"margin_top, margin_right, margin_bottom, margin_left, sig_issuer_label, sig_receiver_label, is_default) "
            f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (tid, t["name"],
             t.get("title", "АКТ-ПРЕДПИСАНИЕ № {{number}}"),
             t.get("subtitle", "о нарушении требований охраны труда, пожарной, промышленной безопасности и экологии"),
             t.get("companyName", "СБД"),
             json.dumps(t.get("tableColumns", []), ensure_ascii=False),
             t.get("blockObjectLabel", "Проверяемый объект:"),
             t.get("blockContractorLabel", "Работы проводит подрядная организация:"),
             t.get("blockInspectorLabel", "Проверка проведена"),
             t.get("blockRepresentativeLabel", "в присутствии представителя подрядной организации"),
             t.get("blockViolationsTitle", "В ходе проверки выявлены следующие нарушения:"),
             t.get("blockCopiesText", ""),
             t.get("blockReportText", ""),
             t.get("fontSize", 11), t.get("fontFamily", "Times New Roman"),
             t.get("marginTop", 15), t.get("marginRight", 15),
             t.get("marginBottom", 15), t.get("marginLeft", 20),
             t.get("sigIssuerLabel", "Выдал:"),
             t.get("sigReceiverLabel", "С Актом ознакомлен, согласен и принял к исполнению:"),
             t.get("isDefault", False))
        )
        conn.commit()
        return ok({"ok": True, "id": tid})

    if method == "PUT":
        t = body
        tid = t["id"]
        cur.execute(
            f"UPDATE {SCHEMA}.templates SET name=%s, title=%s, subtitle=%s, company_name=%s, table_columns=%s, "
            f"block_object_label=%s, block_contractor_label=%s, block_inspector_label=%s, block_representative_label=%s, "
            f"block_violations_title=%s, block_copies_text=%s, block_report_text=%s, font_size=%s, font_family=%s, "
            f"margin_top=%s, margin_right=%s, margin_bottom=%s, margin_left=%s, "
            f"sig_issuer_label=%s, sig_receiver_label=%s, is_default=%s, updated_at=now() WHERE id=%s",
            (t["name"], t.get("title"), t.get("subtitle"), t.get("companyName"),
             json.dumps(t.get("tableColumns", []), ensure_ascii=False),
             t.get("blockObjectLabel"), t.get("blockContractorLabel"), t.get("blockInspectorLabel"),
             t.get("blockRepresentativeLabel"), t.get("blockViolationsTitle"),
             t.get("blockCopiesText"), t.get("blockReportText"),
             t.get("fontSize"), t.get("fontFamily"),
             t.get("marginTop"), t.get("marginRight"), t.get("marginBottom"), t.get("marginLeft"),
             t.get("sigIssuerLabel"), t.get("sigReceiverLabel"),
             t.get("isDefault", False), tid)
        )
        conn.commit()
        return ok({"ok": True})

    if method == "DELETE":
        tid = body.get("id")
        if not tid:
            return err("id required")
        cur.execute(f"SELECT is_default FROM {SCHEMA}.templates WHERE id = %s", (tid,))
        row = cur.fetchone()
        if not row:
            return err("not found", 404)
        if row[0]:
            return err("Нельзя удалить шаблон по умолчанию")
        cur.execute(f"DELETE FROM {SCHEMA}.templates WHERE id = %s", (tid,))
        conn.commit()
        return ok({"ok": True})

    return err("Method not allowed", 405)


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Роутинг по path
        if path.rstrip("/").endswith("/templates"):
            return handle_templates(method, body, cur, conn)

        # --- ПРЕДПИСАНИЯ ---
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

        if method == "POST":
            from datetime import datetime
            p = body
            pid = p["id"]
            year = datetime.now().year
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.prescriptions WHERE date_part('year', created_at) = %s", (year,))
            count = cur.fetchone()[0]
            number = f"МАН-{year}-{str(count + 1).zfill(2)}"
            cur.execute(
                f"INSERT INTO {SCHEMA}.prescriptions (id, number, date, object, contractor, inspector, representative, responsible, reply_email, report_deadline, comments) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (pid, number, p["date"], p["object"], p["contractor"],
                 p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                 p.get("replyEmail", ""), p.get("reportDeadline", ""),
                 json.dumps(p.get("comments", []), ensure_ascii=False))
            )
            for i, r in enumerate(p.get("remarks", [])):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, description, norm_ref, deadline, status, sort_order) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (r["id"], pid, r.get("place", ""), r["description"], r.get("normRef", ""), r.get("deadline", ""), r.get("status", "Выдано"), i)
                )
            conn.commit()
            return ok({"ok": True, "number": number})

        if method == "PUT":
            p = body
            pid = p["id"]
            cur.execute(
                f"UPDATE {SCHEMA}.prescriptions SET number=%s, date=%s, object=%s, contractor=%s, inspector=%s, "
                f"representative=%s, responsible=%s, reply_email=%s, report_deadline=%s, comments=%s WHERE id=%s",
                (p["number"], p["date"], p["object"], p["contractor"],
                 p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                 p.get("replyEmail", ""), p.get("reportDeadline", ""),
                 json.dumps(p.get("comments", []), ensure_ascii=False), pid)
            )
            cur.execute(f"DELETE FROM {SCHEMA}.remarks WHERE prescription_id = %s", (pid,))
            for i, r in enumerate(p.get("remarks", [])):
                cur.execute(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, description, norm_ref, deadline, status, sort_order) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (r["id"], pid, r.get("place", ""), r["description"], r.get("normRef", ""), r.get("deadline", ""), r.get("status", "Выдано"), i)
                )
            conn.commit()
            return ok({"ok": True})

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
