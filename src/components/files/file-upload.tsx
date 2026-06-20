"use client";

import { useState } from "react";

export function FileUpload() {
  const [name, setName] = useState("");
  return <label className="file-upload">Фото або документ<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setName(event.target.files?.[0]?.name ?? "")} /><span>{name || "JPEG, PNG, WebP або PDF до 3 МБ"}</span></label>;
}
