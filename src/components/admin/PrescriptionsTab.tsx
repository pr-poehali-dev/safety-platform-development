import { useState } from "react";
import { AppUser } from "@/lib/auth";
import { Prescription } from "./prescriptions/types";
import { PrescriptionEditModal } from "./prescriptions/PrescriptionEditModal";
import { PrescriptionsTable } from "./prescriptions/PrescriptionsTable";
import { ExportImportToolbar } from "./prescriptions/ExportImportToolbar";

const PRESCRIPTIONS_API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

// --- Вкладка предписаний ---
export function PrescriptionsTab({ currentUser }: { currentUser?: AppUser }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pSearch, setPSearch] = useState("");
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);

  // Загружаем при первом монтировании (вкладка активна)
  useState(() => {
    setPLoading(true);
    fetch(PRESCRIPTIONS_API).then(r => r.json()).then(data => { setPrescriptions(data); }).finally(() => setPLoading(false));
  });

  const reloadPrescriptions = () => {
    setPLoading(true);
    fetch(PRESCRIPTIONS_API).then(r => r.json()).then(data => setPrescriptions(data)).finally(() => setPLoading(false));
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!pSearch.trim()) return true;
    const q = pSearch.toLowerCase();
    return p.number.toLowerCase().includes(q) || p.object.toLowerCase().includes(q) || p.contractor.toLowerCase().includes(q);
  });

  const handleDeletePrescription = async (id: string) => {
    await fetch(PRESCRIPTIONS_API, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };

  const handleSavePrescription = async (p: Prescription) => {
    await fetch(PRESCRIPTIONS_API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    setPrescriptions(prev => prev.map(x => x.id === p.id ? p : x));
    setEditPrescription(null);
  };

  return (
    <>
      <ExportImportToolbar
        prescriptions={prescriptions}
        pLoading={pLoading}
        pSearch={pSearch}
        setPSearch={setPSearch}
        filteredPrescriptions={filteredPrescriptions}
        currentUser={currentUser}
        reloadPrescriptions={reloadPrescriptions}
      />

      <PrescriptionsTable
        prescriptions={filteredPrescriptions}
        loading={pLoading}
        onEdit={setEditPrescription}
        onDelete={handleDeletePrescription}
      />

      {/* Редактирование предписания */}
      {editPrescription && (
        <PrescriptionEditModal
          prescription={editPrescription}
          onClose={() => setEditPrescription(null)}
          onSave={handleSavePrescription}
        />
      )}
    </>
  );
}
