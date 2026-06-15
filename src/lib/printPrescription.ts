interface Remark {
  id: string;
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
  responsible: string;
  reportDeadline: string;
  remarks: Remark[];
}

export function printPrescription(p: Prescription): void {
  const remarksRows = p.remarks
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.description}</td>
        <td>${r.normRef || "—"}</td>
        <td>${r.deadline || "—"}</td>
        <td>${r.status}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Предписание ${p.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      padding: 20mm 20mm 20mm 25mm;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .number {
      font-size: 13pt;
      margin-top: 6px;
      font-weight: bold;
    }
    .meta {
      margin-bottom: 20px;
      border-collapse: collapse;
      width: 100%;
    }
    .meta td {
      padding: 4px 8px 4px 0;
      vertical-align: top;
      font-size: 11pt;
    }
    .meta td:first-child {
      color: #444;
      white-space: nowrap;
      width: 200px;
    }
    .meta td:last-child {
      font-weight: 600;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 8px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }
    table.remarks {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    table.remarks th {
      background: #f0f0f0;
      border: 1px solid #999;
      padding: 6px 8px;
      text-align: left;
      font-weight: bold;
    }
    table.remarks td {
      border: 1px solid #bbb;
      padding: 6px 8px;
      vertical-align: top;
    }
    table.remarks tr:nth-child(even) td {
      background: #fafafa;
    }
    .signatures {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .sig-block {
      flex: 1;
    }
    .sig-block .sig-label {
      font-size: 10pt;
      color: #555;
      margin-bottom: 24px;
    }
    .sig-line {
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
    }
    .sig-name {
      font-size: 9pt;
      color: #444;
      text-align: center;
    }
    .footer {
      margin-top: 20px;
      font-size: 9pt;
      color: #777;
      text-align: right;
    }
    @media print {
      body { padding: 15mm 15mm 15mm 20mm; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Предписание об устранении нарушений</h1>
    <div class="number">№ ${p.number}</div>
  </div>

  <table class="meta">
    <tr>
      <td>Дата выдачи:</td>
      <td>${p.date}</td>
    </tr>
    <tr>
      <td>Объект / место проверки:</td>
      <td>${p.object}</td>
    </tr>
    <tr>
      <td>Подрядная организация:</td>
      <td>${p.contractor}</td>
    </tr>
    <tr>
      <td>Ответственный:</td>
      <td>${p.responsible || "—"}</td>
    </tr>
    <tr>
      <td>Срок предоставления отчёта:</td>
      <td>${p.reportDeadline || "—"}</td>
    </tr>
  </table>

  <div class="section-title">Перечень нарушений и замечаний</div>

  <table class="remarks">
    <thead>
      <tr>
        <th style="width:32px">№</th>
        <th>Описание нарушения</th>
        <th style="width:160px">Нормативная база</th>
        <th style="width:100px">Срок устранения</th>
        <th style="width:90px">Статус</th>
      </tr>
    </thead>
    <tbody>
      ${remarksRows}
    </tbody>
  </table>

  <div class="section-title">Подписи</div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">Специалист по охране труда:</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-name">подпись / расшифровка</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Ответственный подрядчика:</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-name">подпись / расшифровка</div>
    </div>
  </div>

  <div class="footer">Сформировано: ${new Date().toLocaleString("ru-RU")} · Охрана Труда Онлайн</div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
