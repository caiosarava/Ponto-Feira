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
 * * NOTA DE DEBUG: Se você encontrar um erro 500 "FUNCTION_INVOCATION_FAILED",
 * verifique se a variável APP_SECRET está configurada no painel da Vercel.
 */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { 
    req: opts.req, 
    resHeaders: opts.resHeaders 
  };

  try {
    // Tenta obter o usuário da sessão.
    // Se o código parar aqui com "Missing required environment variable",
    // significa que o arquivo 'env.ts' disparou um erro fatal.
    const userResult = await authenticateRequest(opts.req.headers);
    
    if (userResult) {
      ctx.user = userResult as User;
    }
  } catch (error) {
    // Registra o erro mas permite que o contexto seja criado (usuário ficará undefined)
    // Isso evita o erro 500 em rotas públicas, a menos que o erro seja de inicialização de módulo.
    console.error("[TRPC Context Error]:", error instanceof Error ? error.message : error);
  }

  return ctx;
}