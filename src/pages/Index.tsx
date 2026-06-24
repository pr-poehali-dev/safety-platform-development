import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import { Prescription, overallStatus } from "@/lib/prescriptionTypes";
import { AddForm } from "@/components/prescriptions/PrescriptionForm";
import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";
import Inspections from "@/pages/Inspections";

interface IndexProps {
  user: AppUser;
  onLogout: () => void;
}

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";

export default function Index({ user, onLogout }: IndexProps) {
  const [tab, setTab] = useState<"prescriptions" | "inspections">("prescriptions");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Все");
  const [search, setSearch] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(data => setPrescriptions(data))
      .catch(() => setPrescriptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API}?type=templates`)
      .then(r => r.json())
      .then((data: Template[]) => {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const def = parsed.find((t: Template) => t.isDefault) ?? parsed[0];
        if (def) setActiveTemplate(def);
      })
      .catch(() => {});
  }, []);

  const isContractor = user.role === "contractor";
  const canEdit = user.role === "admin" || user.role === "specialist";

  const addPrescription = async (p: Prescription) => {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const data = await res.json();
    const saved = { ...p, number: data.number ?? p.number };
    setPrescriptions(prev => [saved, ...prev]);
  };

  const updatePrescription = async (updated: Prescription) => {
    await fetch(API, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setPrescriptions(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelected(updated);
  };

  if (tab === "inspections") {
    return (
      <Inspections
        user={user}
        onLogout={onLogout}
        onBack={() => setTab("prescriptions")}
      />
    );
  }

  return (
    <>
      <PrescriptionList
        user={user}
        onLogout={onLogout}
        prescriptions={prescriptions}
        loading={loading}
        search={search}
        filterStatus={filterStatus}
        canEdit={canEdit}
        isContractor={isContractor}
        activeTemplate={activeTemplate}
        onSearchChange={setSearch}
        onFilterChange={setFilterStatus}
        onSelect={setSelected}
        onAddClick={() => setShowAdd(true)}
        onInspectionsClick={canEdit ? () => setTab("inspections") : undefined}
      />

      {showAdd && canEdit && (
        <AddForm onClose={() => setShowAdd(false)} onSave={addPrescription} user={user} />
      )}

      {selected && (
        <PrescriptionDetail
          prescription={selected}
          onClose={() => setSelected(null)}
          onUpdate={updatePrescription}
          user={user}
          canEdit={
            user.role === "admin" ||
            (user.role === "specialist" && selected.createdBy === user.login)
          }
          template={activeTemplate}
        />
      )}
    </>
  );
}