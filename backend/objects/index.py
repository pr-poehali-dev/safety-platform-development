import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для справочника объектов и их мест нарушений."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, name, sort_order FROM {SCHEMA}.objects ORDER BY sort_order, id")
        objects = cur.fetchall()
        cur.execute(f"SELECT id, object_id, name FROM {SCHEMA}.object_places ORDER BY sort_order, id")
        places = cur.fetchall()
        conn.close()

        places_map: dict = {}
        for p in places:
            oid = p[1]
            if oid not in places_map:
                places_map[oid] = []
            places_map[oid].append({"id": p[0], "name": p[2]})

        result = [
            {"id": r[0], "name": r[1], "sort_order": r[2], "places": places_map.get(r[0], [])}
            for r in objects
        ]
        return {"statusCode": 200, "headers": cors, "body": json.dumps(result, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")

    # Добавить место к объекту
    if action == "add_place":
        object_id = body.get("object_id")
        name = (body.get("name") or "").strip()
        if not object_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "object_id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.object_places WHERE object_id = %s", (object_id,))
        next_order = cur.fetchone()[0]
        cur.execute(
            f"INSERT INTO {SCHEMA}.object_places (object_id, name, sort_order) VALUES (%s, %s, %s) RETURNING id",
            (object_id, name, next_order)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": new_id})}

    # Редактировать место
    if action == "edit_place":
        place_id = body.get("place_id")
        name = (body.get("name") or "").strip()
        if not place_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "place_id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.object_places SET name = %s WHERE id = %s", (name, place_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # Удалить место
    if action == "remove_place":
        place_id = body.get("place_id")
        if not place_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "place_id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.object_places WHERE id = %s", (place_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # POST — добавить объект
    if method == "POST":
        name = (body.get("name") or "").strip()
        if not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {SCHEMA}.objects")
        next_order = cur.fetchone()[0]
        cur.execute(f"INSERT INTO {SCHEMA}.objects (name, sort_order) VALUES (%s, %s) RETURNING id, name, sort_order", (name, next_order))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"id": row[0], "name": row[1], "sort_order": row[2]}, ensure_ascii=False)}

    # PUT — обновить название объекта
    if method == "PUT":
        obj_id = body.get("id")
        name = (body.get("name") or "").strip()
        if not obj_id or not name:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id and name required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.objects SET name = %s WHERE id = %s", (name, obj_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    # DELETE — удалить объект (и его места каскадно)
    if method == "DELETE":
        obj_id = body.get("id")
        if not obj_id:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.object_places WHERE object_id = %s", (obj_id,))
        cur.execute(f"DELETE FROM {SCHEMA}.objects WHERE id = %s", (obj_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}
