import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Caminho corrigido para subir de api/trpc/ para a raiz e entrar em src/server/
import { appRouter } from "../../server/router.js";
import { createContext } from "../../server/context.js";

const handler = async (req: Request) => {
  // Forçamos a URL a ser absoluta usando o header 'host' para evitar ERR_INVALID_URL
  const url = new URL(req.url, `https://${req.headers.get("host") || "localhost"}`);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(url.href, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      // @ts-ignore
      signal: req.signal,
      // Cast para bypass do erro TS2353, necessário para compatibilidade Node.js Fetch body
      ...({ duplex: "half" } as any),
    }),
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
export default handler;