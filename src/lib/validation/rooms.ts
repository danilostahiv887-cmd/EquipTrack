import { z } from "zod";

const text = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message);
const integer = (message: string, minMessage: string) => z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number({ required_error: message, invalid_type_error: message }).int("Вкажіть ціле число.").min(0, minMessage));

export const roomSchema = z.object({
  number: text("Вкажіть номер приміщення."),
  buildingId: text("Оберіть корпус."),
  roomTypeId: text("Оберіть тип приміщення."),
  responsibleId: z.string().optional(),
  floor: integer("Вкажіть поверх.", "Поверх не може бути від’ємним."),
  capacity: integer("Вкажіть місткість.", "Місткість не може бути від’ємною."),
  status: z.enum(["active", "inactive", "under_repair"], { required_error: "Оберіть стан приміщення.", invalid_type_error: "Оберіть стан приміщення." }),
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});
