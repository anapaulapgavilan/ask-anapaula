import { z } from "zod";
import { httpsUrl } from "./profile";

export const projectSchema = z.strictObject({
  id: z.enum(["transcendence", "cub3d", "minishell", "webserv"]),
  label: z.string().min(1),
  url: httpsUrl.nullable(),
  description: z.strictObject({
    en: z.string().min(1),
    es: z.string().min(1),
  }).nullable(),
});
export const projects = z.array(projectSchema).parse([
  {
    id: "transcendence",
    label: "42-Transcendence",
    url: "https://github.com/anapaulapgavilan/42-Transcendence",
    description: {
      en: "A full-stack Pong web app with authentication, profiles, real-time matches over WebSockets, and deployment with Docker Compose and Nginx.",
      es: "Aplicación web full stack de Pong con autenticación, perfiles, partidas en tiempo real mediante WebSockets y despliegue con Docker Compose y Nginx.",
    },
  },
  {
    id: "cub3d",
    label: "42-Cub3d",
    url: "https://github.com/anapaulapgavilan/42-Cub3d",
    description: {
      en: "A C project that renders a first-person maze with raycasting and validates maps, textures, and the starting position.",
      es: "Proyecto en C que renderiza un laberinto en primera persona mediante raycasting y valida mapas, texturas y posición inicial.",
    },
  },
  {
    id: "minishell",
    label: "42-Minishell",
    url: "https://github.com/anapaulapgavilan/42-Minishell",
    description: {
      en: "A simplified POSIX-compatible shell in C with a hand-written parser, pipes, redirections, built-ins, and signal handling.",
      es: "Shell simplificada en C compatible con POSIX, con parser propio, pipes, redirecciones, comandos integrados y manejo de señales.",
    },
  },
  {
    id: "webserv",
    label: "42-WebServ",
    url: "https://github.com/anapaulapgavilan/42-WebServ",
    description: {
      en: "An HTTP/1.1 server in C++98 with virtual hosts, non-blocking poll()-based I/O, and CGI support.",
      es: "Servidor HTTP/1.1 en C++98 con hosts virtuales, E/S no bloqueante mediante poll() y soporte para CGI.",
    },
  },
]);
export type PublicProject = z.infer<typeof projectSchema>;
