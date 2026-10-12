export type Tab = "dashboard" | "prescriptions" | "inspections" | "incidents" | "tasks" | "headcount" | "fines" | "suspensions";

export interface Fine {
  id: number;
  period_date: string;
  contractor: string;
  contract_number: string | null;
  act_number: string | null;
  amount_issued: number;
  amount_paid: number | null;
  amount_proactive: number | null;
  status: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface ContractorContract {
  id: number;
  contract_number: string;
}

export interface ContractorItem {
  name: string;
  contracts: ContractorContract[];
}

export const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
export const lbl = "text-xs font-medium text-muted-foreground block mb-1";
export const fmt = (n: number) => n.toLocaleString("ru-RU");

export function emptyForm() {
  return {
    period_date: new Date().toISOString().slice(0, 10),
    contractor: "",
    contract_number: "",
    act_numbers: [] as string[],
    amount_issued: "",
    amount_paid: "",
    amount_proactive: "",
    status: "",
  };
}

export type FormState = ReturnType<typeof emptyForm>;
