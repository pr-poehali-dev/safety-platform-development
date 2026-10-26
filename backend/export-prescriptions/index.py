import json
import os
import io
import uuid
import boto3
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

COLUMNS = [
    "Номер", "Дата", "Объект", "Подрядчик", "№ контракта", "Инспектор", "В присутствии", "Ответственный",
    "Срок отчёта", "Email для ответа", "Статус предписания",
    "Замечание №", "Место нарушения", "Вид нарушения", "Описание нарушения", "НПА/ЛНА",
    "Срок устранения", "Статус замечания", "Работы приостановлены", "Акт о приостановке", "№ акта",
]
COL_WIDTHS = [10, 12, 24, 24, 14, 22, 22, 22, 12, 22, 16, 10, 20, 22, 40, 22, 14, 14, 16, 16, 14]


def handler(event: dict, context) -> dict:
    """Экспорт предписаний в Excel без фотографий."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    prescriptions = body.get("prescriptions", [])

    wb = Workbook()
    ws = wb.active
    ws.title = "Предписания"

    for i, col_name in enumerate(COLUMNS, start=1):
        cell = ws.cell(row=1, column=i, value=col_name)
        cell.font = Font(bold=True)
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for i, width in enumerate(COL_WIDTHS, start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width

    
    data_rows = []
    for p in prescriptions:
        remarks = p.get("remarks", [])
        status = p.get("status", "")
        if not remarks:
            values = [
                p.get("number", ""), p.get("date", ""), p.get("object", ""), p.get("contractor", ""),
                p.get("contractNumber", ""), p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                p.get("reportDeadline", ""), p.get("replyEmail", ""),
                status, "", "", "", "", "", "", "", "", "", "",
            ]
            data_rows.append(values)
            continue

        for idx, r in enumerate(remarks):
            values = [
                p.get("number", "") if idx == 0 else "",
                p.get("date", "") if idx == 0 else "",
                p.get("object", "") if idx == 0 else "",
                p.get("contractor", "") if idx == 0 else "",
                p.get("contractNumber", "") if idx == 0 else "",
                p.get("inspector", "") if idx == 0 else "",
                p.get("representative", "") if idx == 0 else "",
                p.get("responsible", "") if idx == 0 else "",
                p.get("reportDeadline", "") if idx == 0 else "",
                p.get("replyEmail", "") if idx == 0 else "",
                status if idx == 0 else "",
                idx + 1,
                r.get("place", ""),
                r.get("category", ""),
                r.get("description", ""),
                r.get("normRef", ""),
                r.get("deadline", ""),
                r.get("status", ""),
                "Да" if r.get("work_suspended") else "Нет",
                "Да" if r.get("suspension_act_drawn") else "Нет",
                r.get("suspension_act_number", ""),
            ]
            data_rows.append(values)

    for i, values in enumerate(data_rows):
        row_idx = i + 2
        for c, v in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=c, value=v)
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    file_key = f"exports/prescriptions-{uuid.uuid4()}.xlsx"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(
        Bucket="files",
        Key=file_key,
        Body=buf.getvalue(),
        ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"

    return {
        "statusCode": 200,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps({"url": cdn_url}),
    }