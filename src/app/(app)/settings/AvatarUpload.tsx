"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";

const MAX_BYTES = 300 * 1024;

/** Canvas donde se redimensiona la imagen antes de guardarla. */
const OUTPUT_SIZE = 256;

export default function AvatarUpload({ initial }: { initial: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);

  async function send(dataUrl: string | null) {
    setBusy(true);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarDataUrl: dataUrl }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setPreview(data.avatarDataUrl);
      toast({ kind: "success", message: dataUrl ? "Foto actualizada" : "Foto eliminada" });
      router.refresh();
    } else {
      toast({ kind: "error", message: data.error ?? "No se pudo guardar la foto" });
    }

    setBusy(false);
  }

  /**
   * Redimensiona la imagen en el navegador antes de subirla.
   *
   * Guardamos el archivo como data URL dentro de Postgres, así que una foto de
   * 4 MB ocuparía una fila enorme. Al recortar a 256 px queda en ~20-40 KB.
   */
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ kind: "error", message: "Selecciona un archivo de imagen" });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = OUTPUT_SIZE;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast({ kind: "error", message: "No se pudo procesar la imagen" });
          return;
        }

        // Recorta al centro para dejar un cuadrado.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

        // JPEG al 85% mantiene buena calidad sin engordar la base de datos.
        // Los PNG con transparencia se pierden, pero el fondo oscuro lo tapa.
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        if (dataUrl.length > MAX_BYTES) {
          toast({ kind: "error", message: "La imagen sigue siendo demasiado grande" });
          return;
        }

        send(dataUrl);
      };

      img.onerror = () => toast({ kind: "error", message: "No se pudo leer la imagen" });
      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{ width: 80, height: 80, background: "var(--surface-2)", border: "1px solid var(--border)" }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Tu foto de perfil" className="w-full h-full object-cover" />
        ) : (
          <Icon name="user" size={34} style={{ color: "var(--muted)" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            <Icon name="camera" size={16} />
            {preview ? "Cambiar foto" : "Subir foto"}
          </button>

          {preview && (
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => send(null)}
              disabled={busy}
            >
              <Icon name="trash" size={16} />
              Quitar
            </button>
          )}
        </div>

        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Se recorta a un cuadrado de 256 px. Se guarda dentro de tu cuenta, no en
          un servidor externo.
        </p>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Permite volver a elegir el mismo archivo tras quitar la foto.
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
