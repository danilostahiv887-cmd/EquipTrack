import sharp from "sharp";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedTypes = new Set([...imageTypes, "application/pdf"]);

export type PreparedFile = { name: string; mimeType: string; size: number; kind: "photo" | "document"; data: Uint8Array; previewData?: Uint8Array; width?: number; height?: number };

export async function prepareUpload(upload: File): Promise<PreparedFile> {
  if (!upload.type || !allowedTypes.has(upload.type)) throw new Error("Дозволено завантажувати лише JPEG, PNG, WebP або PDF.");
  if (upload.size <= 0) throw new Error("Вибраний файл порожній.");
  if (upload.size > MAX_FILE_BYTES) throw new Error("Розмір файлу перевищує 3 МБ.");
  const input = Buffer.from(await upload.arrayBuffer());
  if (upload.type === "application/pdf") return { name: upload.name, mimeType: upload.type, size: input.length, kind: "document", data: new Uint8Array(input) };
  const original = await sharp(input).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const preview = await sharp(original.data).resize({ width: 520, height: 390, fit: "cover" }).webp({ quality: 74 }).toBuffer();
  return { name: upload.name.replace(/\.[^.]+$/, ".webp"), mimeType: "image/webp", size: original.data.length, kind: "photo", data: new Uint8Array(original.data), previewData: new Uint8Array(preview), width: original.info.width, height: original.info.height };
}
