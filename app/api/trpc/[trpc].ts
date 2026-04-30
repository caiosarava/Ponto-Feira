import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Ajuste os caminhos abaixo conforme sua estrutura real de pastas
import { appRouter } from "../../server/router.ts";
import { createContext } from "../../server/context.ts";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
export default handler;