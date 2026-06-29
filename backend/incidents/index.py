import json
import os
import psycopg2

SCHEMA = "t_p5901577_safety_platform_deve"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """CRUD для журнала происшествий."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    if method == "GET":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, description, incident_date, location, contractor,
                       microtrauma, light_injury, severe_injury, fatal, no_consequences,
                       created_by, created_by_name, created_at
                FROM {SCHEMA}.incidents
                ORDER BY incident_date DESC, created_at DESC"""
        )
        rows = cur.fetchall()
        conn.close()

        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "description": r[1],
                "incident_date": r[2].isoformat() if r[2] else None,
                "location": r[3],
                "contractor": r[4],
                "microtrauma": r[5],
                "light_injury": r[6],
                "severe_injury": r[7],
                "fatal": r[8],
                "no_consequences": r[9],
                "created_by": r[10],
                "created_by_name": r[11],
                "created_at": r[12].isoformat() if r[12] else None,
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        if not body.get("description") or not body.get("incident_date"):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "description and incident_date required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.incidents
                (description, incident_date, location, contractor,
                 microtrauma, light_injury, severe_injury, fatal, no_consequences,
                 created_by, created_by_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at""",
            (
                body["description"],
                body["incident_date"],
                body.get("location") or None,
                body.get("contractor") or None,
                int(body.get("microtrauma", 0)),
                int(body.get("light_injury", 0)),
                int(body.get("severe_injury", 0)),
                int(body.get("fatal", 0)),
                int(body.get("no_consequences", 0)),
                body.get("created_by") or None,
                body.get("created_by_name") or None,
            )
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0]}, ensure_ascii=False)}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
