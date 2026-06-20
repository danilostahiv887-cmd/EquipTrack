import { z } from "zod";

export const roomSchema = z.object({
  number: z.string().trim().min(1, "Вкажіть номер приміщення."),
  buildingId: z.string().min(1, "Оберіть корпус."),
  roomTypeId: z.string().min(1, "Оберіть тип приміщення."),
  responsibleId: z.string().optional(),
  floor: z.coerce.number().int().min(0, "Поверх не може бути від’ємним."),
  capacity: z.coerce.number().int().min(0, "Місткість не може бути від’ємною."),
  status: z.enum(["active", "inactive", "under_repair"]),
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});
