import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import { Suspension } from "@/lib/suspensionTypes";

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU");
}

const DEFAULT_SUSPENSION_CONTENT = `<p style="text-align:center"><strong>АКТ О ПРИОСТАНОВКЕ РАБОТ № {{number}}</strong></p>
<p style="text-align:center">в связи с нарушением требований охраны труда, пожарной, промышленной безопасности и экологии</p>
<p style="text-align:right">от {{date}}</p>
<p><strong>Проверяемый объект:</strong> {{object}}</p>
<p><strong>Место нарушения:</strong> {{place}}</p>
<p><strong>Работы проводит подрядная организация:</strong> {{contractor}}</p>
<p><strong>Работы приостановил:</strong> {{issuedBy}}</p>
<p>До момента устранения нарушений, указанных в настоящем Акте, выполнение работ, производимых на объекте строительства, приостановлено в связи с:</p>
<p>{{reason}}</p>
<p><strong>Выдал:</strong> {{issuedBy}}</p>`;

function fillVars(html: string, s: Suspension): string {
  return html
    .replace(/\{\{number\}\}/g, esc(s.number))
    .replace(/\{\{date\}\}/g, esc(formatDate(s.issuedAt)))
    .replace(/\{\{object\}\}/g, esc(s.object))
    .replace(/\{\{place\}\}/g, esc(s.place))
    .replace(/\{\{contractor\}\}/g, esc(s.contractor))
    .replace(/\{\{issuedBy\}\}/g, esc(s.issuedBy))
    .replace(/\{\{reason\}\}/g, esc(s.reason).replace(/\n/g, "<br/>"));
}

export function printSuspension(s: Suspension, tmpl?: Template): void {
  const t = tmpl ?? { ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true };

  const paper: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
  };
  const ps = paper[t.paperSize] ?? paper.A4;
  const pw = t.orientation === "portrait" ? ps.w : ps.h;
  const ph = t.orientation === "portrait" ? ps.h : ps.w;

  const bodyHtml = fillVars(t.content || DEFAULT_SUSPENSION_CONTENT, s);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>АКТ О ПРИОСТАНОВКЕ № ${s.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; font-family: '${t.fontFamily || "Times New Roman"}', Times, serif; font-size: ${t.fontSize || 11}pt; color: #000; line-height: 1.5; }
    @page {
      size: ${pw}mm ${ph}mm;
      margin: ${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm;
    }
    html { -webkit-print-color-adjust: exact; }
    head, header, footer { display: none !important; }
    p { margin: 0 0 4px; min-height: 1.5em; white-space: pre-wrap; }
  </style>
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
  }, 800);
}
