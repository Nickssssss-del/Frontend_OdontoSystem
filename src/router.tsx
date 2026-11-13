import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { CABECERA_NONCE } from "./lib/csp";
import { routeTree } from "./routeTree.gen";

/** Nonce de la CSP de esta petición (lo genera src/server.ts). En el navegador no hace falta. */
const nonceDeLaPeticion = createIsomorphicFn()
  .server(() => getRequestHeader(CABECERA_NONCE as Parameters<typeof getRequestHeader>[0]))
  .client(() => undefined);

export const getRouter = () => {
  const nonce = nonceDeLaPeticion();
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    ...(nonce ? { ssr: { nonce } } : {}),
  });

  return router;
};
