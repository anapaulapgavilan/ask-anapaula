import { ProfileExperience } from "../components/ProfileExperience";
import { Login } from "../components/Login";
import { auth, signOut } from "../auth";
import { authMode, googleAuthConfigured } from "../lib/auth-policy";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  let mode: ReturnType<typeof authMode>;
  try {
    mode = authMode(process.env.AUTH_MODE, process.env.VERCEL_ENV);
  } catch {
    console.error("AUTH_MODE_INVALID");
    return <main className="login-page"><p>Inicio de sesión no disponible. / Sign-in is unavailable.</p></main>;
  }
  if (mode === "disabled") return <ProfileExperience />;
  if (!googleAuthConfigured(process.env)) {
    console.error("AUTH_CONFIGURATION_UNAVAILABLE");
    return <main className="login-page"><p>Inicio de sesión no disponible. / Sign-in is unavailable.</p></main>;
  }
  const session = await auth();
  if (!session) return <Login />;
  return (
    <>
      <form className="signout-form" action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}>
        <button className="secondary-button" type="submit">Cerrar sesión / Sign out</button>
      </form>
      <ProfileExperience />
    </>
  );
}
