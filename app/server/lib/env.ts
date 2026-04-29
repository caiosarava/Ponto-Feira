import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string {
  return process.env[name] ?? "";
}

export const env = {
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  googleCredentialsBase64: optional("GOOGLE_CREDENTIALS_BASE64"),
  googleSheetsSpreadsheetId:
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? process.env.GOOGLE_SHEET_ID ?? "",
};
