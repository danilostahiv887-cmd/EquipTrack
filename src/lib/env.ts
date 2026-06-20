const requiredKeys = [
  "SURREAL_URL",
  "SURREAL_NAMESPACE",
  "SURREAL_DATABASE",
  "SURREAL_USERNAME",
  "SURREAL_PASSWORD",
  "AUTH_SECRET",
] as const;

export const isConfigured = requiredKeys.every((key) => Boolean(process.env[key]?.trim()));

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  surrealUrl: process.env.SURREAL_URL?.trim() || "",
  surrealNamespace: process.env.SURREAL_NAMESPACE?.trim() || "equiptrack",
  surrealDatabase: process.env.SURREAL_DATABASE?.trim() || "production",
  surrealUsername: process.env.SURREAL_USERNAME?.trim() || "",
  surrealPassword: process.env.SURREAL_PASSWORD?.trim() || "",
  authSecret: process.env.AUTH_SECRET?.trim() || "",
} as const;
