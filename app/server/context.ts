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
 * Refactorado para ser resiliente a falhas de variáveis de ambiente e infraestrutura.
 */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  // Inicializa o contexto com os objetos básicos da requisição
  const ctx: TrpcContext = { 
    req: opts.req, 
    resHeaders: opts.resHeaders 
  };

  try {
    /**
     * Tenta autenticar o utilizador.
     * O uso do .catch interno garante que, se o authenticateRequest falhar
     * por causa de uma variável de ambiente (ex: DATABASE_URL inválida),
     * a aplicação não retorne um Erro 500 global, permitindo que o tRPC responda.
     */
    const userResult = await authenticateRequest(opts.req.headers).catch((err) => {
      // Log detalhado para diagnóstico no painel da Vercel
      console.error("[TRPC Context] Erro durante a autenticação da sessão:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      return null;
    });
    
    if (userResult) {
      // Atribuição segura ao contexto
      ctx.user = userResult as User;
    }
  } catch (error) {
    // Captura erros inesperados fora do fluxo de autenticação
    console.error("[TRPC Context] Erro fatal inesperado no createContext:", error);
  }

  return ctx;
}