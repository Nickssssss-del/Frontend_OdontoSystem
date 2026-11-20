// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Reduce ruido de conexiones abortadas en dev (HMR, navegación SPA, etc.)
   vite: {
    logLevel: "warn",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Fuera del sandbox de Lovable, Nitro usa este preset y escribe .vercel/output.
  // Sin esta clave el wrapper deja defaultPreset cloudflare-module.
  // El preset vercel no copia las cabeceras de vercel.json a config.json: se declaran aquí.
  nitro: {
    preset: "vercel",
    routeRules: {
      "/**": {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(self)",
          "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        },
      },
    },
  },
});
