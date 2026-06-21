import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { recordId } from "@/lib/format";
import { deleteFileAction } from "@/server/actions/files";

type GalleryFile = {
  id: unknown;
  name?: string;
  mimeType?: string;
  size?: number;
  kind?: string;
  createdAt?: string;
};

const isImage = (mimeType?: string) => String(mimeType ?? "").startsWith("image/");

export function FileGallery({
  files,
  canManage,
  returnPath,
}: {
  files: GalleryFile[];
  canManage?: boolean;
  returnPath: string;
}) {
  if (!files.length) return <p>Вкладення ще не додано.</p>;
  return (
    <div className="file-gallery">
      {files.map((file) => {
        const id = recordId(file.id);
        const fullUrl = `/api/files/${encodeURIComponent(id)}/full`;
        const previewUrl = `/api/files/${encodeURIComponent(id)}/preview`;
        const title = String(file.name ?? "Вкладення");
        return (
          <article className="file-card" key={id}>
            <Dialog label="Переглянути" title={title} icon={false} triggerClassName="file-card-preview">
              <div className="file-viewer">
                {isImage(file.mimeType) ? <img src={fullUrl} alt={title} /> : <p>Цей файл відкривається в окремій вкладці.</p>}
                <Link className="button button-primary" href={fullUrl} target="_blank">Відкрити повний файл</Link>
              </div>
            </Dialog>
            <div className="file-card-thumb" aria-hidden="true">
              {isImage(file.mimeType) ? <img src={previewUrl} alt="" /> : <b>PDF</b>}
            </div>
            <div className="file-card-copy">
              <strong>{title}</strong>
              <span>{String(file.mimeType ?? "Файл")} · {Number(file.size ?? 0).toLocaleString("uk-UA")} байт</span>
            </div>
            <div className="file-card-actions">
              <Link href={fullUrl} target="_blank">Відкрити</Link>
              {canManage && (
                <form action={deleteFileAction}>
                  <input type="hidden" name="fileId" value={id} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <ConfirmSubmit label="Видалити" title="Видалити вкладення?" description={`Файл «${title}» буде прибрано з цієї картки.`} confirmLabel="Так, видалити" tone="danger" />
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
