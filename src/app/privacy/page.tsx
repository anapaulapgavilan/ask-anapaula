import { PrivacyFooter } from "../../components/PrivacyFooter";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Privacidad / Privacy</h1>
        <h2>Español</h2>
        <PrivacyFooter language="es" />
        <h2>English</h2>
        <PrivacyFooter language="en" />
        <p><Link href="/">Volver / Back</Link></p>
      </div>
    </main>
  );
}
