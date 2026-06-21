"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, clearSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/passwords";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";

export type LoginState = {
  formError?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
};
const requiredText = (message: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);
const loginSchema = z.object({
  email: requiredText("Введіть електронну адресу.").email(
    "Введіть коректну електронну адресу.",
  ),
  password: requiredText("Введіть пароль."),
});

export async function loginAction(
  _: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { email: issues.email, password: issues.password } };
  }
  try {
    const authenticated = await withDatabase(async (db) => {
      const users = await queryRows<Record<string, unknown>>(
        db,
        "SELECT id, email, passwordHash, status FROM user WHERE email = $email LIMIT 1;",
        { email: parsed.data.email.toLowerCase() },
      );
      const user = users[0];
      if (
        !user ||
        user.status !== "active" ||
        !(await verifyPassword(parsed.data.password, String(user.passwordHash)))
      )
        return false;
      await createSession({ userId: user.id, email: String(user.email) }, db);
      return true;
    });
    if (!authenticated)
      return { formError: "Неправильна електронна адреса або пароль." };
  } catch {
    return {
      formError: "Не вдалося виконати вхід. Перевірте налаштування системи.",
    };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
