import { z } from "zod";

const text = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message);
const amount = (message: string) => z.preprocess((value) => value === "" || value == null ? undefined : value, z.coerce.number({ required_error: message, invalid_type_error: message }).min(0, "Вартість не може бути від’ємною."));

export const equipmentSchema = z.object({
  name: text("Вкажіть назву обладнання.").min(2, "Назва має містити щонайменше 2 символи."),
  categoryId: text("Оберіть категорію."),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  price: amount("Вкажіть вартість."),
  acquisitionDate: text("Вкажіть дату надходження."),
  condition: z.enum(["new", "good", "satisfactory", "needs_repair", "damaged", "unusable"], { required_error: "Оберіть типовий стан обладнання.", invalid_type_error: "Оберіть типовий стан обладнання." }).default("good"),
});

export const equipmentInstanceSchema = z.object({
  equipmentId: text("Оберіть картку обладнання.").regex(/^equipment:[A-Za-z0-9_-]+$/, "Некоректна картка обладнання."),
  inventoryNumber: text("Вкажіть інвентарний номер екземпляра.").min(2, "Інвентарний номер має містити щонайменше 2 символи."),
  serialNumber: text("Вкажіть серійний номер екземпляра.").min(2, "Серійний номер має містити щонайменше 2 символи.").max(120),
  roomId: text("Оберіть приміщення екземпляра."),
  responsibleId: text("Оберіть відповідальну особу."),
  status: z.enum(["active", "in_storage", "in_repair", "lost", "written_off", "archived"], { required_error: "Оберіть обліковий стан екземпляра.", invalid_type_error: "Оберіть обліковий стан екземпляра." }).default("active"),
  condition: z.enum(["new", "good", "satisfactory", "needs_repair", "damaged", "unusable"], { required_error: "Оберіть стан обладнання.", invalid_type_error: "Оберіть стан обладнання." }),
  price: amount("Вкажіть вартість екземпляра."),
  acquisitionDate: text("Вкажіть дату надходження екземпляра."),
});

export const equipmentInstanceUpdateSchema = equipmentInstanceSchema.extend({
  instanceId: text("Не вказано екземпляр обладнання.").regex(/^equipment_instance:[A-Za-z0-9_-]+$/, "Некоректний екземпляр обладнання."),
});
