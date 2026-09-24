import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  CalendarHeart,
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
import { Stethoscope } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// VISTA DEL PACIENTE: TopBar Navigation
// ============================================================================
function PatientHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const navLinks = [
    { to: "/paciente/catalogo", label: "Buscar dentista", icon: Search },
    { to: "/paciente/panel", label: "Mi panel", icon: LayoutDashboard },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarHeart className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Odonto<span className="text-primary">System</span>
          </span>
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">
            v4.3
          </span>
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
                      className="absolute inset-x-[-10px] inset-y-[-6px] -z-10 rounded-full bg-primary/12"
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
                  NR
                </div>
                <span className="hidden sm:inline text-sm">Nicole R.</span>
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="size-4 mr-2" />
                Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="size-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
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
function DentistSidebar() {
  const location = useLocation();
  const [open, setOpen] = React.useState(true);

  const navItems = [
    { to: "/dentist/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/dentist/agenda", label: "Agenda", icon: Calendar },
    { to: "/dentist/pacientes", label: "Pacientes", icon: Users },
    { to: "/dentist/horarios", label: "Horarios", icon: Clock },
    { to: "/odontologo/configuracion", label: "Configuración", icon: Settings },
  ] as const;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 border-r border-border/70 bg-background transition-all duration-300 h-screen",
        open ? "w-56" : "w-20"
      )}
    >
      {/* Header */}
      <div className="border-b border-border/70 p-4 flex items-center justify-between h-16">
        {open && (
          <Link to="/dentist/dashboard" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              <Stethoscope className="size-4" />
            </span>
            <span className="font-semibold text-sm">OdontoSys</span>
          </Link>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
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
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <div className="size-8 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-xs font-semibold text-background flex-shrink-0">
                CM
              </div>
              {open && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">Dra. Claudia</p>
                  <p className="text-xs text-muted-foreground truncate">COP-24851</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuItem>
              <User className="size-4 mr-2" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="size-4 mr-2" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
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

  if (userRole === "dentist") {
    return (
      <div className="min-h-screen bg-background">
        <DentistSidebar />
        <main className="ml-20 lg:ml-56 transition-all duration-300">
          <div className="p-8">{children}</div>
        </main>
        <ChatbotWidget />
      </div>
    );
  }

  // Patient view
  return (
    <div className="min-h-screen bg-background">
      <PatientHeader />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8">{children}</main>
      <ChatbotWidget />
    </div>
  );
}
