import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Search,
  Clock,
  Eye,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Administra el registro de tus pacientes y visualiza su historial.",
      },
    ],
  }),
  component: DentistPacientes,
});

type Patient = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  lastVisit: string;
  specialty: string;
  status: "active" | "inactive";
  appointmentsCount: number;
};

function DentistPacientes() {
  const { agenda, appointments } = useAppState();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Mock patients data
  const patients: Patient[] = [
    {
      id: "p1",
      name: "Nicole Ramírez",
      age: 24,
      phone: "+51 987 654 321",
      email: "nicole@example.com",
      lastVisit: "2026-09-15",
      specialty: "Ortodoncia",
      status: "active",
      appointmentsCount: 8,
    },
    {
      id: "p2",
      name: "Marco Ayala",
      age: 32,
      phone: "+51 987 654 322",
      email: "marco@example.com",
      lastVisit: "2026-09-14",
      specialty: "Evaluación",
      status: "active",
      appointmentsCount: 3,
    },
    {
      id: "p3",
      name: "Lucía Tenorio",
      age: 28,
      phone: "+51 987 654 323",
      email: "lucia@example.com",
      lastVisit: "2026-09-13",
      specialty: "Ortodoncia",
      status: "active",
      appointmentsCount: 5,
    },
    {
      id: "p4",
      name: "Jorge Bermúdez",
      age: 45,
      phone: "+51 987 654 324",
      email: "jorge@example.com",
      lastVisit: "2026-09-12",
      specialty: "General",
      status: "inactive",
      appointmentsCount: 2,
    },
    {
      id: "p5",
      name: "Ana Peralta",
      age: 35,
      phone: "+51 987 654 325",
      email: "ana@example.com",
      lastVisit: "2026-09-15",
      specialty: "Ortodoncia",
      status: "active",
      appointmentsCount: 6,
    },
    {
      id: "p6",
      name: "Diego Falcón",
      age: 29,
      phone: "+51 987 654 326",
      email: "diego@example.com",
      lastVisit: "2026-09-15",
      specialty: "Evaluación",
      status: "active",
      appointmentsCount: 4,
    },
  ];

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: patients.length,
    active: patients.filter((p) => p.status === "active").length,
    inactive: patients.filter((p) => p.status === "inactive").length,
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de pacientes</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 mb-8 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total de pacientes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pacientes activos</p>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Buscar pacientes</CardTitle>
              <CardDescription>Filtra por nombre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: Nicole, Marco..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patients Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Registro de Pacientes</CardTitle>
              <CardDescription>
                {filteredPatients.length} paciente(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead className="hidden md:table-cell">Última cita</TableHead>
                      <TableHead className="hidden lg:table-cell">Especialidad</TableHead>
                      <TableHead>Citas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-semibold">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">{patient.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{patient.age}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {new Date(patient.lastVisit).toLocaleDateString("es-PE", {
                              day: "numeric",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell className="text-sm hidden lg:table-cell">
                            {patient.specialty}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {patient.appointmentsCount}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                patient.status === "active"
                                  ? "bg-success/10 text-success border-success/30"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {patient.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                  <Eye className="size-4 mr-2" />
                                  Ver historial
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="size-4 mr-2" />
                                  Agendar cita
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <MessageSquare className="size-4 mr-2" />
                                  Enviar mensaje
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="size-4 mr-2" />
                                  Enviar email
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Phone className="size-4 mr-2" />
                                  Llamar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Clock className="size-4 mr-2" />
                                  Cambiar estado
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron pacientes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
