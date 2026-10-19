"use client";

import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useAppState } from "@/lib/app-state";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/paciente/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración de cuenta | OdontoSystem" },
      {
        name: "description",
        content: "Administra tus preferencias y seguridad desde un solo lugar.",
      },
    ],
  }),
  component: ConfiguracionPaciente,
});

function CambiarContrasenaButton() {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full sm:w-auto rounded-xl"
      onClick={() => navigate({ to: "/recuperar" })}
    >
      Cambiar contraseña <ArrowRight className="ml-2 size-4" />
    </Button>
  );
}

function ConfiguracionPaciente() {
  const { usuario: user } = useAppState();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<{ anticipacionRecordatorio: string }>({
    defaultValues: {
      anticipacionRecordatorio:
        (user as { anticipacionRecordatorio?: string })?.anticipacionRecordatorio ?? "15",
    },
  });

  const anticipacion = watch("anticipacionRecordatorio");

  return (
    <AppShell>
      <form
        onSubmit={handleSubmit((data) => {
          /* guardar */
        })}
      >
        {/* ...otros campos... */}
        <div className="space-y-2">
          <SelectGroup>
            <SelectLabel htmlFor="anticipacion-recordatorio">Anticipación de recordatorios</SelectLabel>
            <SelectTrigger
              id="anticipacion-recordatorio"
              {...register("anticipacionRecordatorio")}
            />
            <SelectContent>
              <SelectItem value="0">Al momento</SelectItem>
              <SelectItem value="5">5 minutos</SelectItem>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
            </SelectContent>
          </SelectGroup>
        </div>
        {/* ...resto del formulario... */}
      </form>
    </AppShell>
  );
}
</content>
</tool_call>
