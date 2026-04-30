import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Removendo a extensão .ts explicitamente para permitir que o compilador resolva 
// de acordo com as configurações do tsconfig (comum em builds Vite/Vercel)
import { appRouter } from "../../server/router";
import { createContext } from "../../server/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
export default handler;