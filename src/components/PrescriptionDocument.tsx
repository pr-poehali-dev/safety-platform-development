import React from "react";
import { Template } from "@/lib/template";

interface Remark {
  id: string;
  place: string;
  description: string;
  normRef: string;
  deadline: string;
  status: string;
}

export interface PrescriptionData {
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
  comments?: unknown[];
}

function fill(text: string, vars: Record<string, string>): string {
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

const CENTERED_KEYS = new Set(["num", "place", "deadline", "status"]);

interface Props {
  template: Template;
  prescription: PrescriptionData;
  forPrint?: boolean;
}

export default function PrescriptionDocument({ template: t, prescription: p, forPrint }: Props) {
  const cols = t.tableColumns.filter(c => c.enabled);

  const vars: Record<string, string> = {
    number: p.number,
    contractor: p.contractor,
    companyName: t.companyName,
    replyEmail: p.replyEmail || "",
    reportDeadline: p.reportDeadline || "",
  };

  const title = fill(t.title, vars);

  const fieldLine: React.CSSProperties = {
    borderBottom: "1px solid #000",
    display: "inline-block",
    padding: "0 4px",
    fontWeight: "bold",
    minWidth: 120,
  };

  const sigLine: React.CSSProperties = {
    flex: 1,
    borderBottom: "1px solid #000",
    minWidth: 80,
    minHeight: 18,
  };

  const paperSizes: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
  };
  const paper = paperSizes[t.paperSize] ?? paperSizes.A4;
  const paperW = t.orientation === "portrait" ? paper.w : paper.h;
  const paperH = t.orientation === "portrait" ? paper.h : paper.w;
  const px = (mm: number) => Math.round(mm * 96 / 25.4);

  const pageStyle: React.CSSProperties = forPrint ? {
    width: `${paperW}mm`,
    minHeight: `${paperH}mm`,
    padding: `${t.marginTop}mm ${t.marginRight}mm ${t.marginBottom}mm ${t.marginLeft}mm`,
    boxSizing: "border-box",
    fontFamily: `'${t.fontFamily}', Times, serif`,
    fontSize: `${t.fontSize}pt`,
    color: "#000",
    background: "#fff",
    lineHeight: 1.5,
  } : {
    padding: `${px(t.marginTop)}px ${px(t.marginRight)}px ${px(t.marginBottom)}px ${px(t.marginLeft)}px`,
    boxSizing: "border-box",
    fontFamily: `'${t.fontFamily}', Times, serif`,
    fontSize: `${t.fontSize}pt`,
    color: "#000",
    lineHeight: 1.5,
    width: "100%",
    height: "100%",
  };

  return (
    <div style={pageStyle}>
      {/* Заголовок */}
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: `${t.fontSize + 2}pt` }}>
          {title}
        </div>
        <div style={{ fontWeight: "bold", fontSize: `${t.fontSize - 0.5}pt`, marginTop: 3 }}>
          {t.subtitle}
        </div>
      </div>

      <div style={{ textAlign: "right", fontSize: `${t.fontSize - 1}pt`, marginTop: 6, marginBottom: 10 }}>
        от {p.date}
      </div>

      {/* Реквизиты */}
      <div style={{ fontSize: `${t.fontSize - 0.5}pt`, lineHeight: 1.7, marginBottom: 10 }}>
        <p>
          <strong>{t.blockObjectLabel}</strong>{" "}
          <span style={fieldLine}>{p.object}</span>.
        </p>
        <p style={{ marginTop: 2 }}>
          <strong>{t.blockContractorLabel}</strong>{" "}
          <span style={fieldLine}>{p.contractor}</span>
        </p>
        <p style={{ marginTop: 2 }}>
          {t.blockInspectorLabel}{" "}
          <span style={fieldLine}>{p.inspector || "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}</span>
          {" "}{t.blockRepresentativeLabel}{" "}
          <span style={fieldLine}>{p.representative || "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}</span>
        </p>
        <div style={{ display: "flex", gap: 40, fontSize: "8pt", color: "#555", paddingLeft: 120, marginTop: 1 }}>
          <span>(Должность, ФИО представителя СОТ)</span>
          <span>(Наименование организации)</span>
        </div>
      </div>

      {/* Заголовок таблицы */}
      <p style={{ fontWeight: "bold", margin: "10px 0 6px", fontSize: `${t.fontSize}pt` }}>
        {t.blockViolationsTitle}
      </p>

      {/* Таблица нарушений */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: `${t.fontSize - 1}pt` }}>
        <colgroup>
          {cols.map(col => (
            <col key={col.key} style={col.width ? { width: `${col.width}px` } : {}} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col.key} style={{
                border: "1px solid #000",
                padding: "5px 6px",
                fontWeight: "bold",
                textAlign: "center",
                fontSize: `${t.fontSize - 1.5}pt`,
                background: "#fff",
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.remarks.map((r, i) => (
            <tr key={r.id}>
              {cols.map(col => (
                <td key={col.key} style={{
                  border: "1px solid #000",
                  padding: "4px 6px",
                  verticalAlign: "top",
                  textAlign: CENTERED_KEYS.has(col.key) ? "center" : "left",
                }}>
                  {getCellValue(col.key, r, i)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            {cols.map(col => (
              <td key={col.key} style={{ border: "1px solid #000", padding: "18px 6px" }}>&nbsp;</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Подпись инспектора */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", fontSize: `${t.fontSize - 1}pt`, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: "1px solid #000", minHeight: 18 }}>{p.responsible || "\u00a0"}</div>
          <div style={{ fontSize: "7.5pt", color: "#444", textAlign: "center" }}>(Должность наименование организации представителя СОТ)</div>
        </div>
        <div style={{ minWidth: 60 }}>
          <div style={{ borderBottom: "1px solid #000", minHeight: 18 }}>&nbsp;</div>
          <div style={{ fontSize: "7.5pt", color: "#444", textAlign: "center" }}>подпись</div>
        </div>
        <div>
          <div style={{ borderBottom: "1px solid #000", minWidth: 120, minHeight: 18 }}>&nbsp;</div>
          <div style={{ fontSize: "7.5pt", color: "#444" }}>Фамилия И.О.</div>
        </div>
      </div>

      {/* Тексты */}
      <div style={{ fontSize: `${t.fontSize - 1}pt`, lineHeight: 1.6, marginBottom: 14 }}>
        <p>{fill(t.blockCopiesText, vars)}</p>
        <p style={{ marginTop: 6 }}>{fill(t.blockReportText, vars)}</p>
      </div>

      {/* Подписи */}
      <div style={{ marginTop: 10, fontSize: `${t.fontSize - 0.5}pt` }}>
        <p style={{ marginTop: 8 }}>Акт-предписание.</p>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 4, marginTop: 8 }}>
          <strong style={{ whiteSpace: "nowrap" }}>{t.sigIssuerLabel}</strong>
          <div style={sigLine} />
          <span>(</span>
          <div style={sigLine} />
          <span>)</span>
          <div style={sigLine} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
          <span style={{ fontSize: `${t.fontSize - 1}pt`, minWidth: 130, lineHeight: 1.4 }}>
            {t.sigReceiverLabel}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={sigLine} />
              <div style={sigLine} />
              <span>(</span>
              <div style={sigLine} />
              <span>)</span>
              <div style={sigLine} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}