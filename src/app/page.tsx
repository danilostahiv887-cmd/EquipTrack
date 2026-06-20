import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";

export default function HomePage() {
  redirect(isConfigured ? "/dashboard" : "/setup");
}
