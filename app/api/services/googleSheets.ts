import { google } from "googleapis";
import type { AttendanceRecord } from "@db/schema";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuthClient() {
  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!credentialsBase64) {
    throw new Error("Google credentials not configured");
  }
  const credentials = JSON.parse(
    Buffer.from(credentialsBase64, "base64").toString("utf-8")
  );
  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

function formatTimeOnly(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(date);
}

export async function appendUserCredentials(
  spreadsheetId: string,
  email: string,
  passwordHash: string,
  name?: string
) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const range = "Sheet1!A:D"; // Assuming columns for Email, PasswordHash, Name, Role

  // Check if headers exist, if not, add them
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1:D1",
    });
    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Email", "PasswordHash", "Name", "Role"]],
        },
      });
    }
  } catch (error) {
    console.error("Error checking/creating headers in Google Sheet:", error);
    throw new Error("Failed to ensure Google Sheet headers");
  }

  const values = [[email, passwordHash, name || "", "user"]];

  const resource = {
    values,
  };

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: resource,
    });
    console.log("User credentials appended to Google Sheet");
  } catch (error) {
    console.error("Error appending user credentials to Google Sheet:", error);
    throw new Error("Failed to append user credentials to Google Sheet");
  }
}

export async function getUserCredentialsByEmail(
  spreadsheetId: string,
  email: string
) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  const range = "Sheet1!A:D"; // Assuming columns for Email, PasswordHash, Name, Role

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (rows && rows.length > 1) { // Skip header row
      const userRow = rows.find(row => row[0] === email);
      if (userRow) {
        return { email: userRow[0], passwordHash: userRow[1], name: userRow[2], role: userRow[3] };
      }
    }
    return null;
  } catch (error) {
    console.error("Error reading user credentials from Google Sheet:", error);
    throw new Error("Failed to read user credentials from Google Sheet");
  }
}

export async function appendAttendanceRecords(
  spreadsheetId: string,
  records: (AttendanceRecord & {
    user?: { name: string | null; email: string | null } | null;
    location?: { name: string | null } | null;
  })[]
) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  // Check if headers exist
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    let sheetId = metadata.data.sheets?.[0]?.properties?.sheetId;

    if (!sheetId) {
      // Create sheet
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: "Registro de Presença" },
          sheets: [
            {
              properties: {
                title: "Registros",
                gridProperties: { rowCount: 1000, columnCount: 10 },
              },
            },
          ],
        },
      });
      sheetId = response.data.sheets?.[0]?.properties?.sheetId;
      spreadsheetId = response.data.spreadsheetId!;
    }

    // Try to read first row to check headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Registros!A1:G1",
    });

    const headers = headerResponse.data.values?.[0];
    if (!headers) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Registros!A1:G1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Data",
              "Hora",
              "Nome",
              "Email",
              "Tipo",
              "Local",
              "Distância (m)",
              "Latitude",
              "Longitude",
            ],
          ],
        },
      });
    }

    // Append records
    const rows = records.map((record) => [
      formatDateOnly(record.createdAt),
      formatTimeOnly(record.createdAt),
      record.user?.name ?? "",
      record.user?.email ?? "",
      record.type === "in" ? "Entrada" : "Saída",
      record.location?.name ?? "",
      record.distance,
      record.latitude,
      record.longitude,
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Registros!A:G",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rows,
      },
    });

    return { success: true, spreadsheetId };
  } catch (error) {
    console.error("Google Sheets error:", error);
    throw error;
  }
}

export async function getOrCreateSpreadsheet(email: string) {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  // Search for existing spreadsheet
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and name='Registro de Presenca'",
    spaces: "drive",
    fields: "files(id, name)",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create new spreadsheet
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Registro de Presença" },
    },
  });

  const newSpreadsheetId = spreadsheet.data.spreadsheetId!;

  // Share with the user email
  await drive.permissions.create({
    fileId: newSpreadsheetId,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: email,
    },
  });

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: newSpreadsheetId,
    range: "Sheet1!A1:I1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          "Data",
          "Hora",
          "Nome",
          "Email",
          "Tipo",
          "Local",
          "Distância (m)",
          "Latitude",
          "Longitude",
        ],
      ],
    },
  });

  return newSpreadsheetId;
}
