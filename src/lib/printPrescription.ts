import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import PrescriptionDocument, { PrescriptionData } from "@/components/PrescriptionDocument";

function fillVars(html: string, p: PrescriptionData, companyName: string): string {
  return html
    .replace(/\{\{number\}\}/g, p.number)
    .replace(/\{\{date\}\}/g, p.date)
    .replace(/\{\{object\}\}/g, p.object)
    .replace(/\{\{contractor\}\}/g, p.contractor)
    .replace(/\{\{inspector\}\}/g, p.inspector)
    .replace(/\{\{representative\}\}/g, p.representative || "")
    .replace(/\{\{responsible\}\}/g, p.responsible || "")
    .replace(/\{\{replyEmail\}\}/g, p.replyEmail || "")
    .replace(/\{\{reportDeadline\}\}/g, p.reportDeadline || "")
    .replace(/\{\{companyName\}\}/g, companyName);
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
    // Новый режим: шаблон сохранён как свободный HTML из Tiptap-редактора
    bodyHtml = fillVars(t.content, p, t.companyName || "");
  } else {
    // Режим обратной совместимости: рендер через PrescriptionDocument
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
    /* Стили для Tiptap-контента */
    p { margin: 0 0 4px; }
    h1 { font-size: 20pt; font-weight: bold; margin: 12px 0 6px; }
    h2 { font-size: 16pt; font-weight: bold; margin: 10px 0 5px; }
    h3 { font-size: 13pt; font-weight: bold; margin: 8px 0 4px; }
    ul { padding-left: 20px; margin: 4px 0; }
    ol { padding-left: 20px; margin: 4px 0; }
    li { margin: 2px 0; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    td, th { border: 1px solid #000; padding: 4px 6px; min-width: 40px; vertical-align: top; }
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
      function onLoad() {
        loaded++;
        if (loaded === total) fitImages();
      }
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
