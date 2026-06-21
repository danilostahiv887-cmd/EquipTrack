import { BrandMark } from "@/components/layout/brand-mark";

const variables = ["SURREAL_URL", "SURREAL_NAMESPACE", "SURREAL_DATABASE", "SURREAL_USERNAME", "SURREAL_PASSWORD", "AUTH_SECRET"];

export default function SetupPage() {
  return (
    <main className="setup-page">
      <section className="setup-panel" aria-labelledby="setup-title">
        <BrandMark className="setup-brand-mark"/>
        <p className="eyebrow">EQUIPTRACK / НАЛАШТУВАННЯ</p>
        <h1 id="setup-title">Система ще не підключена до Surreal Cloud</h1>
        <p>Додайте змінні середовища у Render або локальний файл <code>.env.local</code>, після чого виконайте <code>npm run setup</code>.</p>
        <ul className="setup-list">
          {variables.map((name) => <li key={name}><code>{name}</code></li>)}
        </ul>
        <p className="setup-note">Секрети не показуються в інтерфейсі й не зберігаються в репозиторії.</p>
      </section>
    </main>
  );
}
