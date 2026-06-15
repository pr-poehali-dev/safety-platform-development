interface Remark {
  id: string;
  description: string;
  normRef: string;
  deadline: string;
  status: string;
}

interface Prescription {
  number: string;
  date: string;
  object: string;
  contractor: string;
  responsible?: string;
  reportDeadline?: string;
  remarks: Remark[];
}

// jsPDF не поддерживает кириллицу без шрифта — используем браузерный print
export function printPrescription(p: Prescription) {
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      "Выдано": "Выдано",
      "Устранено": "Устранено",
      "Просрочено": "Просрочено",
      "Черновик": "Черновик",
    };
    return map[s] ?? s;
  };

  const remarksRows = p.remarks
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.description}</td>
        <td>${r.normRef || "—"}</td>
        <td>${r.deadline || "—"}</td>
        <td>${statusLabel(r.status)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Предписание ${p.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; padding: 20mm 20mm 20mm 25mm; }
    h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 6mm; letter-spacing: 0.5px; }
    .subtitle { text-align: center; font-size: 11pt; color: #333; margin-bottom: 8mm; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; margin-bottom: 8mm; border: 1px solid #ccc; padding: 5mm; border-radius: 3px; }
    .meta-item label { font-size: 9pt; color: #666; display: block; }
    .meta-item span { font-size: 11pt; font-weight: 600; }
    h2 { font-size: 12pt; font-weight: bold; margin-bottom: 4mm; border-bottom: 1px solid #000; padding-bottom: 1mm; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; font-size: 10pt; }
    th { background: #f0f0f0; border: 1px solid #bbb; padding: 2mm 3mm; text-align: left; font-size: 9pt; }
    td { border: 1px solid #ccc; padding: 2mm 3mm; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 12mm; }
    .sig-block { border-top: 1px solid #000; padding-top: 2mm; font-size: 10pt; }
    .sig-block .role { font-size: 9pt; color: #555; }
    .footer { margin-top: 10mm; font-size: 9pt; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 3mm; }
    @media print {
      @page { size: A4; margin: 15mm 15mm 15mm 20mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>ПРЕДПИСАНИЕ № ${p.number}</h1>
  <p class="subtitle">по охране труда и промышленной безопасности</p>

  <div class="meta">
    <div class="meta-item"><label>Дата выдачи</label><span>${p.date}</span></div>
    <div class="meta-item"><label>Объект</label><span>${p.object}</span></div>
    <div class="meta-item"><label>Подрядная организация</label><span>${p.contractor}</span></div>
    ${p.responsible ? `<div class="meta-item"><label>Ответственный представитель</label><span>${p.responsible}</span></div>` : ""}
    ${p.reportDeadline ? `<div class="meta-item"><label>Срок предоставления отчёта</label><span>${p.reportDeadline}</span></div>` : ""}
  </div>

  <h2>Выявленные нарушения и замечания</h2>
  <table>
    <thead>
      <tr>
        <th style="width:4%">№</th>
        <th style="width:44%">Описание нарушения</th>
        <th style="width:20%">Нормативный документ</th>
        <th style="width:14%">Срок устранения</th>
        <th style="width:14%">Статус</th>
      </tr>
    </thead>
    <tbody>${remarksRows}</tbody>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <p class="role">Выдал предписание (Специалист ОТ)</p>
      <br/>
      <p>_________________ /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</p>
      <p style="font-size:9pt;color:#888">подпись &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; расшифровка</p>
    </div>
    <div class="sig-block">
      <p class="role">Получил (Ответственный подрядчика)</p>
      <br/>
      <p>_________________ /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</p>
      <p style="font-size:9pt;color:#888">подпись &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; расшифровка</p>
    </div>
  </div>

  <div class="footer">Документ сформирован системой «Охрана Труда Онлайн» · ${new Date().toLocaleDateString("ru-RU")}</div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}