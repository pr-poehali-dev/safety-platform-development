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
        "contractNumber": row[11] if len(row) > 11 else None,
        "createdBy": row[12] if len(row) > 12 else "",
        "inspectorNominative": row[13] if len(row) > 13 else "",
        "importLog": row[14] if len(row) > 14 and row[14] else [],
    }



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
        "paperSize": row[22], "orientation": row[23],
    }


TEMPLATE_FIELDS = (
    "id, name, title, subtitle, company_name, table_columns, block_object_label, block_contractor_label, "
    "block_inspector_label, block_representative_label, block_violations_title, block_copies_text, "
    "block_report_text, font_size, font_family, margin_top, margin_right, margin_bottom, margin_left, "
    "sig_issuer_label, sig_receiver_label, is_default, paper_size, orientation"
)


def handle_numbering(method, body, cur, conn):
    if method == "GET":
        cur.execute(
            f"SELECT id, prefix, start_number, next_number, auto_reset_yearly, last_year "
            f"FROM {SCHEMA}.prescription_numbering ORDER BY id LIMIT 1"
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
        cur.execute(f"SELECT id FROM {SCHEMA}.prescription_numbering ORDER BY id LIMIT 1")
        row = cur.fetchone()
        if row:
            cur.execute(
                f"UPDATE {SCHEMA}.prescription_numbering "
                f"SET prefix=%s, start_number=%s, next_number=%s, auto_reset_yearly=%s, updated_at=now() WHERE id=%s",
                (prefix, start_number, start_number, auto_reset_yearly, row[0])
            )
        else:
            cur.execute(
                f"INSERT INTO {SCHEMA}.prescription_numbering (prefix, start_number, next_number, auto_reset_yearly) "
                f"VALUES (%s,%s,%s,%s)",
                (prefix, start_number, start_number, auto_reset_yearly)
            )
        conn.commit()
        return ok({"ok": True})

    return err("Method not allowed", 405)


def next_prescription_number(cur, conn):
    import datetime
    cur.execute(
        f"SELECT id, prefix, start_number, next_number, auto_reset_yearly, last_year "
        f"FROM {SCHEMA}.prescription_numbering ORDER BY id LIMIT 1 FOR UPDATE"
    )
    row = cur.fetchone()
    current_year = datetime.datetime.now().year

    if not row:
        cur.execute(
            f"INSERT INTO {SCHEMA}.prescription_numbering (prefix, start_number, next_number, auto_reset_yearly, last_year) "
            f"VALUES ('', 1, 2, FALSE, %s) RETURNING id",
            (current_year,)
        )
        return "1"

    nid, prefix, start_number, next_number, auto_reset_yearly, last_year = row

    if auto_reset_yearly and last_year is not None and last_year != current_year:
        next_number = start_number

    number_value = next_number
    upcoming_next = next_number + 1

    cur.execute(
        f"UPDATE {SCHEMA}.prescription_numbering SET next_number=%s, last_year=%s, updated_at=now() WHERE id=%s",
        (upcoming_next, current_year, nid)
    )

    return f"{prefix}{number_value}" if prefix else str(number_value)


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
            f"margin_top, margin_right, margin_bottom, margin_left, sig_issuer_label, sig_receiver_label, "
            f"is_default, paper_size, orientation) "
            f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
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
             t.get("paperSize", "A4"), t.get("orientation", "portrait"))
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
            f"sig_issuer_label=%s, sig_receiver_label=%s, is_default=%s, "
            f"paper_size=%s, orientation=%s, updated_at=now() WHERE id=%s",
            (t["name"], t.get("title"), t.get("subtitle"), t.get("companyName"),
             json.dumps(t.get("tableColumns", []), ensure_ascii=False),
             t.get("blockObjectLabel"), t.get("blockContractorLabel"), t.get("blockInspectorLabel"),
             t.get("blockRepresentativeLabel"), t.get("blockViolationsTitle"),
             t.get("blockCopiesText"), t.get("blockReportText"),
             t.get("fontSize"), t.get("fontFamily"),
             t.get("marginTop"), t.get("marginRight"), t.get("marginBottom"), t.get("marginLeft"),
             t.get("sigIssuerLabel"), t.get("sigReceiverLabel"),
             t.get("isDefault", False),
             t.get("paperSize", "A4"), t.get("orientation", "portrait"), tid)
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
        # Роутинг по query-параметру ?type=templates / ?type=numbering
        qs = event.get("queryStringParameters") or {}
        if qs.get("type") == "templates" or body.get("_type") == "templates":
            return handle_templates(method, body, cur, conn)
        if qs.get("type") == "numbering" or body.get("_type") == "numbering":
            return handle_numbering(method, body, cur, conn)

        # --- ПРЕДПИСАНИЯ ---
        if method == "GET":
            cur.execute(
                f"SELECT id, number, date, object, contractor, inspector, representative, responsible, reply_email, report_deadline, comments, contract_number, created_by, inspector_nominative, import_log "
                f"FROM {SCHEMA}.prescriptions ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            if not rows:
                return ok([])
            ids = [row[0] for row in rows]
            ids_list = ",".join(f"'{i}'" for i in ids)
            cur.execute(
                f"SELECT prescription_id, id, place, description, norm_ref, deadline, status, photos, category, work_suspended, suspension_act_drawn "
                f"FROM {SCHEMA}.remarks WHERE prescription_id IN ({ids_list}) ORDER BY prescription_id, sort_order, id"
            )
            remarks_map: dict = {pid: [] for pid in ids}
            for r in cur.fetchall():
                photos = r[7] if r[7] else []
                if isinstance(photos, str):
                    photos = json.loads(photos)
                remarks_map[r[0]].append({"id": r[1], "place": r[2], "description": r[3], "normRef": r[4], "deadline": r[5], "status": r[6], "photos": photos, "category": r[8] or "", "work_suspended": bool(r[9]), "suspension_act_drawn": bool(r[10])})
            return ok([row_to_prescription(row, remarks_map[row[0]]) for row in rows])

        if method == "POST":
            p = body
            pid = p["id"]
            number = next_prescription_number(cur, conn)
            cur.execute(
                f"INSERT INTO {SCHEMA}.prescriptions (id, number, date, object, contractor, inspector, representative, responsible, reply_email, report_deadline, comments, contract_number, created_by, inspector_nominative) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (pid, number, p["date"], p["object"], p["contractor"],
                 p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                 p.get("replyEmail", ""), p.get("reportDeadline", ""),
                 json.dumps(p.get("comments", []), ensure_ascii=False),
                 p.get("contractNumber") or None,
                 p.get("createdBy", ""),
                 p.get("inspectorNominative", ""))
            )
            remarks = p.get("remarks", [])
            if remarks:
                cur.executemany(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, category, description, norm_ref, deadline, status, sort_order, photos, work_suspended, suspension_act_drawn) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    [(r["id"], pid, r.get("place", ""), r.get("category", ""), r.get("description", ""), r.get("normRef", ""), r.get("deadline", ""), r.get("status", "В работе"), i,
                      json.dumps(r.get("photos", []), ensure_ascii=False), bool(r.get("work_suspended", False)), bool(r.get("suspension_act_drawn", False)))
                     for i, r in enumerate(remarks)]
                )
            conn.commit()
            return ok({"ok": True, "number": number})

        if method == "PUT":
            p = body
            pid = p["id"]

            cur.execute(f"SELECT created_by, comments FROM {SCHEMA}.prescriptions WHERE id=%s", (pid,))
            existing_row = cur.fetchone()
            old_comments = []
            creator_login = None
            if existing_row:
                creator_login = existing_row[0]
                old_comments = existing_row[1] if existing_row[1] else []
                if isinstance(old_comments, str):
                    old_comments = json.loads(old_comments)

            new_comments = p.get("comments", [])

            cur.execute(
                f"UPDATE {SCHEMA}.prescriptions SET number=%s, date=%s, object=%s, contractor=%s, inspector=%s, "
                f"representative=%s, responsible=%s, reply_email=%s, report_deadline=%s, comments=%s, contract_number=%s, inspector_nominative=%s WHERE id=%s",
                (p["number"], p["date"], p["object"], p["contractor"],
                 p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                 p.get("replyEmail", ""), p.get("reportDeadline", ""),
                 json.dumps(new_comments, ensure_ascii=False),
                 p.get("contractNumber") or None, p.get("inspectorNominative", ""), pid)
            )

            # Новый комментарий добавлен — уведомляем участников обсуждения
            if len(new_comments) > len(old_comments):
                new_comment = new_comments[-1]
                author_login = new_comment.get("authorLogin")
                author_name = new_comment.get("author") or ""
                participant_logins = {c.get("authorLogin") for c in old_comments if c.get("authorLogin")}
                if creator_login:
                    participant_logins.add(creator_login)
                participant_logins.discard(author_login)
                participant_logins.discard(None)

                msg_preview = (new_comment.get("text") or "")[:70]
                notify_values = [
                    (login, pid, "new_comment", f"Новый комментарий от {author_name} к предписанию {p.get('number', '')}: {msg_preview}")
                    for login in participant_logins
                ]
                if notify_values:
                    cur.executemany(
                        f"""INSERT INTO {SCHEMA}.prescription_notifications
                            (user_login, prescription_id, event_type, message)
                            VALUES (%s, %s, %s, %s)""",
                        notify_values
                    )

            cur.execute(f"DELETE FROM {SCHEMA}.remarks WHERE prescription_id = %s", (pid,))
            remarks = p.get("remarks", [])
            if remarks:
                cur.executemany(
                    f"INSERT INTO {SCHEMA}.remarks (id, prescription_id, place, category, description, norm_ref, deadline, status, sort_order, photos, work_suspended, suspension_act_drawn) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    [(r["id"], pid, r.get("place", ""), r.get("category", ""), r.get("description", ""), r.get("normRef", ""), r.get("deadline", ""), r.get("status", "В работе"), i,
                      json.dumps(r.get("photos", []), ensure_ascii=False), bool(r.get("work_suspended", False)), bool(r.get("suspension_act_drawn", False)))
                     for i, r in enumerate(remarks)]
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