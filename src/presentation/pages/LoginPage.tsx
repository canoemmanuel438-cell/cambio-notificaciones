import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { puedeVerPantalla } from "@/domain/entities/Rol";
import { LogoVisor } from "@/presentation/components/marca/LogoVisor";
import { SelectorRol } from "@/presentation/components/sesion/SelectorRol";
import { NAVEGACION } from "@/presentation/layouts/AppShell";
import { useAccionesSesion, useSesion } from "@/presentation/hooks/useMonitor";

export function LoginPage() {
  const { rol, ultimoRol, cargando } = useSesion();
  const { iniciar } = useAccionesSesion();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cargando && rol) {
      const destino = NAVEGACION.find((n) => puedeVerPantalla(rol, n.pantalla));
      void navigate({ to: destino?.to ?? "/" });
    }
  }, [cargando, rol, navigate]);

  return (
    <main className="grid min-h-screen md:grid-cols-[44%_1fr]">
      <section className="banner flex flex-col justify-between rounded-none p-8 md:p-14">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-card p-1">
            <LogoVisor className="h-9 w-9" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold">Visor PET</p>
            <p className="text-xs opacity-80">
              Plataforma unificada de trazabilidad y conciliación transaccional
            </p>
          </div>
        </div>
        <div className="my-14 max-w-sm">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Cada transacción, del cobro a la liquidación.
          </h1>
          <p className="mt-4 leading-relaxed opacity-75">
            Autorización, compensación, liquidación, intercambio y envío de archivo en un solo
            seguimiento, con alertas cuando algo no cuadra.
          </p>
        </div>
        <p className="text-xs opacity-80">Uso interno. Información confidencial.</p>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold">Iniciar sesión</h2>
          <p className="mb-5 mt-2 text-sm text-muted-foreground">
            En producción el acceso es con tu cuenta corporativa mediante PingOne (SAML). Para esta
            demostración elige un rol y verás solo las funciones que ese rol permite.
          </p>
          {!cargando && ultimoRol && (
            <SelectorRol
              inicial={ultimoRol}
              textoBoton="Ingresar con PingOne (SAML)"
              onConfirmar={async (r) => void (await iniciar(r))}
            />
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Los accesos, consultas y descargas quedan registrados en la bitácora.
          </p>
        </div>
      </section>
    </main>
  );
}
