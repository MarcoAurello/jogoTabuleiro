/* Tabuleiro do Desafio das Peças: casas, linhas, regras e a jogadora "máquina" (Nágila).
   Coordenadas num quadro de 100 x 140 (em pé). Quem joga embaixo é o jogador 0; em cima, o jogador 1.
   Regras: anda pelas linhas, uma casa por vez, só para casa vazia; não pula e não come peça.
   Vence quem levar todas as suas peças para a fileira do outro lado. */
const Tabuleiro = (() => {
  const NOS = [
    // fileira de cima (começo do jogador 1, destino do jogador 0)
    { id: 't0', x: 10, y: 10 }, { id: 't1', x: 30, y: 10 }, { id: 'T', x: 50, y: 10 }, { id: 't3', x: 70, y: 10 }, { id: 't4', x: 90, y: 10 },
    { id: 'L1', x: 12, y: 40 }, { id: 'TI', x: 50, y: 40 }, { id: 'R1', x: 88, y: 40 },
    { id: 'ML', x: 26, y: 70 }, { id: 'C', x: 50, y: 70 }, { id: 'MR', x: 74, y: 70 },
    { id: 'L2', x: 12, y: 100 }, { id: 'BI', x: 50, y: 100 }, { id: 'R2', x: 88, y: 100 },
    // fileira de baixo (começo do jogador 0, destino do jogador 1)
    { id: 'b0', x: 10, y: 130 }, { id: 'b1', x: 30, y: 130 }, { id: 'B', x: 50, y: 130 }, { id: 'b3', x: 70, y: 130 }, { id: 'b4', x: 90, y: 130 },
  ];
  const LINHAS = [
    ['t0', 't1'], ['t1', 'T'], ['T', 't3'], ['t3', 't4'],
    ['T', 'L1'], ['T', 'R1'], ['T', 'TI'],
    ['L1', 'ML'], ['R1', 'MR'], ['TI', 'ML'], ['TI', 'MR'], ['TI', 'C'],
    ['ML', 'C'], ['C', 'MR'], ['C', 'BI'], ['ML', 'BI'], ['MR', 'BI'],
    ['ML', 'L2'], ['MR', 'R2'], ['L2', 'B'], ['R2', 'B'], ['BI', 'B'],
    ['b0', 'b1'], ['b1', 'B'], ['B', 'b3'], ['b3', 'b4'],
  ];
  // áreas azuis (como no tabuleiro de papel): quadrado de cima e de baixo, com o losango branco no meio
  const AREAS = [['T', 'R1', 'MR', 'TI', 'ML', 'L1'], ['B', 'L2', 'ML', 'BI', 'MR', 'R2']];
  // por onde a peça passou: lado esquerdo, centro ou lado direito (para o relatório)
  const LADO = { L1: 'esquerda', ML: 'esquerda', L2: 'esquerda', TI: 'centro', C: 'centro', BI: 'centro', R1: 'direita', MR: 'direita', R2: 'direita' };

  const N = NOS.length;
  const indice = Object.fromEntries(NOS.map((n, i) => [n.id, i]));
  const VIZINHOS = NOS.map(() => []);
  LINHAS.forEach(([a, b]) => { VIZINHOS[indice[a]].push(indice[b]); VIZINHOS[indice[b]].push(indice[a]); });

  const FILEIRA = { cima: [0, 1, 2, 3, 4], baixo: [14, 15, 16, 17, 18] };
  const INICIO = [FILEIRA.baixo, FILEIRA.cima];
  const DESTINO = [FILEIRA.cima, FILEIRA.baixo];

  // distância (em passos) entre todas as casas
  const D = NOS.map((_, origem) => {
    const d = Array(N).fill(Infinity);
    d[origem] = 0;
    const fila = [origem];
    while (fila.length) {
      const a = fila.shift();
      VIZINHOS[a].forEach((b) => { if (d[b] === Infinity) { d[b] = d[a] + 1; fila.push(b); } });
    }
    return d;
  });
  // quantos passos faltam de cada casa até a fileira de destino de cada jogador
  const FALTA = [0, 1].map((p) => NOS.map((_, i) => Math.min(...DESTINO[p].map((j) => D[i][j]))));

  // posição inicial: com 4 peças fica uma casa livre em cada fileira (como no tabuleiro de papel)
  function posicaoInicial(pecas) {
    const pos = Array(N).fill(-1);
    const livre = [15, 3];   // b1 e t3: uma em frente da outra, girando o tabuleiro
    [0, 1].forEach((p) => INICIO[p].forEach((i) => { if (pecas === 5 || i !== livre[p]) pos[i] = p; }));
    return pos;
  }

  function jogadas(pos, p) {
    const lista = [];
    for (let i = 0; i < N; i++) {
      if (pos[i] !== p) continue;
      for (const j of VIZINHOS[i]) if (pos[j] === -1) lista.push([i, j]);
    }
    return lista;
  }

  const podeAndar = (pos, i) => VIZINHOS[i].some((j) => pos[j] === -1);

  function venceu(pos, p) {
    let fora = 0;
    for (let i = 0; i < N; i++) if (pos[i] === p && !DESTINO[p].includes(i)) fora++;
    return fora === 0;
  }

  // menor soma de passos para levar cada peça a uma casa diferente do destino
  function custo(pos, p) {
    const alvos = DESTINO[p];
    let dp = Array(32).fill(Infinity);
    dp[0] = 0;
    for (let i = 0; i < N; i++) {
      if (pos[i] !== p) continue;
      const novo = Array(32).fill(Infinity);
      for (let m = 0; m < 32; m++) {
        if (dp[m] === Infinity) continue;
        for (let k = 0; k < 5; k++) {
          if (m & (1 << k)) continue;
          const v = dp[m] + D[i][alvos[k]];
          if (v < novo[m | (1 << k)]) novo[m | (1 << k)] = v;
        }
      }
      dp = novo;
    }
    return Math.min(...dp);
  }

  // A fileira de destino de p é a casa do outro: enquanto houver peça do outro lá, ela precisa SAIR
  // (pelo meio da fileira) para p poder ganhar. Conta quantas peças de p estão trancando essa saída.
  const SAIDAS = [[5, 6, 7], [11, 12, 13]];   // por onde se sai do meio da fileira de cima / de baixo
  function bloqueio(pos, p) {
    const fila = DESTINO[p], meio = fila[2], saidas = SAIDAS[p];
    let total = 0;
    fila.forEach((i, k) => {
      if (pos[i] !== 1 - p) return;
      const caminho = k < 2 ? fila.slice(k + 1, 3) : fila.slice(2, k);   // casas até o meio (inclusive)
      caminho.forEach((c) => { if (pos[c] === p) total++; });
      if (saidas.every((s) => pos[s] !== -1) && saidas.some((s) => pos[s] === p)) total++;
    });
    if (pos[meio] === p && fila.some((i) => pos[i] === 1 - p)) total++;   // sentou no meio antes da hora
    return total;
  }
  const falta = (pos, p) => custo(pos, p) + bloqueio(pos, p) * 2;

  // nota da posição para o jogador p (maior = melhor): quanto falta para o outro menos quanto falta para mim,
  // e um pouco de liberdade de movimento (peças presas atrapalham)
  function avaliar(pos, p) {
    return (falta(pos, 1 - p) - falta(pos, p)) * 10 + (jogadas(pos, p).length - jogadas(pos, 1 - p).length) * 0.5;
  }

  function negamax(pos, vez, prof, alfa, beta) {
    if (venceu(pos, 1 - vez)) return -10000 - prof;
    if (venceu(pos, vez)) return 10000 + prof;
    if (prof === 0) return avaliar(pos, vez);
    const lista = jogadas(pos, vez);
    if (!lista.length) {
      if (!jogadas(pos, 1 - vez).length) return avaliar(pos, vez);
      return -negamax(pos, 1 - vez, prof - 1, -beta, -alfa);   // sem saída: passa a vez
    }
    lista.sort((a, b) => (FALTA[vez][a[1]] - FALTA[vez][a[0]]) - (FALTA[vez][b[1]] - FALTA[vez][b[0]]));
    let melhor = -Infinity;
    for (const [de, para] of lista) {
      pos[de] = -1; pos[para] = vez;
      const v = -negamax(pos, 1 - vez, prof - 1, -beta, -alfa);
      pos[para] = -1; pos[de] = vez;
      if (v > melhor) melhor = v;
      if (v > alfa) alfa = v;
      if (alfa >= beta) break;
    }
    return melhor;
  }

  const TRAVADO = 4;   // jogadas seguidas sem progresso: hora de abrir caminho

  const NIVEIS = {
    facil: { prof: 1, acaso: 0.35 },
    medio: { prof: 2, acaso: 0.1 },
    dificil: { prof: 4, acaso: 0 },
    dica: { prof: 3, acaso: 0 },
  };

  // Quando ninguém consegue passar (uma peça cercada pelas do outro), procura a sequência curta
  // (eu, o outro, eu) que mais diminui o caminho que falta PARA OS DOIS: é o "abrir caminho".
  function destravar(pos, p) {
    const total = (q) => falta(q, 0) + falta(q, 1);
    const busca = (q, vez, prof) => {
      if (prof === 0 || venceu(q, 0) || venceu(q, 1)) return total(q);
      const lista = jogadas(q, vez);
      if (!lista.length) return busca(q, 1 - vez, prof - 1);
      let melhor = Infinity;
      for (const [de, para] of lista) {
        q[de] = -1; q[para] = vez;
        melhor = Math.min(melhor, busca(q, 1 - vez, prof - 1));
        q[para] = -1; q[de] = vez;
      }
      return melhor;
    };
    const copia = [...pos];
    let melhores = [], melhor = Infinity;
    for (const [de, para] of jogadas(pos, p)) {
      copia[de] = -1; copia[para] = p;
      const v = busca(copia, 1 - p, 3) + Math.random() * 0.5;
      copia[para] = -1; copia[de] = p;
      if (v < melhor) { melhor = v; melhores = [[de, para]]; }
    }
    return melhores[0] || null;
  }

  // escolhe a jogada do jogador p. "ultima" = última jogada dele (evita ficar indo e voltando);
  // "parado" = quantas jogadas seguidas ele fez sem chegar mais perto do objetivo
  function escolher(pos, p, nivel, ultima, parado = 0) {
    const cfg = NIVEIS[nivel] || NIVEIS.medio;
    const lista = jogadas(pos, p);
    if (!lista.length) return null;
    if (parado >= TRAVADO) return destravar(pos, p);
    if (Math.random() < cfg.acaso) {
      // no fácil às vezes joga "de criança": qualquer jogada que não volte
      const naoVolta = lista.filter(([de, para]) => FALTA[p][para] <= FALTA[p][de]);
      const op = naoVolta.length ? naoVolta : lista;
      return op[Math.floor(Math.random() * op.length)];
    }
    const copia = [...pos];
    let melhores = [], melhor = -Infinity;
    for (const [de, para] of lista) {
      copia[de] = -1; copia[para] = p;
      let v = -negamax(copia, 1 - p, cfg.prof - 1, -Infinity, Infinity);
      copia[para] = -1; copia[de] = p;
      if (ultima && ultima[0] === para && ultima[1] === de) v -= 6;   // vai e volta
      if (v > melhor + 0.01) { melhor = v; melhores = [[de, para]]; } else if (Math.abs(v - melhor) <= 0.01) melhores.push([de, para]);
    }
    return melhores[Math.floor(Math.random() * melhores.length)];
  }

  return { NOS, LINHAS, AREAS, LADO, VIZINHOS, DESTINO, INICIO, FALTA, TRAVADO, indice, posicaoInicial, jogadas, podeAndar, venceu, custo, falta, escolher };
})();
if (typeof module !== 'undefined') module.exports = Tabuleiro;
