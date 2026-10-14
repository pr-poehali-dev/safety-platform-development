import { Remark, Prescription } from "@/lib/prescriptionTypes";
import { FormState } from "./GeneralInfoSection";

export const MAX_REMARKS = 100;

export const REMARK_FIELDS: (keyof Remark)[] = [
  "place", "category", "description", "normRef", "deadline", "status", "photos",
  "work_suspended", "suspension_act_drawn", "suspension_act_number",
];
export const FORM_FIELDS = ["object", "contractor", "contractNumber", "representative", "replyEmail", "reportDeadline"] as const;
export const FORM_FIELD_LABELS: Record<string, string> = {
  object: "Объект", contractor: "Подрядчик", contractNumber: "Номер договора",
  representative: "Представитель", replyEmail: "Почта для ответа", reportDeadline: "Срок отчёта",
};

export const sameVal = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

export const toFormState = (p: Prescription): FormState => ({
  object: p.object,
  contractor: p.contractor,
  contractNumber: p.contractNumber || "",
  representative: p.representative || "",
  representativeEnabled: !!p.representative,
  replyEmail: p.replyEmail,
  reportDeadline: p.reportDeadline,
  remarks: p.remarks.map(r => ({ ...r })),
});

export type Highlight = { kind: "changed" | "added" | "conflict" | "removed"; fields: string[]; server?: Remark };

export function mergeWithServer(base: FormState, mine: FormState, fresh: FormState) {
  const highlights: Record<string, Highlight> = {};
  const generalNotes: string[] = [];
  const merged: FormState = { ...mine };

  for (const key of FORM_FIELDS) {
    const serverChanged = !sameVal(base[key], fresh[key]);
    const iChanged = !sameVal(base[key], mine[key]);
    if (serverChanged && !iChanged) {
      merged[key] = fresh[key];
      generalNotes.push(`${FORM_FIELD_LABELS[key]}: обновлено с сервера`);
    } else if (serverChanged && iChanged && !sameVal(mine[key], fresh[key])) {
      generalNotes.push(`${FORM_FIELD_LABELS[key]}: оставлена ваша версия (на сервере другое значение: «${fresh[key] || "—"}»)`);
    }
  }
  merged.representativeEnabled = !!merged.representative || mine.representativeEnabled;

  const baseById = new Map(base.remarks.map(r => [r.id, r]));
  const mineById = new Map(mine.remarks.map(r => [r.id, r]));
  const freshById = new Map(fresh.remarks.map(r => [r.id, r]));
  const result: Remark[] = [];

  for (const mr of mine.remarks) {
    const br = baseById.get(mr.id);
    const fr = freshById.get(mr.id);
    if (!br) { result.push(mr); continue; }
    if (!fr) {
      const iEdited = REMARK_FIELDS.some(f => !sameVal(br[f], mr[f]));
      if (iEdited) {
        highlights[mr.id] = { kind: "removed", fields: [] };
        result.push(mr);
      } else {
        highlights[mr.id] = { kind: "removed", fields: [] };
      }
      continue;
    }
    const out: Remark = { ...mr };
    const serverFields: string[] = [];
    const conflictFields: string[] = [];
    for (const f of REMARK_FIELDS) {
      const sc = !sameVal(br[f], fr[f]);
      if (!sc) continue;
      const ic = !sameVal(br[f], mr[f]);
      if (!ic) {
        (out as unknown as Record<string, unknown>)[f] = fr[f];
        serverFields.push(f);
      } else if (!sameVal(mr[f], fr[f])) {
        conflictFields.push(f);
      }
    }
    if (conflictFields.length) highlights[mr.id] = { kind: "conflict", fields: [...serverFields, ...conflictFields], server: { ...fr } };
    else if (serverFields.length) highlights[mr.id] = { kind: "changed", fields: serverFields };
    result.push(out);
  }

  for (const fr of fresh.remarks) {
    if (!baseById.has(fr.id) && !mineById.has(fr.id)) {
      result.push({ ...fr });
      highlights[fr.id] = { kind: "added", fields: [] };
    }
  }

  const removedNotes = base.remarks.filter(r => !freshById.has(r.id) && mineById.has(r.id) === false).length;
  merged.remarks = result.length ? result : mine.remarks;
  return { merged, highlights, generalNotes, removedByServer: removedNotes };
}
