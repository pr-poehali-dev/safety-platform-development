import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import PrescriptionDocument, { PrescriptionData } from "@/components/PrescriptionDocument";

export function printPrescription(p: PrescriptionData, tmpl?: Template): void {
  const t = tmpl ?? { ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true };

  const paper = { A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 } }[t.paperSize] ?? { w: 210, h: 297 };
  const pw = t.orientation === "portrait" ? paper.w : paper.h;
  const ph = t.orientation === "portrait" ? paper.h : paper.w;

  const bodyHtml = renderToStaticMarkup(
    React.createElement(PrescriptionDocument, { template: t, prescription: p, forPrint: true })
  );

  const orientation = t.orientation === "landscape" ? "landscape" : "portrait";

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>АКТ-ПРЕДПИСАНИЕ № ${p.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    @page {
      size: ${pw}mm ${ph}mm;
      margin: ${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm;
    }
    @media print {
      /* Шапка таблицы повторяется на каждой странице */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      /* Позволяем строкам переноситься — не запрещаем разрыв внутри tr,
         иначе браузер выносит всю таблицу на новую страницу */
      tr { page-break-inside: auto; }
      /* Но шапку не разрываем */
      thead tr { page-break-inside: avoid; page-break-after: avoid; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  // Используем blob URL чтобы избежать "about:blank" в заголовке
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) { URL.revokeObjectURL(url); return; }
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 400);
}