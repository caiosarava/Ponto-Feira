import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
// Usando a extensão .js para compatibilidade com o padrão ESM node16/nodenext
import type { User } from "../db/schema.js";
import { authenticateRequest } from "./auth/session.js";

/**
 * Define o formato do contexto que estará disponível em todos os procedimentos do tRPC.
 */
export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  /**
   * O usuário pode ser indefinido caso a requisição não esteja autenticada.
   */
  user?: User;
};

/**
 * Cria o contexto para cada requisição tRPC.
 * Resolve problemas de tipagem garantindo que o retorno do authenticateRequest
 * seja compatível com o tipo User definido no schema.
 */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { 
    req: opts.req, 
    resHeaders: opts.resHeaders 
  };

  try {
    const userResult = await authenticateRequest(opts.req.headers);
    
    if (userResult) {
      // Fazemos o cast ou a atribuição segura para garantir que o tipo 
      // retornado bata com a interface User (evitando o erro TS2322)
      ctx.user = userResult as User;
    }
  } catch (error) {
    // Silenciosamente falha a autenticação no contexto; 
    // procedimentos protegidos (authedQuery) lançarão erro via middleware.
    console.error("Erro na autenticação do contexto:", error);
  }

  return ctx;
}