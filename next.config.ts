import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto nesta pasta. Sem isto, o Turbopack detecta vários
  // package-lock.json (inclusive um em C:\Users\victo) e infere a raiz errada,
  // o que faz todas as rotas aninhadas darem 404 — só "/" resolvia.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
