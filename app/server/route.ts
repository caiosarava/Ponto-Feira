import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server"; // Importa NextRequest para tipagem

// Assumindo que appRouter está em app/server/api/root.ts e createTRPCContext em app/server/api/trpc.ts.
// Ajuste os caminhos se a sua estrutura de arquivos for diferente.
import { appRouter } from "../../../../server/api/root.js"; // Caminho ajustado
import { createTRPCContext } from "../../../../server/api/trpc.js"; // Caminho ajustado e nome da função

const handler = (req: NextRequest) => // Usa NextRequest para tipagem segura
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }), // Forma correta de passar o contexto no Next.js App Router
  });

export { handler as GET, handler as POST };