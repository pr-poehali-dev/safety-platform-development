import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для справочника подрядчиков и их договоров."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET — список подрядчиков со всеми договорами
    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order FROM {SCHEMA}.contractors ORDER BY sort_order, id")
        contractors = cur.fetchall()
        cur.execute(f"SELECT id, contractor_id, contract_number FROM {SCHEMA}.contractor_contracts WHERE contract_number != '' ORDER BY created_at")
        contracts = cur.fetchall()
        conn.close()

        contracts_map: dict = {}
        for c in contracts:
            cid = c[1]
            if cid not in contracts_map:
                contracts_map[cid] = []
            contracts_map[cid].append({"id": c[0], "contract_number": c[2]})

        result = [
            {"id": r[0], "name": r[1], "sort_order": r[2], "contracts": contracts_map.get(r[0], [])}
            for r in contractors
        ]
        return {"statusCode": 200, "headers": cors, "body": json.dumps(result, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")

    # Добавить договор к подрядчику
    if action == "add_contract":
        contractor_id = body.get("contractor_id")
        contract_number = (body.get("contract_number") or "").strip()
        if not contractor_id or not contract_number:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "contractor_id and contract_number required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.contractor_contracts (contractor_id, contract_number) VALUES (%s, %s) RETURNING id",
            (contractor_id, contract_number)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": new_id})}

    # Редактировать номер договора
    if action == "edit_contract":
        contract_id = body.get("contract_id")
        contract_number = (body.get("contract_number") or "").strip()
        if not contract_id or not contract_number:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "contract_id and contract_number required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.contractor_contracts SET contract_number = %s WHERE id = %s", (contract_number, contract_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # Удалить договор (обнуляем значение — DELETE запрещён платформой)
    if action == "remove_contract":
        contract_id = body.get("contract_id")
        if not contract_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "contract_id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.contractor_contracts SET contract_number = '' WHERE id = %s", (contract_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # POST — добавить подрядчика
    if method == "POST":
        name = (body.get("name") or "").strip()
        if not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.contractors")
        next_order = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.contractors (name, sort_order) VALUES (%s, %s) RETURNING id",
            (name, next_order)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": new_id, "name": name}, ensure_ascii=False)}

    # PUT — обновить название подрядчика
    if method == "PUT":
        item_id = body.get("id")
        name = (body.get("name") or "").strip()
        if not item_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.contractors SET name = %s WHERE id = %s", (name, item_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # DELETE — скрываем подрядчика (sort_order = -1)
    if method == "DELETE":
        item_id = body.get("id")
        if not item_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.contractors SET sort_order = -1, name = CONCAT('[удалён] ', name) WHERE id = %s AND sort_order != -1", (item_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}