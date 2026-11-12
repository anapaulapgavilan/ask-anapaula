import { signIn } from "../auth";
import Link from "next/link";

export function Login() {
  return (
    <main className="login-page">
      <div className="login-card">
        <p className="section-kicker">Ask Ana Paula</p>
        <h1>Bienvenida / Welcome</h1>
        <p>Inicia sesión con Google para conocer mi trayectoria y conversar con mi asistente de IA.</p>
        <p>Sign in with Google to explore my professional background and chat with my AI assistant.</p>
        <p>Google procesa el inicio de sesión; la sesión dura hasta 24 horas. / Google handles sign-in; your session lasts up to 24 hours.</p>
        <form action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}>
          <button className="primary-link" type="submit">Continuar con Google / Continue with Google</button>
        </form>
        <p><Link href="/privacy">Privacidad / Privacy</Link></p>
      </div>
    </main>
  );
}
