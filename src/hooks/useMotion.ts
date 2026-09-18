import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

/**
 * Lê uma duração dos tokens de `index.css`. O CSS é a fonte única dos tempos:
 * o pino, o count-up e o atraso da caminhada precisam acompanhar as animações
 * declaradas lá, e duplicar os números em JavaScript garantiria que um dia eles
 * sairiam de sincronia.
 */
export function duracaoCSS(token: string, reserva: number): number {
  if (typeof window === 'undefined' || !document?.documentElement) return reserva;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = bruto.endsWith('ms')
    ? Number.parseFloat(bruto)
    : bruto.endsWith('s')
      ? Number.parseFloat(bruto) * 1000
      : Number.NaN;
  return Number.isFinite(ms) ? ms : reserva;
}

/**
 * Preferência de movimento reduzido do sistema.
 *
 * O CSS já respeita `prefers-reduced-motion` por uma regra global, mas o
 * count-up e o atraso da caminhada são JavaScript e escapam dela. Quem desligou
 * animações não pode ficar esperando um atraso que não vai mostrar nada.
 */
export function useReducedMotion(): boolean {
  const [reduzido, setReduzido] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aoMudar = () => setReduzido(consulta.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return reduzido;
}

/**
 * Anima um número do valor anterior até o atual — o relógio do turno vira
 * registro do trabalho feito, em vez de um número que salta.
 *
 * Na primeira renderização entrega o valor final direto: ninguém quer ver a
 * partida contar de zero ao abrir a página, e o SSR precisa do valor certo.
 * Mudanças menores que `minimoParaAnimar` também vão direto, para não
 * transformar cada ajuste de meio minuto em animação.
 */
export function useCountUp(valor: number, minimoParaAnimar = 1): number {
  const reduzido = useReducedMotion();
  const [exibido, setExibido] = useState(valor);
  const anterior = useRef(valor);
  const quadro = useRef(0);

  useEffect(() => {
    const de = anterior.current;
    anterior.current = valor;

    if (reduzido || Math.abs(valor - de) < minimoParaAnimar) {
      setExibido(valor);
      return;
    }

    const duracao = duracaoCSS('--dur-count', 600);
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      /* Saída suave: rápido no começo, assenta no fim. */
      const eased = 1 - (1 - t) ** 3;
      setExibido(de + (valor - de) * eased);
      if (t < 1) quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro.current);
  }, [valor, reduzido, minimoParaAnimar]);

  return exibido;
}

/**
 * Mantém um elemento montado durante a animação de saída.
 *
 * O React desmonta na hora em que a condição fica falsa, então sem isto a cena
 * entra animada e sai em corte seco. Aqui a saída é estado de APRESENTAÇÃO: o
 * domínio já mudou de fase, e só a casca visual continua por mais um instante.
 */
export function usePresenca(ativo: boolean, duracao?: number) {
  const reduzido = useReducedMotion();
  const [presente, setPresente] = useState(ativo);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (ativo) {
      setPresente(true);
      setSaindo(false);
      return;
    }
    if (!presente) return;
    if (reduzido) {
      setPresente(false);
      return;
    }
    setSaindo(true);
    const espera = duracao ?? duracaoCSS('--dur-saida', 180);
    const relogio = setTimeout(() => {
      setPresente(false);
      setSaindo(false);
    }, espera);
    return () => clearTimeout(relogio);
  }, [ativo, presente, reduzido, duracao]);

  return { presente, saindo };
}

/** Lê um número sem unidade dos tokens de `index.css`. */
export function numeroCSS(token: string, reserva: number): number {
  if (typeof window === 'undefined' || !document?.documentElement) return reserva;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const n = Number.parseFloat(bruto);
  return Number.isFinite(n) ? n : reserva;
}

/**
 * Inclinação 3D que acompanha o cursor.
 *
 * O hook não decide aparência nenhuma: mede onde o ponteiro está dentro do
 * elemento, de -1 a 1 a partir do centro, e escreve isso em variáveis CSS. Os
 * graus, a perspectiva e os tempos moram em `index.css`, como o resto do
 * movimento do projeto.
 *
 * `ativo` desliga o efeito quando a carta deixa de ser uma opção — indisponível,
 * escolhida ou recuada. Inclinar uma carta já decidida disputaria a atenção
 * justamente com o feedback da decisão.
 */
export function useTilt3D(ativo: boolean) {
  const reduzido = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const quadro = useRef(0);

  const repousar = useCallback(() => {
    cancelAnimationFrame(quadro.current);
    const el = ref.current;
    if (!el) return;
    el.dataset.inclinando = 'nao';
    for (const prop of [
      '--tilt-giro',
      '--tilt-escala',
      '--tilt-sombra-x',
      '--tilt-sombra-y',
      '--tilt-desfoque',
      '--tilt-sombra-alfa',
    ]) {
      el.style.removeProperty(prop);
    }
  }, []);

  /* A carta pode deixar de ser clicável com o ponteiro parado em cima dela —
     é o que acontece no instante da escolha. Sem isto ela ficaria torta. */
  useEffect(() => {
    if (!ativo || reduzido) repousar();
  }, [ativo, reduzido, repousar]);

  useEffect(() => () => cancelAnimationFrame(quadro.current), []);

  const aoMover = useCallback(
    (evento: PointerEvent<HTMLDivElement>) => {
      /* Em toque não existe hover: inclinar no toque só moveria o alvo. */
      if (!ativo || reduzido || evento.pointerType === 'touch') return;
      const el = ref.current;
      if (!el) return;

      const area = el.getBoundingClientRect();
      const x = ((evento.clientX - area.left) / area.width) * 2 - 1;

      cancelAnimationFrame(quadro.current);
      quadro.current = requestAnimationFrame(() => {
        const grau = numeroCSS('--tilt-max', 7);
        el.dataset.inclinando = 'sim';
        /* Giro lateral: o cursor andando para a direita empurra a borda
           direita para trás. Só este eixo — a carta não tomba para frente. */
        el.style.setProperty('--tilt-giro', `${(x * grau).toFixed(2)}deg`);
        el.style.setProperty('--tilt-escala', '1.02');
        /* Sombra para o lado oposto: é o que dá volume em vez de distorção. */
        el.style.setProperty('--tilt-sombra-x', `${(-x * 12).toFixed(1)}px`);
        /* Fixo: não acompanha o cursor, só marca que a carta subiu da mesa. */
        el.style.setProperty('--tilt-sombra-y', '10px');
        el.style.setProperty('--tilt-desfoque', '22px');
        el.style.setProperty('--tilt-sombra-alfa', '0.3');
      });
    },
    [ativo, reduzido],
  );

  return { ref, onPointerMove: aoMover, onPointerLeave: repousar };
}
