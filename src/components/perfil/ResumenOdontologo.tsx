import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, CalendarClock, CheckCircle2, ChevronRight, FileText, Star } from "lucide-react";
import {
  AvisoError,
  claseEstadoCita,
  etiquetaEstadoCita,
  fechaPerfil,
  KpiPerfil,
  mensajeDeError,
  rangoAgendaOdontologo,
  ResumenSkeleton,
} from "@/components/perfil/PerfilComunes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HistorialClinica } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, ChevronRight, FileText, Star } from "lucide-react";
import { cn } from "@/lib/utils";