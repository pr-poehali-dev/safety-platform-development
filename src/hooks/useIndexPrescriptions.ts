import { useState, useEffect } from "react";
import { AppUser } from "@/lib/auth";
import { Template, DEFAULT_TEMPLATE } from "@/lib/template";
import { Prescription, Status } from "@/lib/prescriptionTypes";

const API = "https://functions.poehali.dev/72e22ece-f829-4b90-9dee-a6df60027d69";
const TEMPLATES_API = "https://functions.poehali.dev/41ec60df-3f38-4561-ba9d-ca17ebd71553";
const USERS_URL = "https://functions.poehali.dev/9f213d27-a6a3-4ce0-b6b1-0d26003c43eb";

export function useIndexPrescriptions(user: AppUser) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template>({ ...DEFAULT_TEMPLATE, id: "default", name: "По умолчанию", isDefault: true });
  const [availableUsers, setAvailableUsers] = useState<{ login: string; name: string; role: string }[]>([]);
  const [prescriptionOpenId, setPrescriptionOpenId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API}?full=1`)
      .then(r => r.json())
      .then(data => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setPrescriptions([]));
  }, []);

  useEffect(() => {
    if (prescriptionOpenId && prescriptions.length > 0) {
      const found = prescriptions.find(p => p.id === prescriptionOpenId);
      if (found) setSelected(found);
    }
  }, [prescriptionOpenId, prescriptions]);

  useEffect(() => {
    fetch(`${TEMPLATES_API}?type=prescription`)
      .then(r => r.json())
      .then((data: Template[]) => {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const def = parsed.find((t: Template) => t.isDefault) ?? parsed[0];
        if (def) setActiveTemplate(def);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(USERS_URL)
      .then(r => r.json())
      .then((data: { login: string; name: string; role: string }[]) => {
        setAvailableUsers(data.filter(u => u.login !== user.login));
      })
      .catch(() => {});
  }, [user.login]);

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

  const changePrescriptionStatus = (p: Prescription, status: Status) => {
    if (status === "Черновик") {
      setEditingPrescription(p);
      return;
    }
    const updated = { ...p, remarks: p.remarks.map(r => ({ ...r, status })) };
    updatePrescription(updated);
  };

  return {
    prescriptions,
    showAdd,
    setShowAdd,
    editingPrescription,
    setEditingPrescription,
    selected,
    setSelected,
    activeTemplate,
    availableUsers,
    prescriptionOpenId,
    setPrescriptionOpenId,
    addPrescription,
    updatePrescription,
    changePrescriptionStatus,
  };
}
