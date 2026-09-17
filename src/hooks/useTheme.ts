import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'operacao-limpeza:tema';

/**
 * O tema vive num atributo do <html>, e não em classes dos componentes: assim o
 * CSS resolve tudo por variável e nenhum componente precisa saber que existem
 * dois temas. A escolha persiste entre partidas — numa oficina, cada máquina
 * fica do jeito que o participante ajustou.
 */
function lerTemaSalvo(): Theme {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === 'light' || salvo === 'dark') return salvo;
  } catch {
    /* Navegador com storage bloqueado: cai no padrão, sem quebrar a partida. */
  }
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(lerTemaSalvo);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Sem storage a troca continua valendo, só não sobrevive ao reload. */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
