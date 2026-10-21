/**
 * TerminosModal - Modal reutilizable de Terminos y condiciones de OdontoSystem.
 *
 * Uso A - estado externo (registro):
 *   const [open, setOpen] = React.useState(false);
 *   <TerminosModal open={open} onOpenChange={setOpen} onAceptar={marcarAceptacion} />
 *
 * Uso B - con trigger incorporado (pie de pagina):
 *   <TerminosModal trigger={<button>Terminos</button>} mostrarAceptar={false} />
 *
 * Accesibilidad: trampa de foco (Radix), Escape, restauracion de foco, aria-label, navegacion por teclado.
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TerminosModalProps = {
  /** Controla la visibilidad externamente (modo controlado). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Elemento trigger. Radix gestiona la restauracion del foco al cerrar.
   */
  trigger?: React.ReactNode;
  /**
   * Llamado SOLO cuando el usuario pulsa "Aceptar".
   * NO se invoca al cerrar con Escape ni con el boton X.
   */
  onAceptar?: () => void;
  /** Etiqueta del boton primario. Por defecto "Aceptar". */
  labelAceptar?: string;
  /** Si false, el boton "Aceptar" no aparece (modo solo lectura). */
  mostrarAceptar?: boolean;
};

// ---------------------------------------------------------------------------
// Contenido legal provisional
// ---------------------------------------------------------------------------

function Sec1() {
  return (
    <>
      <p>
        OdontoSystem es una plataforma digital que conecta a pacientes con
        odontologos independientes colegiados en el Colegio Odontologico del
        Peru (COP), con sede principal en Ica, Peru. El uso de la plataforma
        implica la aceptacion plena de los presentes Terminos y condiciones.
      </p>
      <p className="mt-2">
        Estos Terminos regulan el acceso, registro, publicacion de servicios,
        reserva y pago de citas, asi como cualquier otra funcionalidad ofrecida
        a traves del sitio web y la API de OdontoSystem.
      </p>
    </>
  );
}

function Sec2() {
  return (
    <>
      <p>
        Para utilizar los servicios de OdontoSystem debes registrarte
        proporcionando datos veridicos, completos y actualizados. Existen dos
        tipos de cuenta:
      </p>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>
          <strong>Paciente:</strong> persona natural mayor de edad que busca
          servicios odontologicos.
        </li>
        <li>
          <strong>Odontologo:</strong> profesional con numero de colegiatura COP
          vigente, verificado en tiempo real con el registro oficial del COP.
        </li>
      </ul>
      <p className="mt-2">
        Eres responsable de mantener la confidencialidad de tus credenciales y
        de todas las actividades realizadas bajo tu cuenta.
      </p>
    </>
  );
}

function Sec3() {
  return (
    <>
      <p>
        Al reservar una cita, el sistema bloquea el turno durante 15 minutos
        mientras se completa el pago del deposito. Si el pago no se realiza
        dentro de ese plazo, el turno se libera automaticamente.
      </p>
      <p className="mt-2">
        El deposito se descuenta del total de la consulta. OdontoSystem actua
        como intermediario tecnico del pago; los pagos son procesados por
        pasarelas de terceros (Yape, Plin o tarjeta). En el entorno sandbox no
        se realizan cargos reales.
      </p>
      <p className="mt-2">
        <strong>Cancelaciones:</strong> si cancelas con 12 horas o mas de
        anticipacion, se devuelve el deposito. Las cancelaciones tardias o las
        inasistencias no dan derecho a reembolso.
      </p>
    </>
  );
}

function Sec4() {
  return (
    <>
      <p>
        OdontoSystem cumple con la Ley N. 29733 - Ley de Proteccion de Datos
        Personales del Peru y su Reglamento (D.S. 003-2013-JUS). Al
        registrarte, otorgas tu consentimiento expreso para el tratamiento de
        tus datos con las finalidades de:
      </p>
      <ul className="mt-2 list-disc pl-5 space-y-1">
        <li>Gestionar tu cuenta y las citas reservadas.</li>
        <li>Enviar recordatorios y notificaciones sobre tus citas.</li>
        <li>Verificar la colegiatura COP de los odontologos.</li>
        <li>Mejorar la experiencia de la plataforma mediante analisis de uso.</li>
      </ul>
      <p className="mt-2">
        Las historias clinicas se almacenan cifradas conforme a las exigencias
        legales aplicables. No vendemos ni cedemos tus datos a terceros con
        fines comerciales.
      </p>
    </>
  );
}

function Sec5() {
  return (
    <>
      <p>
        OdontoSystem es una plataforma de intermediacion. No presta servicios
        odontologicos ni es responsable de la calidad o resultado de la atencion
        clinica brindada por los odontologos registrados.
      </p>
      <p className="mt-2">
        Los odontologos son profesionales independientes y asumen plena
        responsabilidad por su practica clinica, en cumplimiento de la normativa
        sanitaria y deontologica vigente.
      </p>
      <p className="mt-2">
        OdontoSystem no garantiza la disponibilidad ininterrumpida del servicio
        ni se responsabiliza por interrupciones causadas por terceros,
        mantenimientos programados o causas de fuerza mayor.
      </p>
    </>
  );
}

function Sec6() {
  return (
    <p>
      Todos los derechos de propiedad intelectual sobre OdontoSystem -incluyendo
      diseno, codigo fuente, marcas, logotipos y contenidos- son propiedad de
      OdontoSystem o de sus licenciantes. Queda prohibida su reproduccion,
      distribucion o uso comercial sin autorizacion expresa por escrito.
    </p>
  );
}

