# Ponto Geo - Registro de Presença com Geolocalização

Aplicativo mobile de registro de presença (ponto) que só permite registro quando o usuário está dentro de um raio de 100 metros de um local de trabalho cadastrado.

## Funcionalidades

- **Login seguro** via OAuth 2.0 (Kimi)
- **Registro de ponto** com validação de GPS
- **Geolocalização** em tempo real
- **Histórico** de registros por usuário
- **Painel admin** para gerenciar locais de trabalho
- **Integração com Google Sheets** para exportar registros
- **Interface mobile-first** otimizada para smartphones

## Como usar

### 1. Primeiro acesso

1. Acesse o aplicativo
2. Faça login com sua conta Kimi
3. O primeiro usuário a logar se torna administrador automaticamente

### 2. Cadastrar locais (Admin)

1. Após login, clique no ícone de engrenagem (Admin)
2. Clique em "Novo" para cadastrar um local
3. Informe:
   - **Nome** do local (ex: Matriz, Filial SP)
   - **Endereço** completo
   - **Latitude** e **Longitude** (obtenha no Google Maps)
   - **Raio** em metros (padrão: 100m)

> **Dica:** No Google Maps, clique com o botão direito no local desejado para copiar as coordenadas.

### 3. Registrar ponto

1. Na tela principal, selecione o local de trabalho
2. Aguarde o GPS obter sua localização (indicador "Ativo")
3. Se estiver dentro do raio permitido, os botões de Entrada/Saída serão habilitados
4. Clique no botão correspondente para registrar

### 4. Ver histórico

1. Clique no ícone de relógio no cabeçalho
2. Visualize todos os registros agrupados por data

## Configuração do Google Sheets (Opcional)

Para sincronizar os registros com uma planilha no Google Drive de `daes.ecosol@gmail.com`:

### Passo 1: Criar Service Account no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API **Google Sheets** e **Google Drive**:
   - Menu ≡ → APIs e Serviços → Biblioteca
   - Pesquise "Google Sheets API" e ative
   - Pesquise "Google Drive API" e ative

### Passo 2: Criar credenciais

1. Vá para APIs e Serviços → Credenciais
2. Clique em "Criar credenciais" → "Conta de serviço"
3. Dê um nome (ex: `ponto-geo-sheets`) e clique em "Criar"
4. Na tela de permissões, selecione o papel "Editor"
5. Vá para a aba "Chaves"
6. Clique em "Adicionar chave" → "Criar nova chave"
7. Selecione formato **JSON** e clique em "Criar"
8. O arquivo JSON será baixado automaticamente

### Passo 3: Configurar variáveis de ambiente

1. Converta o arquivo JSON para Base64:
   ```bash
   # Linux/Mac
   base64 -i caminho/do/arquivo.json | pbcopy
   
   # Windows (PowerShell)
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("caminho\do\arquivo.json"))
   ```

2. Configure no arquivo `.env` do projeto:
   ```env
   GOOGLE_CREDENTIALS_BASE64=<cole_aqui_o_conteudo_base64>
   GOOGLE_SHEETS_SPREADSHEET_ID=<ID_da_planilha>
   ```

   > Para obter o `GOOGLE_SHEETS_SPREADSHEET_ID`: crie uma planilha no Google Sheets e copie o ID da URL.

3. **Compartilhar a planilha**: Adicione o email da Service Account (ex: `ponto-geo@projeto.iam.gserviceaccount.com`) como editor da planilha.

### Passo 4: Sincronizar

1. No painel Admin, clique em "Sincronizar Registros"
2. Os registros não sincronizados serão enviados para a planilha
3. A planilha terá as colunas: Data, Hora, Nome, Email, Tipo, Local, Distância, Latitude, Longitude

## Arquitetura

- **Frontend:** React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Hono + tRPC 11 + Drizzle ORM
- **Banco de dados:** MySQL (TiDB)
- **Autenticação:** OAuth 2.0 (Kimi)
- **GPS:** API nativa do navegador (Geolocation API)

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão com MySQL |
| `APP_ID` / `APP_SECRET` | Credenciais do app Kimi |
| `GOOGLE_CREDENTIALS_BASE64` | Credenciais da Service Account (Base64) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID da planilha do Google Sheets |

## Requisitos do dispositivo

- Navegador moderno com suporte a Geolocation API
- GPS ativado
- Permissão de localização concedida ao navegador
- Conexão com internet

## Raio de precisão

O aplicativo considera a precisão do GPS. Se a precisão reportada pelo dispositivo for maior que a distância até o local, o registro pode ser bloqueado como medida de segurança.
