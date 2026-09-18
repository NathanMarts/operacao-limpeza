import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Caminho em que o site é servido.
 *
 * Em `pnpm dev` e num build local é a raiz. No GitHub Pages o site vive em
 * /nome-do-repositorio/, e o workflow passa esse caminho em PAGES_BASE — lido
 * do próprio Pages, não escrito à mão aqui. Duas consequências práticas:
 * renomear o repositório não exige tocar neste arquivo, e uma página de
 * usuário (usuario.github.io), que fica na raiz, funciona sem caso especial.
 */
function baseDoSite(): string {
  const bruto = process.env.PAGES_BASE?.trim();
  if (!bruto) return '/';
  const limpo = bruto.replace(/^\/+|\/+$/g, '');
  return limpo ? `/${limpo}/` : '/';
}

export default defineConfig({
  base: baseDoSite(),
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
