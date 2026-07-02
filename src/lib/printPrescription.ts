import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import PrescriptionDocument, { PrescriptionData } from "@/components/PrescriptionDocument";

// Экранирование HTML-спецсимволов
function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Маппинг data-col-key → значение из замечания
type RemarkRow = { id: string; place: string; description: string; normRef: string; deadline: string; status: string; photos?: string[] };

function getCellHtml(key: string, r: RemarkRow, idx: number, colStyle: string): string {
  const photos = (r.photos || []).map(url =>
    `<div style="margin-top:4px;line-height:0;"><img src="${url}" data-photo="1" style="max-width:100%;width:100%;height:auto;display:block;border:1px solid #ccc;object-fit:contain;" /></div>`
  ).join("");

  const center = `${colStyle}text-align:center;`;

  switch (key) {
    case "num":         return `<td style="${center}">${idx + 1}</td>`;
    case "place":       return `<td style="${colStyle}">${esc(r.place || "—")}</td>`;
    case "description": return `<td style="${colStyle}">${esc(r.description || "—")}${photos}</td>`;
    case "normRef":     return `<td style="${center}">${esc(r.normRef || "—")}</td>`;
    case "deadline":    return `<td style="${center}">${esc(r.deadline || "—")}</td>`;
    case "status":      return `<td style="${center}">${esc(r.status || "—")}</td>`;
    default:            return `<td style="${colStyle}">—</td>`;
  }
}

/**
 * Находит таблицу замечаний (data-remarks-table="1") в HTML шаблона,
 * читает data-col-key из <th>, и генерирует строки для каждого замечания.
 * Также обрабатывает старый маркер {{remarks_table}}.
 */
function expandRemarksTable(html: string, p: PrescriptionData): string {
  // --- Обратная совместимость: старый маркер {{remarks_table}} ---
  if (/\{\{remarks_table\}\}/.test(html)) {
    const colStyle = "border:1px solid #000;padding:4px 6px;vertical-align:top;";
    const thStyle = `${colStyle}font-weight:bold;text-align:center;background:#f5f5f5;font-size:9pt;`;
    const rows = (p.remarks || []).map((r, i) => {
      const photos = (r.photos || []).map(url =>
        `<div style="margin-top:4px;line-height:0;"><img src="${url}" data-photo="1" style="max-width:100%;width:100%;height:auto;display:block;border:1px solid #ccc;object-fit:contain;" /></div>`
      ).join("");
      return `<tr>
        <td style="${colStyle}text-align:center;">${i + 1}</td>
        <td style="${colStyle}">${esc(r.place || "—")}</td>
        <td style="${colStyle}">${esc(r.description || "—")}${photos}</td>
        <td style="${colStyle}">${esc(r.normRef || "—")}</td>
        <td style="${colStyle}">${esc(r.deadline || "—")}</td>
      </tr>`;
    }).join("");
    const table = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;font-size:9pt;">
      <thead><tr>
        <th style="${thStyle}width:5%;">№ п/п</th>
        <th style="${thStyle}width:18%;">Место нарушения</th>
        <th style="${thStyle}">Описание нарушения / Фото нарушения (при наличии)</th>
        <th style="${thStyle}width:22%;">Нарушен пункт НПА/ЛНА</th>
        <th style="${thStyle}width:12%;">Срок устранения</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="${colStyle}text-align:center;">Нарушения не зафиксированы</td></tr>`}</tbody>
    </table>`;
    return html
      .replace(/\{\{remarks_table\}\}/g, table)
      .replace(/<[^>]*>\s*\{\{remarks_table\}\}\s*<\/[^>]*>/g, table);
  }

  // --- Новый формат: таблица с data-remarks-table="1" ---
  if (!html.includes('data-remarks-table="1"')) return html;

  // Ищем блок <table ... data-remarks-table="1" ...>...</table>
  const tableMatch = html.match(/<table[^>]*data-remarks-table="1"[^>]*>[\s\S]*?<\/table>/);
  if (!tableMatch) return html;

  const tableHtml = tableMatch[0];

  // Извлекаем все <th ...data-col-key="KEY"...> — порядок ключей
  const colKeys: string[] = [];
  const thRe = /<th[^>]*data-col-key="([^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = thRe.exec(tableHtml)) !== null) {
    colKeys.push(m[1]);
  }

  // Извлекаем стиль таблицы (сохраняем как есть, очищаем от лишних атрибутов)
  const tableOpenRaw = tableHtml.match(/^<table[^>]*>/)?.[0] ?? "<table>";

  // Строим шапку из исходного <tr> с <th>
  const theadMatch = tableHtml.match(/<tr[\s\S]*?<\/tr>/);
  const theadRow = theadMatch ? theadMatch[0] : "";

  // Стили ячеек
  const colStyle = "border:1px solid #000;padding:4px 6px;vertical-align:top;";

  // Строим строки данных
  const remarks = p.remarks || [];
  const dataRows = remarks.length > 0
    ? remarks.map((r, i) =>
        `<tr>${colKeys.map(key => getCellHtml(key, r as RemarkRow, i, colStyle)).join("")}</tr>`
      ).join("")
    : `<tr><td colspan="${colKeys.length || 5}" style="${colStyle}text-align:center;color:#888;">Нарушения не зафиксированы</td></tr>`;

  const newTable = `${tableOpenRaw}<thead>${theadRow}</thead><tbody>${dataRows}</tbody></table>`;

  return html.replace(tableMatch[0], newTable);
}

