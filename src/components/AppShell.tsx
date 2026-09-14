import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CalendarHeart, LayoutDashboard, Search, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import { ChatbotWidget } from "./ChatbotWidget";

const links = [
  { to: "/paciente/catalogo", label: "Catálogo", icon: Search },
  { to: "/paciente/panel", label: "Mi panel", icon: LayoutDashboard },
  { to: "/odontologo", label: "Odontólogo", icon: Stethoscope },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
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
          <nav className="ml-auto flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group relative rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
                activeProps={{ "data-status": "active" } as never}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <span className="relative flex items-center gap-1.5">
                    {isActive && (
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">{children}</main>
      <ChatbotWidget />
    </div>
  );
}
