"""
CRUD для шаблонов актов-предписаний. GET — список, POST — создать, PUT — обновить, DELETE — удалить.
v3 — добавлены поля content, paper_size, orientation
"""
import json
import os
import time
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
}

FIELDS = (
    "id, name, title, subtitle, company_name, table_columns, "
    "block_object_label, block_contractor_label, block_inspector_label, "
    "block_representative_label, block_violations_title, block_copies_text, "
    "block_report_text, font_size, font_family, margin_top, margin_right, "
    "margin_bottom, margin_left, sig_issuer_label, sig_receiver_label, "
    "is_default, paper_size, orientation, content"
)


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}


def row_to_template(row):
    return {
        "id": row[0],
        "name": row[1],
        "title": row[2],
        "subtitle": row[3],
        "companyName": row[4],
        "tableColumns": row[5] if isinstance(row[5], list) else json.loads(row[5]),
        "blockObjectLabel": row[6],
        "blockContractorLabel": row[7],
        "blockInspectorLabel": row[8],
        "blockRepresentativeLabel": row[9],
        "blockViolationsTitle": row[10],
        "blockCopiesText": row[11],
        "blockReportText": row[12],
        "fontSize": row[13],
        "fontFamily": row[14],
        "marginTop": row[15],
        "marginRight": row[16],
        "marginBottom": row[17],
        "marginLeft": row[18],
        "sigIssuerLabel": row[19],
        "sigReceiverLabel": row[20],
        "isDefault": row[21],
        "paperSize": row[22],
        "orientation": row[23],
        "content": row[24],
    }


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
        if method == "GET":
            cur.execute(f"SELECT {FIELDS} FROM {SCHEMA}.templates ORDER BY is_default DESC, created_at ASC")
            return ok([row_to_template(r) for r in cur.fetchall()])

        if method == "POST":
            t = body
            tid = t.get("id", str(time.time_ns()))
            cur.execute(
                f"INSERT INTO {SCHEMA}.templates "
                f"(id, name, title, subtitle, company_name, table_columns, "
                f"block_object_label, block_contractor_label, block_inspector_label, "
                f"block_representative_label, block_violations_title, block_copies_text, "
                f"block_report_text, font_size, font_family, margin_top, margin_right, "
                f"margin_bottom, margin_left, sig_issuer_label, sig_receiver_label, "
                f"is_default, paper_size, orientation, content) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
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
                 t.get("isDefault", False),
                 t.get("paperSize", "A4"),
                 t.get("orientation", "portrait"),
                 t.get("content"))
            )
            conn.commit()
            return ok({"ok": True, "id": tid})

        if method == "PUT":
            t = body
            tid = t["id"]
            cur.execute(
                f"UPDATE {SCHEMA}.templates SET "
                f"name=%s, title=%s, subtitle=%s, company_name=%s, table_columns=%s, "
                f"block_object_label=%s, block_contractor_label=%s, block_inspector_label=%s, "
                f"block_representative_label=%s, block_violations_title=%s, block_copies_text=%s, "
                f"block_report_text=%s, font_size=%s, font_family=%s, "
                f"margin_top=%s, margin_right=%s, margin_bottom=%s, margin_left=%s, "
                f"sig_issuer_label=%s, sig_receiver_label=%s, is_default=%s, "
                f"paper_size=%s, orientation=%s, content=%s, updated_at=now() "
                f"WHERE id=%s",
                (t["name"], t.get("title"), t.get("subtitle"), t.get("companyName"),
                 json.dumps(t.get("tableColumns", []), ensure_ascii=False),
                 t.get("blockObjectLabel"), t.get("blockContractorLabel"),
                 t.get("blockInspectorLabel"), t.get("blockRepresentativeLabel"),
                 t.get("blockViolationsTitle"), t.get("blockCopiesText"), t.get("blockReportText"),
                 t.get("fontSize"), t.get("fontFamily"),
                 t.get("marginTop"), t.get("marginRight"),
                 t.get("marginBottom"), t.get("marginLeft"),
                 t.get("sigIssuerLabel"), t.get("sigReceiverLabel"),
                 t.get("isDefault", False),
                 t.get("paperSize", "A4"),
                 t.get("orientation", "portrait"),
                 t.get("content"),
                 tid)
            )
            conn.commit()
            return ok({"ok": True})

        if method == "DELETE":
            tid = body.get("id") or (event.get("queryStringParameters") or {}).get("id")
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

    finally:
        cur.close()
        conn.close()