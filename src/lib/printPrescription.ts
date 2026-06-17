import { Template, DEFAULT_TEMPLATE } from "@/lib/template";

interface Remark {
  id: string;
  place: string;
  description: string;
  normRef: string;
  deadline: string;
  status: string;
}

interface Prescription {
  id: string;
  number: string;
  date: string;
  object: string;
  contractor: string;
  inspector: string;
  representative: string;
  responsible: string;
  replyEmail: string;
  reportDeadline: string;
  remarks: Remark[];
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function getCellValue(key: string, r: Remark, idx: number): string {
  if (key === "num") return String(idx + 1);
  if (key === "place") return r.place || "—";
  if (key === "description") return r.description || "—";
  if (key === "normRef") return r.normRef || "—";
  if (key === "deadline") return r.deadline || "—";
  if (key === "status") return r.status || "—";
  return "—";
}

function isCentered(key: string): boolean {
  return ["num", "place", "deadline", "status"].includes(key);
}

export function printPrescription(p: Prescription, tmpl?: Template): void {
  const t = tmpl ?? { ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true };
  const cols = t.tableColumns.filter(c => c.enabled);

  const vars: Record<string, string> = {
    number: p.number,
    contractor: p.contractor,
    companyName: t.companyName,
    replyEmail: p.replyEmail || "",
    reportDeadline: p.reportDeadline || "",
  };

  const paperSizes: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
  };
  const paper = paperSizes[t.paperSize] ?? paperSizes.A4;
  const pw = t.orientation === "portrait" ? paper.w : paper.h;
  const ph = t.orientation === "portrait" ? paper.h : paper.w;

  const colStyles = cols.map(c => c.width ? `width:${c.width}px;` : "").join("\n");

  const remarksRows = p.remarks.map((r, i) =>
    `<tr>${cols.map(c => `<td${isCentered(c.key) ? ' class="center"' : ""}>${getCellValue(c.key, r, i)}</td>`).join("")}</tr>`
  ).join("");

  const title = fillTemplate(t.title, vars);
  const subtitle = t.subtitle;
  const copiesText = fillTemplate(t.blockCopiesText, vars);
  const reportText = fillTemplate(t.blockReportText, vars);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "${t.fontFamily}", serif;
      font-size: ${t.fontSize}pt;
      color: #000;
      background: #fff;
      padding: ${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm;
    }

    .doc-header { text-align: center; margin-bottom: 6px; }
    .doc-title { font-size: ${t.fontSize + 2}pt; font-weight: bold; text-transform: uppercase; }
    .doc-subtitle { font-size: ${t.fontSize - 0.5}pt; font-weight: bold; margin-top: 3px; }
    .doc-date-right { text-align: right; font-size: ${t.fontSize - 1}pt; margin-top: 6px; margin-bottom: 10px; }

    .requisites { margin-bottom: 10px; font-size: ${t.fontSize - 0.5}pt; line-height: 1.7; }
    .requisites p { margin-bottom: 2px; }
    .requisites strong { font-weight: bold; }
    .underline-value {
      border-bottom: 1px solid #000;
      display: inline-block;
      min-width: 180px;
      padding: 0 4px;
      font-weight: bold;
    }

    .violations-title { font-size: ${t.fontSize}pt; font-weight: bold; margin: 10px 0 6px; }

