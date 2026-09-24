import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Game } from './pages/Game';
import { prototipoFase1 } from './data/situations';
import { definirModoPlaytest } from './domain/situationPicker';
import './index.css';

/* ?playtest=fase1 sorteia só as 8 situações do protótipo, para o teste com
   pessoas ver cada uma mais de uma vez. ?playtest=fase2 sorteia o catálogo
   inteiro (as 32) e só marca a partida no histórico, para separar a análise. */
const playtest = new URLSearchParams(window.location.search).get('playtest');
if (playtest === 'fase1') definirModoPlaytest('fase1', prototipoFase1);
if (playtest === 'fase2') definirModoPlaytest('fase2', null);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
