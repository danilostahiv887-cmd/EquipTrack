import { z } from "zod";

export const equipmentSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть назву обладнання."),
  inventoryNumber: z.string().trim().min(2, "Вкажіть інвентарний номер."),
  categoryId: z.string().min(1, "Оберіть категорію."),
  roomId: z.string().min(1, "Оберіть початкове приміщення."),
  responsibleId: z.string().min(1, "Оберіть відповідальну особу."),
  serialNumber: z.string().trim().max(120).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  price: z.coerce.number().min(0, "Вартість не може бути від’ємною."),
  acquisitionDate: z.string().min(1, "Вкажіть дату надходження."),
  condition: z.enum(["new", "good", "satisfactory", "needs_repair", "damaged", "unusable"]),
});
