import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import * as React from "react";
import type { ReactNode } from "react";
import { ChatbotWidget } from "./ChatbotWidget";
import { useAppState } from "@/lib/app-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Iniciales para el avatar: "Nicole Ramírez" → "NR". */
const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/** Nombre corto para la barra: "Nicole Ramírez Soto" → "Nicole R." */
const nombreCorto = (nombre: string) => {
  const [primero, segundo] = nombre.split(" ").filter(Boolean);
  return segundo ? `${primero} ${segundo[0]}.` : (primero ?? nombre);
};

/** Ruta del logotipo corporativo (mismo archivo que usa la landing). */
const LOGO_SRC = "/odontosystem-logo.png";

/**
 * Lockup de marca: logotipo corporativo + "OdontoSystem".
 * Se usa en la cabecera del paciente y en el menú lateral del odontólogo
 * para mantener una identidad visual única (logo, nombre e iconos).
 */
function Marca({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white p-1 shadow-sm">
        <img src={LOGO_SRC} alt="OdontoSystem" className="size-full object-contain" />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
          Odonto<span className="text-brand">System</span>
        </span>
        {tagline && (
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">
            Plataforma dental verificada
          </span>
        )}
      </span>
    </span>
  );
}

/** Cierra la sesión en el navegador y vuelve a la pantalla de ingreso. */
function useCerrarSesion() {
  const { cerrarSesion } = useAppState();
  const navigate = useNavigate();
  return () => {
    cerrarSesion();
    navigate({ to: "/" });
  };
}

// ============================================================================
// VISTA DEL PACIENTE: TopBar Navigation
// ============================================================================
function PatientHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { usuario } = useAppState();
  const salir = useCerrarSesion();
  const nombre = usuario?.nombre ?? "Paciente";

  const navLinks = [
    { to: "/paciente/catalogo", label: "Buscar dentista", icon: Search },
    { to: "/paciente/panel", label: "Mi panel", icon: LayoutDashboard },
    { to: "/paciente/perfil", label: "Mi perfil", icon: User },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 shadow-[0_1px_3px_rgba(0,107,104,0.06)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Detalle decorativo discreto: anillos + diente */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-56 overflow-hidden">
          <div className="decor-rings absolute -right-20 -top-24 size-64 rounded-full opacity-50" />
          <div className="decor-tooth absolute right-32 top-4 size-7 opacity-30" />
        </div>

        {/* Marca */}
        <Link to="/" className="flex-shrink-0" aria-label="Ir al inicio de OdontoSystem">
          <Marca />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 ml-8">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="relative rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {(state) => (
                <span className="relative flex items-center gap-1.5">
                  {state.isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-[-10px] inset-y-[-6px] -z-10 rounded-full bg-sky"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Section: Notifications + Profile */}
        <div className="ml-auto flex items-center gap-4">
          {/* Notifications Icon */}
          <button className="relative rounded-full p-2 hover:bg-muted transition-colors">
            <Bell className="size-5" />
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
          </button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {iniciales(nombre)}
                </div>
                <span className="hidden sm:inline text-sm">{nombreCorto(nombre)}</span>
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/paciente/perfil">
                  <User className="size-4 mr-2" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/paciente/configuracion">
                  <Settings className="size-4 mr-2" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={salir}>
                <LogOut className="size-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-0 right-0 bg-background border-b border-border md:hidden"
          >
            <nav className="flex flex-col p-4 gap-2">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted">
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// VISTA DEL ODONTÓLOGO: Sidebar Navigation
// ============================================================================
function DentistSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { usuario } = useAppState();
  const salir = useCerrarSesion();
  const nombre = usuario?.nombre ?? "Odontólogo";

  const navItems = [
    { to: "/dentist/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/dentist/agenda", label: "Agenda", icon: Calendar },
    { to: "/dentist/pacientes", label: "Pacientes", icon: Users },
    { to: "/dentist/horarios", label: "Horarios", icon: Clock },
    { to: "/dentist/perfil", label: "Mi perfil", icon: User },
    { to: "/odontologo/configuracion", label: "Configuración", icon: Settings },
  ] as const;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border/70 bg-card shadow-[1px_0_3px_rgba(0,107,104,0.05)] transition-all duration-300",
        open ? "w-56" : "w-20"
      )}
    >
      {/* Detalle decorativo discreto */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="decor-rings absolute -bottom-28 -right-20 size-64 rounded-full opacity-40" />
        <div className="decor-tooth absolute bottom-32 right-5 size-14 opacity-[0.08]" />
      </div>

      {/* Header de marca */}
      <div
        className={cn(
          "relative flex h-16 items-center justify-between border-b border-border/70",
          open ? "px-4" : "px-2"
        )}
      >
        <Link
          to="/dentist/dashboard"
          className="flex min-w-0 items-center gap-2"
          aria-label="Dashboard de OdontoSystem"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white p-1 shadow-sm">
            <img src={LOGO_SRC} alt="OdontoSystem" className="size-full object-contain" />
          </span>
          {open && (
            <span className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
              Odonto<span className="text-brand">System</span>
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          aria-label={open ? "Contraer menú" : "Expandir menú"}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sky hover:text-foreground"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 p-3">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-brand-deep font-semibold text-white shadow-sm shadow-brand-deep/25"
                  : "text-muted-foreground hover:bg-sky hover:text-foreground"
              )}
            >
              <Icon className="size-5 flex-shrink-0" />
              {open && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className="absolute bottom-4 left-3 right-3 border-t border-border/70 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
              <div className="size-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xs font-semibold text-primary-foreground">
                {iniciales(nombre)}
              </div>
              {open && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">Odontólogo</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/dentist/perfil">
                <User className="size-4 mr-2" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/odontologo/configuracion">
                <Settings className="size-4 mr-2" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={salir}>
              <LogOut className="size-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

// ============================================================================
// Main AppShell Component
// ============================================================================
export function AppShell({ children }: { children: ReactNode }) {
  const { userRole } = useAppState();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  if (userRole === "dentist") {
    return (
      <div className="min-h-screen bg-background decor-glow">
        <DentistSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
        <main
          className={cn("transition-all duration-300", sidebarOpen ? "ml-56" : "ml-20")}
        >
          <div className="p-8">{children}</div>
        </main>
        <ChatbotWidget />
      </div>
    );
  }

  // Patient view
  return (
    <div className="min-h-screen bg-background decor-glow">
      <PatientHeader />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8">{children}</main>
      <ChatbotWidget />
    </div>
  );
}
