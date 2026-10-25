import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  categoriasApi,
  fotosConsultorioApi,
  serviciosOdontologoApi,
  type CategoriaServicio,
  type FotoConsultorio,
  type ServicioOdontologo,
} from "@/lib/api";
import { mensajeDe, soles } from "@/lib/formato";

export const Route = createFileRoute("/dentist/consultorio")({
  head: () => ({ meta: [{ title: "Mi consultorio | OdontoSystem Odontólogo" }] }),
  component: DentistConsultorio,
});

type Form = {
  categoria_id: string;
  titulo: string;
  descripcion: string;
  precio: string;
  duracion: string;
};
const FORM_VACIO: Form = {
  categoria_id: "",
  titulo: "",
  descripcion: "",
  precio: "",
  duracion: "30",
};

function DentistConsultorio() {
  const [servicios, setServicios] = React.useState<ServicioOdontologo[]>([]);
  const [categorias, setCategorias] = React.useState<CategoriaServicio[]>([]);
  const [fotos, setFotos] = React.useState<FotoConsultorio[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);

  const [editando, setEditando] = React.useState<string | "nuevo" | null>(null);
  const [form, setForm] = React.useState<Form>(FORM_VACIO);
  const [guardando, setGuardando] = React.useState(false);
  const [subiendoFoto, setSubiendoFoto] = React.useState(false);
  const [descripcionFoto, setDescripcionFoto] = React.useState("");

  const cargar = React.useCallback(async () => {
    setError(null);
    try {
      const [s, c, f] = await Promise.all([
        serviciosOdontologoApi.listar(),
        categoriasApi.listar(),
        fotosConsultorioApi.listar(),
      ]);
      setServicios(s);
      setCategorias(c);
      setFotos(f);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setForm({ ...FORM_VACIO, categoria_id: categorias[0] ? String(categorias[0].id) : "" });
    setEditando("nuevo");
  };
  const abrirEdicion = (s: ServicioOdontologo) => {
    setForm({
      categoria_id: String(s.categoria_id),
      titulo: s.titulo,
      descripcion: s.descripcion ?? "",
      precio: String(s.precio_total),
      duracion: String(s.duracion_minutos),
    });
    setEditando(s.id);
  };

  const formValido =
    form.categoria_id !== "" &&
    form.titulo.trim() !== "" &&
    Number(form.precio) >= 0 &&
    form.precio !== "" &&
    Number(form.duracion) >= 5 &&
    Number(form.duracion) <= 480;

  const guardar = async () => {
    if (!formValido || !editando) return;
    const datos = {
      categoria_id: Number(form.categoria_id),
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      precio_total: Number(form.precio),
      duracion_minutos: Number(form.duracion),
    };
    setGuardando(true);
    try {
      if (editando === "nuevo") await serviciosOdontologoApi.crear(datos);
      else await serviciosOdontologoApi.actualizar(editando, datos);
      toast.success("Servicio guardado");
      setEditando(null);
      setServicios(await serviciosOdontologoApi.listar());
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (s: ServicioOdontologo) => {
    if (!window.confirm(`¿Eliminar "${s.titulo}"?`)) return;
    try {
      await serviciosOdontologoApi.eliminar(s.id);
      setServicios((lista) => lista.filter((x) => x.id !== s.id));
      toast.success("Servicio eliminado");
    } catch (e) {
      toast.error(mensajeDe(e));
    }
  };

  const subirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      await fotosConsultorioApi.subir(archivo, descripcionFoto);
      setDescripcionFoto("");
      setFotos(await fotosConsultorioApi.listar());
      toast.success("Foto subida");
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = async (f: FotoConsultorio) => {
    if (!window.confirm("¿Quitar esta foto?")) return;
    try {
      await fotosConsultorioApi.eliminar(f.id);
      setFotos((lista) => lista.filter((x) => x.id !== f.id));
    } catch (e) {
      toast.error(mensajeDe(e));
    }
  };

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Mi consultorio</h1>
        <p className="text-muted-foreground">
          Servicios que ofreces y fotos que ven los pacientes en tu perfil.
        </p>
      </div>

      {error && (
        <p className="mb-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
          <Button variant="outline" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </p>
      )}
      {cargando && <Loader2 className="mb-6 size-5 animate-spin text-muted-foreground" />}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Servicios</CardTitle>
            <CardDescription>
              El depósito se calcula automáticamente a partir del precio.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={abrirNuevo}
            disabled={editando !== null || categorias.length === 0}
          >
            <Plus className="mr-1 size-4" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {editando && (
            <div className="space-y-3 rounded-xl border border-primary/40 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {editando === "nuevo" ? "Nuevo servicio" : "Editar servicio"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditando(null)}
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="s-cat">
                    Categoría
                  </label>
                  <select
                    id="s-cat"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={form.categoria_id}
                    onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="s-tit">
                    Título
                  </label>
                  <Input
                    id="s-tit"
                    maxLength={150}
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="s-precio">
                    Precio total (S/)
                  </label>
                  <Input
                    id="s-precio"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="s-dur">
                    Duración (min)
                  </label>
                  <Input
                    id="s-dur"
                    type="number"
                    min={5}
                    max={480}
                    value={form.duracion}
                    onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                  />
                </div>
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                rows={2}
                maxLength={2000}
                placeholder="Descripción (opcional)"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <Button disabled={!formValido || guardando} onClick={() => void guardar()}>
                {guardando && <Loader2 className="mr-2 size-4 animate-spin" />} Guardar servicio
              </Button>
            </div>
          )}

          {!cargando && servicios.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aún no tienes servicios. Agrega el primero.
            </p>
          )}
          {servicios.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-4"
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {s.titulo} <Badge variant="outline">{s.categoria}</Badge>
                  {!s.activo && <Badge variant="destructive">Inactivo</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {soles(s.precio_total)} · depósito {soles(s.monto_deposito)} ·{" "}
                  {s.duracion_minutos} min
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirEdicion(s)}
                  aria-label={`Editar ${s.titulo}`}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void eliminar(s)}
                  aria-label={`Eliminar ${s.titulo}`}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos del consultorio</CardTitle>
          <CardDescription>JPG, PNG o WEBP de hasta 5 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder="Descripción (opcional)"
              value={descripcionFoto}
              onChange={(e) => setDescripcionFoto(e.target.value)}
              aria-label="Descripción de la foto"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
              {subiendoFoto ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              Subir foto
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                disabled={subiendoFoto}
                onChange={(e) => {
                  void subirFoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {fotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no subiste fotos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {fotos.map((f) => (
                <figure
                  key={f.id}
                  className="group relative overflow-hidden rounded-xl border border-border/70"
                >
                  <img
                    src={f.url}
                    alt={f.descripcion ?? "Foto del consultorio"}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  {f.descripcion && (
                    <figcaption className="p-2 text-xs text-muted-foreground">
                      {f.descripcion}
                    </figcaption>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => void quitarFoto(f)}
                    aria-label="Quitar foto"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </figure>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
