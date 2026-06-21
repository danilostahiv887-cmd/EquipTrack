"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const formatSize = (bytes: number) => {
  if (!bytes) return "0 байт";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024).toLocaleString("uk-UA")} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
};

const validateFile = (next: File | null) => {
  if (!next) return "";
  if (next.size <= 0) return "Вибраний файл порожній. Оберіть інший файл.";
  if (!ALLOWED_FILE_TYPES.has(next.type)) return "Дозволено завантажувати лише JPEG, PNG, WebP або PDF.";
  if (next.size > MAX_FILE_BYTES) return `Розмір файлу ${formatSize(next.size)}. Максимально дозволено 3 МБ.`;
  return "";
};

export function FileUpload({ name = "photo", label = "Фото або документ" }: { name?: string; label?: string }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const setSelectedFile = (next: File | null) => {
    const validationError = validateFile(next);
    setError(validationError);

    if (validationError) {
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
      return;
    }

    setFile(next);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return next?.type.startsWith("image/") ? URL.createObjectURL(next) : "";
    });
  };

  const syncDroppedFiles = (files: FileList) => {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    Array.from(files).slice(0, 1).forEach((entry) => transfer.items.add(entry));
    inputRef.current.files = transfer.files;
    setSelectedFile(transfer.files[0] ?? null);
  };

  return (
    <div className="file-upload">
      <div className="file-upload-title">{label}</div>
      <input
        ref={inputRef}
        id={inputId}
        className="file-upload-native"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "file-upload-dropzone",
          dragging && "file-upload-dropzone-active",
          error && "file-upload-dropzone-invalid",
        )}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length > 0) syncDroppedFiles(event.dataTransfer.files);
        }}
      >
        <span className="file-upload-preview" aria-hidden="true">
          {preview ? <img src={preview} alt="" /> : file?.type === "application/pdf" ? <b>PDF</b> : <b>+</b>}
        </span>
        <span className="file-upload-copy">
          <strong>{file ? file.name : "Перетягніть файл сюди або натисніть для вибору"}</strong>
          <small>{file ? `${file.type || "Файл"} · ${formatSize(file.size)}` : "JPEG, PNG, WebP або PDF до 3 МБ"}</small>
        </span>
      </label>
      {error && <p className="file-upload-error" role="alert">{error}</p>}
      {file && (
        <button
          className="file-upload-clear"
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            setSelectedFile(null);
          }}
        >
          Очистити вибір
        </button>
      )}
    </div>
  );
}
