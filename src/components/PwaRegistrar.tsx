"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_DISMISS_KEY = "labuild:install-dismissed";

export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Registra el service worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // El registro falló: la app sigue funcionando, sólo sin offline.
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // Detecta si ya está instalada y captura el prompt de instalación.
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS no soporta display-mode; usa el indicador propio.
      (window.navigator as { standalone?: boolean }).standalone === true;

    setIsInstalled(standalone);

    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(iOS);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem(INSTALL_DISMISS_KEY)) {
        setShowBanner(true);
      }
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  }

  function dismiss() {
    sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setShowBanner(false);
  }

  // Sólo mostramos el banner si hay algo que ofrecer.
  const showIOSHint = isIOS && !isInstalled && showBanner;

  if (!showBanner || isInstalled) return null;

  return (
    <div
      className="fixed z-40 left-3 right-3 lg:left-auto lg:right-5 lg:w-80"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      <div
        className="card p-4"
        style={{
          borderColor: "var(--accent)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-start gap-3">
          <Icon
            name="smartphone"
            size={22}
            strokeWidth={1.8}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--accent)" }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Instala LaBuild</h3>
            {showIOSHint ? (
              <>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  Toca el botón de compartir{" "}
                  <Icon
                    name="share"
                    size={12}
                    className="inline align-[-2px]"
                    style={{ color: "var(--accent-2)" }}
                  />{" "}
                  y luego{" "}
                  <strong style={{ color: "var(--text)" }}>&quot;Añadir a pantalla de inicio&quot;</strong>.
                </p>
              </>
            ) : (
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Acceso directo a pantalla de inicio, funciona sin conexión y abre a pantalla completa.
              </p>
            )}

            <div className="flex gap-2 mt-3">
              {!showIOSHint && (
                <button onClick={install} className="btn btn-primary text-xs px-3 py-1.5">
                  Instalar
                </button>
              )}
              <button onClick={dismiss} className="btn btn-ghost text-xs px-3 py-1.5">
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}