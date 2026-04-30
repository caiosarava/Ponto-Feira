import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// Caminhos ajustados de acordo com a estrutura: api/trpc/[trpc].ts -> src/server/...
import { appRouter } from "../../src/server/router.ts";
import { createContext } from "../../src/server/context.ts";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
export default handler;