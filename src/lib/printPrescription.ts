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

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>АКТ-ПРЕДПИСАНИЕ № ${p.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; }
    @media print {
      @page { size: ${pw}mm ${ph}mm ${t.orientation === "landscape" ? "landscape" : "portrait"}; margin: 0; }
      body { margin: 0; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 300);
}