function fillVars(html: string, p: PrescriptionData, companyName: string): string {
  // Сначала разворачиваем таблицу замечаний
  let result = expandRemarksTable(html, p);

  // Затем подставляем остальные переменные
  result = result
    .replace(/\{\{number\}\}/g, esc(p.number))
    .replace(/\{\{date\}\}/g, esc(p.date))
    .replace(/\{\{object\}\}/g, esc(p.object))
    .replace(/\{\{contractor\}\}/g, esc(p.contractor))
    .replace(/\{\{inspector\}\}/g, esc(p.inspector))
    .replace(/\{\{representative\}\}/g, esc(p.representative || ""))
    .replace(/\{\{responsible\}\}/g, esc(p.responsible || ""))
    .replace(/\{\{replyEmail\}\}/g, esc(p.replyEmail || ""))
    .replace(/\{\{reportDeadline\}\}/g, esc(p.reportDeadline || ""))
    .replace(/\{\{companyName\}\}/g, esc(companyName));

  return result;
}

export function printPrescription(p: PrescriptionData, tmpl?: Template): void {
  const t = tmpl ?? { ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true };

  const paper: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
    Letter: { w: 216, h: 279 },
  };
  const ps = paper[t.paperSize] ?? paper.A4;
  const pw = t.orientation === "portrait" ? ps.w : ps.h;
  const ph = t.orientation === "portrait" ? ps.h : ps.w;

  const pageH = ph - t.marginTop - t.marginBottom;
  const maxImgH = pageH - 15;

  let bodyHtml: string;

  if (t.content) {
    bodyHtml = fillVars(t.content, p, t.companyName || "");
  } else {
    bodyHtml = renderToStaticMarkup(
      React.createElement(PrescriptionDocument, { template: t, prescription: p, forPrint: true })
    );
  }

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>АКТ-ПРЕДПИСАНИЕ № ${p.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; font-family: '${t.fontFamily || "Times New Roman"}', Times, serif; font-size: ${t.fontSize || 11}pt; color: #000; line-height: 1.5; }
    @page {
      size: ${pw}mm ${ph}mm;
      margin: ${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm;
      margin-header: 0;
      margin-footer: 0;
    }
    @page :first { margin-top: ${t.marginTop}mm; }
    html { -webkit-print-color-adjust: exact; }
    head, header, footer { display: none !important; }
    @media print {
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: auto; }
      thead tr { page-break-inside: avoid; page-break-after: avoid; }
    }
    p { margin: 0 0 4px; }
    h1 { font-size: 20pt; font-weight: bold; margin: 12px 0 6px; }
    h2 { font-size: 16pt; font-weight: bold; margin: 10px 0 5px; }
    h3 { font-size: 13pt; font-weight: bold; margin: 8px 0 4px; }
    ul { padding-left: 20px; margin: 4px 0; }
    ol { padding-left: 20px; margin: 4px 0; }
    li { margin: 2px 0; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    td, th { border: 1px solid #000; padding: 4px 6px; min-width: 20px; vertical-align: top; }
    th { font-weight: bold; background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid #999; margin: 8px 0; }
  </style>
  <script>
    var MAX_IMG_H_MM = ${maxImgH};
    var MM_PER_PX;

    function fitImages() {
      var ruler = document.createElement('div');
      ruler.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:10mm;height:1px;';
      document.body.appendChild(ruler);
      MM_PER_PX = 10 / ruler.offsetWidth;
      document.body.removeChild(ruler);
      var maxHpx = MAX_IMG_H_MM / MM_PER_PX;
      var imgs = document.querySelectorAll('img[data-photo]');
      imgs.forEach(function(img) {
        var naturalW = img.naturalWidth;
        var naturalH = img.naturalHeight;
        if (!naturalW || !naturalH) return;
        var ratio = naturalH / naturalW;
        var containerW = img.parentElement ? img.parentElement.offsetWidth : img.offsetWidth;
        var renderedH = containerW * ratio;
        if (renderedH > maxHpx) {
          var neededW = maxHpx / ratio;
          img.style.width = Math.floor(neededW) + 'px';
        } else {
          img.style.width = '100%';
        }
        img.style.height = 'auto';
      });
    }

    window.addEventListener('load', function() {
      var imgs = document.querySelectorAll('img[data-photo]');
      var loaded = 0;
      var total = imgs.length;
      if (total === 0) { return; }
      function onLoad() { loaded++; if (loaded === total) fitImages(); }
      imgs.forEach(function(img) {
        if (img.complete) { onLoad(); }
        else { img.addEventListener('load', onLoad); img.addEventListener('error', onLoad); }
      });
    });
  </script>
</head>
<body>${bodyHtml}</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) { URL.revokeObjectURL(url); return; }
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 1200);
}
