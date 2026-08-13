import json
import os
import io
import uuid
import boto3
import requests
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.drawing.image import Image as XLImage
from openpyxl.drawing.spreadsheet_drawing import OneCellAnchor, AnchorMarker
from openpyxl.drawing.xdr import XDRPositiveSize2D
from openpyxl.utils.units import pixels_to_EMU
from PIL import Image as PILImage

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

COLUMNS = [
    "Номер", "Дата", "Объект", "Подрядчик", "Инспектор", "В присутствии", "Ответственный",
    "Статус предписания", "Замечание №", "Место нарушения", "Описание нарушения", "НПА/ЛНА",
    "Срок устранения", "Статус замечания", "Фото",
]
COL_WIDTHS = [10, 12, 24, 24, 22, 22, 22, 16, 10, 20, 40, 22, 14, 14, 42]

THUMB_SIZE = 110
ROW_HEIGHT_WITH_PHOTOS = 88
ROW_HEIGHT_PLAIN = 16


def fetch_thumbnail(url: str):
    """Скачивает фото по URL и уменьшает его до миниатюры для вставки в Excel."""
    try:
        resp = requests.get(url, timeout=8)
        if resp.status_code != 200:
            return None
        img = PILImage.open(io.BytesIO(resp.content))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        img.thumbnail((THUMB_SIZE, THUMB_SIZE))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return buf, img.width, img.height
    except Exception:
        return None


def add_photos_to_cell(ws, row_idx: int, col_idx: int, photo_urls):
    """Вставляет миниатюры фотографий в ячейку (col_idx — 0-based), выстраивая их подряд по горизонтали."""
    x_offset_px = 2
    for url in photo_urls:
        result = fetch_thumbnail(url)
        if not result:
            continue
        buf, w, h = result
        xl_img = XLImage(buf)
        marker = AnchorMarker(col=col_idx, colOff=pixels_to_EMU(x_offset_px), row=row_idx, rowOff=pixels_to_EMU(2))
        size = XDRPositiveSize2D(pixels_to_EMU(w), pixels_to_EMU(h))
        xl_img.anchor = OneCellAnchor(_from=marker, ext=size)
        ws.add_image(xl_img)
        x_offset_px += w + 6


def handler(event: dict, context) -> dict:
    """Экспорт предписаний в Excel со встроенными фотографиями нарушений в столбце "Фото"."""
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

    photo_col_idx0 = len(COLUMNS) - 1  # 0-based индекс столбца "Фото"
    row_idx = 2  # 1-based, строки данных начинаются со 2-й

    for p in prescriptions:
        remarks = p.get("remarks", [])
        status = p.get("status", "")
        if not remarks:
            values = [
                p.get("number", ""), p.get("date", ""), p.get("object", ""), p.get("contractor", ""),
                p.get("inspector", ""), p.get("representative", ""), p.get("responsible", ""),
                status, "", "", "", "", "", "", "",
            ]
            for c, v in enumerate(values, start=1):
                ws.cell(row=row_idx, column=c, value=v)
            row_idx += 1
            continue

        for idx, r in enumerate(remarks):
            values = [
                p.get("number", "") if idx == 0 else "",
                p.get("date", "") if idx == 0 else "",
                p.get("object", "") if idx == 0 else "",
                p.get("contractor", "") if idx == 0 else "",
                p.get("inspector", "") if idx == 0 else "",
                p.get("representative", "") if idx == 0 else "",
                p.get("responsible", "") if idx == 0 else "",
                status if idx == 0 else "",
                idx + 1,
                r.get("place", ""),
                r.get("description", ""),
                r.get("normRef", ""),
                r.get("deadline", ""),
                r.get("status", ""),
                "",
            ]
            for c, v in enumerate(values, start=1):
                cell = ws.cell(row=row_idx, column=c, value=v)
                cell.alignment = Alignment(vertical="top", wrap_text=True)

            photos = r.get("photos") or []
            if photos:
                ws.row_dimensions[row_idx].height = ROW_HEIGHT_WITH_PHOTOS
                add_photos_to_cell(ws, row_idx - 1, photo_col_idx0, photos)
            else:
                ws.row_dimensions[row_idx].height = ROW_HEIGHT_PLAIN

            row_idx += 1

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