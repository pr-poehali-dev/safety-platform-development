export interface TemplateColumn {
  key: string;
  label: string;
  width: number | null;
  enabled: boolean;
}

export interface Template {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  companyName: string;
  tableColumns: TemplateColumn[];
  blockObjectLabel: string;
  blockContractorLabel: string;
  blockInspectorLabel: string;
  blockRepresentativeLabel: string;
  blockViolationsTitle: string;
  blockCopiesText: string;
  blockReportText: string;
  fontSize: number;
  fontFamily: string;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  sigIssuerLabel: string;
  sigReceiverLabel: string;
  isDefault: boolean;
  paperSize: "A4" | "A3";
  orientation: "portrait" | "landscape";
  content?: string;
}

export const DEFAULT_TEMPLATE: Omit<Template, "id" | "name" | "isDefault"> = {
  title: "АКТ-ПРЕДПИСАНИЕ № {{number}}",
  subtitle: "о нарушении требований охраны труда, пожарной, промышленной безопасности и экологии",
  companyName: "СБД",
  tableColumns: [
    { key: "num",         label: "№ п/п",                                              width: 28,   enabled: true },
    { key: "place",       label: "Место нарушения",                                    width: 70,   enabled: true },
    { key: "description", label: "Описание нарушения / Фото нарушения (при наличии)", width: null, enabled: true },
    { key: "normRef",     label: "Нарушен пункт НПА/ЛНА",                             width: 160,  enabled: true },
    { key: "deadline",    label: "Срок устранения",                                    width: 90,   enabled: true },
  ],
  blockObjectLabel: "Проверяемый объект:",
  blockContractorLabel: "Работы проводит подрядная организация:",
  blockInspectorLabel: "Проверка проведена",
  blockRepresentativeLabel: "в присутствии представителя подрядной организации",
  blockViolationsTitle: "В ходе проверки выявлены следующие нарушения:",
  blockCopiesText: "Акт составлен в 2-х экземплярах. 1 экз. Акта остается у Заказчика ООО «{{companyName}}», 2-й экземпляр Акта передается представителю {{contractor}}. Копия Акта направляется в адрес подрядной организации {{contractor}} по электронной почте.",
  blockReportText: "Отчет об устранении нарушений по данному Акту, направить в ООО «{{companyName}}» по электронной почте {{replyEmail}} не позднее {{reportDeadline}}.",
  fontSize: 11,
  fontFamily: "Times New Roman",
  marginTop: 15, marginRight: 15, marginBottom: 15, marginLeft: 20,
  sigIssuerLabel: "Выдал:",
  sigReceiverLabel: "С Актом ознакомлен, согласен и принял к исполнению:",
  paperSize: "A4",
  orientation: "portrait",
};