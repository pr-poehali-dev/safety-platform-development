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

  // Доступная высота страницы в мм (за вычетом полей)
  const pageH = ph - t.marginTop - t.marginBottom;
  // Оставляем запас ~15мм на текст замечания и отступы внутри строки
  const maxImgH = pageH - 15;

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
      margin-header: 0;
      margin-footer: 0;
    }
    @page :first { margin-top: ${t.marginTop}mm; }
    html { -webkit-print-color-adjust: exact; }
    /* Скрываем системные колонтитулы браузера */
    head, header, footer { display: none !important; }
    @media print {
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: auto; }
      thead tr { page-break-inside: avoid; page-break-after: avoid; }
    }
  </style>
  <script>
    // Подбираем ширину каждого фото так, чтобы оно целиком влезло на страницу
    var MAX_IMG_H_MM = ${maxImgH};
    var MM_PER_PX; // будет вычислено через ruler

    function fitImages() {
      // Создаём линейку 10mm для вычисления px/mm
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

        var ratio = naturalH / naturalW; // высота / ширина
        var containerW = img.parentElement ? img.parentElement.offsetWidth : img.offsetWidth;

        // Высота при текущей ширине контейнера
        var renderedH = containerW * ratio;

        if (renderedH > maxHpx) {
          // Нужная ширина чтобы высота = maxHpx
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