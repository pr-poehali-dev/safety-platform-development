export const API = "https://functions.poehali.dev/b2222d00-a1b0-43fd-966d-3f39732867c3";
export const CATEGORIES_API = "https://functions.poehali.dev/ea358d23-fa1e-4907-88c0-87cd78732293";
export const OBJECTS_API = "https://functions.poehali.dev/644a7c32-2a01-4964-b2c3-cc4af7bfd839";
export const CONTRACTORS_API = "https://functions.poehali.dev/95247612-816e-4c39-b2d8-ef7bc1d23b4b";

export interface Inspection {
  id: number;
  inspection_date: string;
  contractor: string;
  violation_type: string;
  object_name: string;
  remarks_count: number;
  works_suspended: boolean;
  inspector_name: string;
  note: string | null;
  created_by: string;
}

export interface InspectionFormData {
  inspection_date: string;
  contractor: string;
  violation_type: string;
  object_name: string;
  remarks_count: number;
  works_suspended: boolean;
  note: string;
}

export interface ContractorItem {
  name: string;
  contracts: { id: number; contract_number: string }[];
}

export const emptyForm = (): InspectionFormData => ({
  inspection_date: new Date().toISOString().slice(0, 10),
  contractor: "",
  violation_type: "",
  object_name: "",
  remarks_count: 0,
  works_suspended: false,
  note: "",
});

export const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";
export const lbl = "text-xs font-medium text-muted-foreground block mb-1";
