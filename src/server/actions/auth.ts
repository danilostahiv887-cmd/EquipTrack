"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, clearSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/passwords";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";

export type LoginState = { formError?: string; fieldErrors?: { email?: string; password?: string } };
const loginSchema = z.object({ email: z.string().trim().email("Введіть коректну електронну адресу."), password: z.string().min(1, "Введіть пароль.") });

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { email: issues.email?.[0], password: issues.password?.[0] } };
  }
  try {
    const users = await withDatabase((db) => queryRows<Record<string, unknown>>(db, "SELECT id, passwordHash, status FROM user WHERE email = $email LIMIT 1;", { email: parsed.data.email.toLowerCase() }));
    const user = users[0];
    if (!user || user.status !== "active" || !(await verifyPassword(parsed.data.password, String(user.passwordHash)))) return { formError: "Неправильна електронна адреса або пароль." };
    await createSession(String(user.id));
  } catch {
    return { formError: "Не вдалося виконати вхід. Перевірте налаштування системи." };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
