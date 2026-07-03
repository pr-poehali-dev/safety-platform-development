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

// Сопоставление текста заголовка с ключом колонки (fallback, если data-col-key отсутствует)
const HEADER_KEY_MAP: [RegExp, string][] = [
  [/№|п\/п/i, "num"],
  [/место/i, "place"],
  [/описан/i, "description"],
  [/нпа|лна|пункт/i, "normRef"],
  [/срок/i, "deadline"],
  [/статус/i, "status"],
];

function guessColKeyFromHeaderText(text: string): string | null {
  const t = text.trim();
  for (const [re, key] of HEADER_KEY_MAP) {
    if (re.test(t)) return key;
  }
  return null;
}

/**
 * Находит таблицу замечаний в HTML шаблона (через DOMParser — устойчиво к
 * порядку атрибутов, лишним пробелам, вложенным тегам) и разворачивает
 * строку-заготовку в реальные строки данных предписания.
 * Ищет по:
 *   1) атрибуту data-remarks-table="1" на <table>
 *   2) fallback: таблица, чьи заголовки текстово совпадают с ожидаемым набором
 * Также обрабатывает старый текстовый маркер {{remarks_table}}.
 */
function expandRemarksTable(html: string, p: PrescriptionData): string {
  const colStyle = "border:1px solid #000;padding:4px 6px;vertical-align:top;";

  const buildRows = (colKeys: string[]): string => {
    const remarks = p.remarks || [];
    if (remarks.length === 0) {
      return `<tr><td colspan="${colKeys.length || 5}" style="${colStyle}text-align:center;color:#888;">Нарушения не зафиксированы</td></tr>`;
    }
    return remarks.map((r, i) =>
      `<tr>${colKeys.map(key => getCellHtml(key, r as RemarkRow, i, colStyle)).join("")}</tr>`
    ).join("");
  };

  // --- Обратная совместимость: старый текстовый маркер {{remarks_table}} ---
  if (/\{\{remarks_table\}\}/.test(html)) {
    const thStyle = `${colStyle}font-weight:bold;text-align:center;background:#f5f5f5;font-size:9pt;`;
    const colKeys = ["num", "place", "description", "normRef", "deadline"];
    const table = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;font-size:9pt;">
      <thead><tr>
        <th style="${thStyle}width:5%;">№ п/п</th>
        <th style="${thStyle}width:18%;">Место нарушения</th>
        <th style="${thStyle}">Описание нарушения / Фото нарушения (при наличии)</th>
        <th style="${thStyle}width:22%;">Нарушен пункт НПА/ЛНА</th>
        <th style="${thStyle}width:12%;">Срок устранения</th>
      </tr></thead>
      <tbody>${buildRows(colKeys)}</tbody>
    </table>`;
    return html
      .replace(/\{\{remarks_table\}\}/g, table)
      .replace(/<[^>]*>\s*\{\{remarks_table\}\}\s*<\/[^>]*>/g, table);
  }

  // --- Новый формат: парсим HTML через DOMParser (устойчиво к атрибутам/пробелам) ---
  if (typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return html;

  const tables = Array.from(root.querySelectorAll("table"));
  let targetTable: HTMLTableElement | null = null;
  let colKeys: string[] = [];

  for (const table of tables) {
    const headerCells = Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td"));
    if (headerCells.length === 0) continue;

    // Пытаемся прочитать data-col-key
    const keysFromAttr = headerCells.map(c => c.getAttribute("data-col-key"));
    if (keysFromAttr.every(k => !!k)) {
      targetTable = table as HTMLTableElement;
      colKeys = keysFromAttr as string[];
      break;
    }

    // Fallback: явный маркер на самой таблице
    if (table.getAttribute("data-remarks-table") === "1") {
      targetTable = table as HTMLTableElement;
      colKeys = headerCells.map(c => guessColKeyFromHeaderText(c.textContent || "") ?? "description");
      break;
    }

    // Fallback: угадываем по тексту заголовков (минимум 3 совпадения из известного набора)
    const guessed = headerCells.map(c => guessColKeyFromHeaderText(c.textContent || ""));
    const matchCount = guessed.filter(Boolean).length;
    if (matchCount >= 3 && matchCount === headerCells.length) {
      targetTable = table as HTMLTableElement;
      colKeys = guessed as string[];
      break;
    }
  }

  if (!targetTable || colKeys.length === 0) return html;

  // Сохраняем первую строку (шапку), удаляем остальные строки, добавляем строки данных.
  // Модифицируем DOM напрямую и сериализуем весь документ — надёжнее, чем string-replace outerHTML,
  // т.к. DOMParser может изменить порядок/кавычки атрибутов при парсинге.
  const allRows = Array.from(targetTable.querySelectorAll("tr"));
  const headerRow = allRows[0] ?? null;

  // Убираем существующий thead/tbody, если есть, и лишние строки
  const existingThead = targetTable.querySelector("thead");
  const existingTbody = targetTable.querySelector("tbody");
  if (existingThead) existingThead.remove();
  if (existingTbody) existingTbody.remove();
  allRows.forEach(r => r.remove());

  const thead = doc.createElement("thead");
  if (headerRow) thead.appendChild(headerRow);
  const tbody = doc.createElement("tbody");
  tbody.innerHTML = buildRows(colKeys);

  targetTable.appendChild(thead);
  targetTable.appendChild(tbody);

  return root.innerHTML;
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
    p, li, td, th { white-space: pre-wrap; }
    p { margin: 0 0 4px; min-height: 1.5em; }
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