    table.violations {
      width: 100%;
      border-collapse: collapse;
      font-size: ${t.fontSize - 1}pt;
      margin-bottom: 12px;
    }
    table.violations th, table.violations td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: top;
    }
    table.violations th {
      text-align: center;
      font-weight: bold;
      background: #fff;
      font-size: ${t.fontSize - 1.5}pt;
    }
    table.violations td.center { text-align: center; }

    .sig-inspector { display: flex; gap: 20px; align-items: flex-end; font-size: ${t.fontSize - 1}pt; margin-bottom: 16px; }
    .sig-inspector .field { flex: 1; border-bottom: 1px solid #000; min-height: 18px; }
    .sig-inspector .caption { font-size: 7.5pt; text-align: center; color: #444; white-space: nowrap; }
    .sig-inspector .right-val { text-align: right; }

    .copies-note { font-size: ${t.fontSize - 1}pt; line-height: 1.6; margin-bottom: 14px; }
    .copies-note .fill { border-bottom: 1px solid #000; display: inline-block; min-width: 140px; padding: 0 2px; }

    .sig-section { margin-top: 10px; font-size: ${t.fontSize - 0.5}pt; }
    .sig-row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 4px; }
    .sig-label { white-space: nowrap; font-weight: bold; min-width: 80px; }
    .sig-line { flex: 1; border-bottom: 1px solid #000; min-height: 18px; }
    .sig-caption { font-size: 7.5pt; text-align: center; color: #444; }
    .sig-parens { font-size: ${t.fontSize - 1}pt; white-space: nowrap; }

    .mt8 { margin-top: 8px; }
    .mt16 { margin-top: 16px; }

    @media print {
      body { padding: ${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm; }
      @page { size: ${pw}mm ${ph}mm; margin: 0; }
    }
  </style>
</head>
<body>

  <div class="doc-header">
    <div class="doc-title">${title}</div>
    <div class="doc-subtitle">${subtitle}</div>
  </div>
  <div class="doc-date-right">от ${p.date}</div>

  <div class="requisites">
    <p><strong>${t.blockObjectLabel}</strong> <span class="underline-value">${p.object}</span>.</p>
    <p><strong>${t.blockContractorLabel}</strong> <span class="underline-value">${p.contractor}</span></p>
    <p>${t.blockInspectorLabel} <span class="underline-value">${p.inspector || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>
      ${t.blockRepresentativeLabel} <span class="underline-value">${p.representative || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span></p>
    <div style="display:flex; gap:40px; font-size:8pt; color:#555; padding-left:120px; margin-top:1px;">
      <span>(Должность, ФИО представителя СОТ)</span>
      <span>(Наименование организации)</span>
    </div>
  </div>

  <div class="violations-title">${t.blockViolationsTitle}</div>

  <table class="violations">
    <colgroup>
      ${cols.map(c => `<col style="${c.width ? `width:${c.width}px;` : ""}">`).join("\n      ")}
    </colgroup>
    <thead>
      <tr>
        ${cols.map(c => `<th>${c.label}</th>`).join("\n        ")}
      </tr>
    </thead>
    <tbody>
      ${remarksRows}
      <tr>${cols.map(() => "<td>&nbsp;</td>").join("")}</tr>
    </tbody>
  </table>

  <div class="sig-inspector">
    <div>
      <div class="field">${p.responsible || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</div>
      <div class="caption">(Должность наименование организации представителя СОТ</div>
    </div>
    <div style="min-width:60px;">
      <div class="field">&nbsp;</div>
      <div class="caption">подпись</div>
    </div>
    <div style="text-align:right;">
      <div class="field right-val">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      <div class="caption">Фамилия И.О.</div>
    </div>
  </div>

  <div class="copies-note">
    ${copiesText.replace("{{contractor}}", `<span class="fill">${p.contractor}</span>`)}
  </div>
  <div class="copies-note">
    ${reportText}
  </div>

  <div class="sig-section">
    <p class="mt8">Акт-предписание.</p>

    <div class="sig-row mt8">
      <span class="sig-label">${t.sigIssuerLabel}</span>
      <div>
        <div class="sig-line" style="min-width:140px;">&nbsp;</div>
        <div class="sig-caption">Подпись</div>
      </div>
      <span class="sig-parens">(</span>
      <div>
        <div class="sig-line" style="min-width:160px;">&nbsp;</div>
        <div class="sig-caption">Фамилия, инициалы</div>
      </div>
      <span class="sig-parens">)</span>
      <div>
        <div class="sig-line" style="min-width:100px;">&nbsp;</div>
        <div class="sig-caption">Дата</div>
      </div>
    </div>

    <div class="sig-row mt16">
      <div style="min-width:130px; font-size:10pt; line-height:1.4;">${t.sigReceiverLabel}</div>
      <div>
        <div class="sig-line" style="min-width:110px;">&nbsp;</div>
        <div class="sig-caption">Должность</div>
      </div>
      <div>
        <div class="sig-line" style="min-width:110px;">&nbsp;</div>
        <div class="sig-caption">Подпись</div>
      </div>
      <span class="sig-parens">(</span>
      <div>
        <div class="sig-line" style="min-width:140px;">&nbsp;</div>
        <div class="sig-caption">Фамилия, инициалы</div>
      </div>
      <span class="sig-parens">)</span>
      <div>
        <div class="sig-line" style="min-width:90px;">&nbsp;</div>
        <div class="sig-caption">Дата</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