function Sec7() {
  return (
    <p>
      OdontoSystem se reserva el derecho de actualizar estos Terminos en
      cualquier momento. Los cambios se notificaran mediante el correo
      electronico registrado o mediante un aviso en la plataforma. El uso
      continuado implica la aceptacion de los nuevos terminos.
    </p>
  );
}

function Sec8() {
  return (
    <p>
      Estos Terminos se rigen por las leyes de la Republica del Peru. Cualquier
      controversia se sometera a los juzgados y tribunales competentes de la
      ciudad de Ica, salvo que la normativa de proteccion al consumidor
      establezca un fuero distinto.
    </p>
  );
}

const SECCIONES = [
  { id: "1", titulo: "Objeto y ambito de aplicacion", Cuerpo: Sec1 },
  { id: "2", titulo: "Registro y cuentas de usuario", Cuerpo: Sec2 },
  { id: "3", titulo: "Reservas, depositos y pagos", Cuerpo: Sec3 },
  { id: "4", titulo: "Privacidad y proteccion de datos personales", Cuerpo: Sec4 },
  { id: "5", titulo: "Responsabilidades y limitaciones", Cuerpo: Sec5 },
  { id: "6", titulo: "Propiedad intelectual", Cuerpo: Sec6 },
  { id: "7", titulo: "Modificaciones de los Terminos", Cuerpo: Sec7 },
  { id: "8", titulo: "Ley aplicable y jurisdiccion", Cuerpo: Sec8 },
];

// ---------------------------------------------------------------------------
// Seccion individual
// ---------------------------------------------------------------------------

function SeccionTerminos({
  id,
  titulo,
  Cuerpo,
}: {
  id: string;
  titulo: string;
  Cuerpo: React.FC;
}) {
  return (
    <section aria-labelledby={`terminos-sec-${id}`} className="space-y-1.5">
      <h3
        id={`terminos-sec-${id}`}
        className="flex items-center gap-2 font-semibold text-gray-800 text-sm"
      >
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold"
        >
          {id}
        </span>
        {titulo}
      </h3>
      <div className="pl-7 text-sm text-gray-600 leading-relaxed">
        <Cuerpo />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contenido interno del modal
// ---------------------------------------------------------------------------

type ModalContentProps = {
  onAceptar?: () => void;
  onCancelar?: () => void;
  labelAceptar: string;
  mostrarAceptar: boolean;
};

function ModalContent({
  onAceptar,
  onCancelar,
  labelAceptar,
  mostrarAceptar,
}: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      {/* Fondo oscuro semitransparente */}
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        )}
      />

      {/* Tarjeta blanca centrada */}
      <DialogPrimitive.Content
        aria-describedby="terminos-desc"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "flex w-[calc(100vw-2rem)] max-w-2xl flex-col",
          "max-h-[90dvh] sm:max-h-[85dvh]",
          "rounded-2xl bg-white shadow-2xl shadow-black/15",
          "outline-none ring-1 ring-black/5",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=open]:slide-in-from-top-[2%]",
        )}
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <FileText className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <div>
              <DialogPrimitive.Title className="font-display text-lg font-semibold leading-tight text-gray-900">
                Términos y condiciones
              </DialogPrimitive.Title>
              <p id="terminos-desc" className="mt-0.5 text-xs text-gray-400">
                Versión provisional · OdontoSystem · Ica, Perú
              </p>
            </div>
          </div>

          {/* Botón cerrar */}
          <DialogPrimitive.Close
            aria-label="Cerrar términos y condiciones"
            className={cn(
              "mt-0.5 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors",
              "hover:bg-gray-100 hover:text-gray-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        {/* Aviso provisional */}
        <div className="mx-6 mt-4 shrink-0 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle
            className="mt-0.5 size-3.5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <span>
            <strong>Contenido provisional.</strong> Este texto está sujeto a
            revisión legal definitiva y puede modificarse antes del lanzamiento
            oficial de la plataforma.
          </span>
        </div>

        {/* Área desplazable */}
        <ScrollArea className="min-h-0 flex-1 px-6 py-5">
          <div className="space-y-6 pr-2">
            {SECCIONES.map((sec) => (
              <SeccionTerminos key={sec.id} id={sec.id} titulo={sec.titulo} Cuerpo={sec.Cuerpo} />
            ))}
            <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">
              © {new Date().getFullYear()} OdontoSystem · Ica, Perú · Todos los derechos reservados.
            </p>
          </div>
        </ScrollArea>

        {/* Pie con botones */}
        <div
          className={cn(
            "shrink-0 border-t border-gray-100 px-6 py-4",
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          )}
        >
          {/* Cancelar - cierra sin registrar aceptacion */}
          <DialogPrimitive.Close asChild>
            <Button
              variant="outline"
              className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:ring-teal-500"
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          </DialogPrimitive.Close>

          {/* Aceptar - solo en contextos de consentimiento */}
          {mostrarAceptar && (
            <Button
              className="rounded-full bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500"
              onClick={onAceptar}
            >
              {labelAceptar}
            </Button>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------------------------------------------------------------------
// Componente publico
// ---------------------------------------------------------------------------

export function TerminosModal({
  open,
  onOpenChange,
  trigger,
  onAceptar,
  labelAceptar = "Aceptar",
  mostrarAceptar = true,
}: TerminosModalProps) {
  const handleAceptar = () => {
    onAceptar?.();
    onOpenChange?.(false);
  };

  const handleCancelar = () => {
    onOpenChange?.(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger != null && (
        <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      )}
      <ModalContent
        onAceptar={handleAceptar}
        onCancelar={handleCancelar}
        labelAceptar={labelAceptar}
        mostrarAceptar={mostrarAceptar}
      />
    </DialogPrimitive.Root>
  );
}
