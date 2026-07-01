export const FONTS = [
  "Arial", "Calibri", "Times New Roman", "Georgia",
  "Courier New", "Verdana", "Tahoma", "Trebuchet MS",
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

export const PAPER_SIZES: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

export const MARGINS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
  "Обычные": { top: 20, right: 20, bottom: 20, left: 30 },
  "Узкие":   { top: 12, right: 12, bottom: 12, left: 12 },
  "Широкие": { top: 25, right: 50, bottom: 25, left: 50 },
};

export interface PageSettings {
  paperSize: string;
  orientation: "portrait" | "landscape";
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}
