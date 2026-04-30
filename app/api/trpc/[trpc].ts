import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../src/server/router.js";
import { createContext } from "../../src/server/context.js";

const handler = async (req: Request) => {
  // A Vercel/Node às vezes passa URLs relativas no objeto Request, 
  // o que causa o erro "Invalid URL" no fetchRequestHandler.
  // Aqui forçamos a URL a ser absoluta usando o header 'host'.
  const url = new URL(req.url, `https://${req.headers.get("host") || "localhost"}`);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(url.href, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      // @ts-ignore - necessário para passar o sinal de aborto se disponível
      signal: req.signal,
      duplex: "half",
    }),
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
export default handler;