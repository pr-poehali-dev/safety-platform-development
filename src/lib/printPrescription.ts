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

export function printPrescription(p: Prescription): void {
  const remarksRows = p.remarks
    .map(
      (r, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="center">${r.place || "—"}</td>
        <td>${r.description}</td>
        <td>${r.normRef || "—"}</td>
        <td class="center">${r.deadline || "—"}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>АКТ-ПРЕДПИСАНИЕ № ${p.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      padding: 15mm 15mm 15mm 20mm;
    }

    /* Заголовок */
    .doc-header {
      text-align: center;
      margin-bottom: 6px;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 10.5pt;
      font-weight: bold;
      margin-top: 3px;
    }
    .doc-date-right {
      text-align: right;
      font-size: 10pt;
      margin-top: 6px;
      margin-bottom: 10px;
    }

    /* Реквизиты */
    .requisites {
      margin-bottom: 10px;
      font-size: 10.5pt;
      line-height: 1.7;
    }
    .requisites p { margin-bottom: 2px; }
    .requisites strong { font-weight: bold; }
    .underline-value {
      border-bottom: 1px solid #000;
      display: inline-block;
      min-width: 180px;
      padding: 0 4px;
      font-weight: bold;
    }
    .inspector-row {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-top: 2px;
      font-size: 10pt;
    }
    .inspector-field {
      flex: 1;
      border-bottom: 1px solid #000;
      text-align: center;
    }
    .inspector-caption {
      font-size: 8pt;
      text-align: center;
      color: #555;
    }

    /* Секция "В ходе проверки" */
    .violations-title {
      font-size: 11pt;
      font-weight: bold;
      margin: 10px 0 6px;
    }

    /* Таблица нарушений */
    table.violations {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
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
      font-size: 9.5pt;
    }
    table.violations td.center {
      text-align: center;
    }
    .col-num   { width: 28px; }
    .col-place { width: 70px; }
    .col-desc  { }
    .col-norm  { width: 160px; }
    .col-dead  { width: 90px; }

    /* Блок под таблицей — подпись инспектора */
    .sig-inspector {
      display: flex;
      gap: 20px;
      align-items: flex-end;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    .sig-inspector .field {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 18px;
    }
    .sig-inspector .caption {
      font-size: 7.5pt;
      text-align: center;
      color: #444;
      white-space: nowrap;
    }
    .sig-inspector .right-val {
      text-align: right;
    }

    /* Блок с текстом об экземплярах */
    .copies-note {
      font-size: 10pt;
      line-height: 1.6;
      margin-bottom: 14px;
    }
    .copies-note .fill {
      border-bottom: 1px solid #000;
      display: inline-block;
      min-width: 140px;
      padding: 0 2px;
    }

    /* Блоки подписей */
    .sig-section { margin-top: 10px; font-size: 10.5pt; }
    .sig-row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      margin-bottom: 4px;
    }
    .sig-label { white-space: nowrap; font-weight: bold; min-width: 80px; }
    .sig-line {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 18px;
    }
    .sig-caption {
      font-size: 7.5pt;
      text-align: center;
      color: #444;
    }
    .sig-parens {
      font-size: 10pt;
      white-space: nowrap;
    }

    .mt8 { margin-top: 8px; }
    .mt16 { margin-top: 16px; }

    @media print {
      body { padding: 10mm 10mm 10mm 15mm; }
      @page { size: A4 portrait; margin: 0; }
    }
  </style>
</head>
<body>

  <div class="doc-header">
    <div class="doc-title">АКТ-ПРЕДПИСАНИЕ № ${p.number}</div>
    <div class="doc-subtitle">о нарушении требований охраны труда, пожарной, промышленной безопасности и экологии</div>
  </div>
  <div class="doc-date-right">от ${p.date}</div>

  <div class="requisites">
    <p><strong>Проверяемый объект:</strong> <span class="underline-value">${p.object}</span>.</p>
    <p><strong>Работы проводит подрядная организация:</strong> <span class="underline-value">${p.contractor}</span></p>
    <p>Проверка проведена <span class="underline-value">${p.inspector || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>
      в присутствии представителя подрядной организации <span class="underline-value">${p.representative || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span></p>
    <div style="display:flex; gap:40px; font-size:8pt; color:#555; padding-left:120px; margin-top:1px;">
      <span>(Должность, ФИО представителя СОТ)</span>
      <span>(Наименование организации)</span>
    </div>
  </div>

  <div class="violations-title">В ходе проверки выявлены следующие нарушения:</div>

  <table class="violations">
    <thead>
      <tr>
        <th class="col-num">№ п/п</th>
        <th class="col-place">Место нарушения</th>
        <th class="col-desc">Описание нарушения / Фото нарушения (при наличии)</th>
        <th class="col-norm">Нарушен пункт НПА/ЛНА</th>
        <th class="col-dead">Срок устранения</th>
      </tr>
    </thead>
    <tbody>
      ${remarksRows}
      <tr>
        <td class="center">&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
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
    Акт составлен в 2-х экземплярах. 1 экз. Акта остается у Заказчика ООО «СБД» , 2-й экземпляр Акта передается представителю
    <span class="fill">${p.contractor}</span>. Копия Акта направляется в адрес подрядной организации
    <span class="fill">${p.contractor}</span> по электронной почте.<br/>
    Отчет об устранении нарушений по данному Акту, направить в ООО «СБД» по электронной почте
    <span class="fill">${p.replyEmail || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>
    не позднее <span class="fill">${p.reportDeadline || "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</span>.
  </div>

  <div class="sig-section">
    <p class="mt8">Акт-предписание.</p>

    <div class="sig-row mt8">
      <span class="sig-label">Выдал:</span>
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
      <div style="min-width:130px; font-size:10pt; line-height:1.4;">
        С Актом ознакомлен, согласен и принял к исполнению:
      </div>
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

  const win = window.open("", "_blank", "width=960,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}