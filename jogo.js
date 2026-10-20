(() => {
  const $ = (id) => document.getElementById(id);
  const { NOS, LINHAS, AREAS, LADO, VIZINHOS, DESTINO, FALTA, indice } = Tabuleiro;

  // ---------- Configuração ----------
  const PROFISSIONAL = 'Nágila';
  const TELEFONE_PRO = '553188833589';   // WhatsApp da Nágila: (31) 8883-3589, só números com 55 + DDD
  const IMPULSIVA = 1.5;       // jogada feita em menos de 1,5 s: muito rápida (pode indicar impulsividade)
  const DEMORADA = 20;         // mais de 20 s pensando numa jogada
  const DICA_APOS = 3;         // depois de 3 toques fora da regra seguidos, a jogada certa brilha
  const MAX_JOGADAS = 150;     // por jogador: se passar disso, a partida termina (quem estiver mais perto vence)
  const ESPERA_MAQUINA = [900, 1700];   // a Nágila "pensa" um pouquinho antes de jogar (ms)
  const CHAVE_NOME = 'desafio:nome';
  const CHAVE_HIST = 'desafio:historico:';
  const CHAVE_PREF = 'desafio:pref';
  const CHAVE_CONF = 'desafio:config';
  const NIVEL_NOME = { facil: 'fácil', medio: 'médio', dificil: 'difícil' };

  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch (e) { return padrao; } };

  let nome = ler(CHAVE_NOME, '');
  const pref = ler(CHAVE_PREF, { musica: true, voz: true });
  const PECAS = 4;            // sempre 4 peças de cada lado (como no tabuleiro de papel)
  const CHAVE_REGRAS = 'desafio:viu-regras';
  const conf = Object.assign({ modo: 'maquina', nivel: 'facil', nome2: '' }, ler(CHAVE_CONF, {}));

  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo(0, 0);
    if (id === 'tela-jogo') { ajustarTabuleiro(); requestAnimationFrame(ajustarTabuleiro); setTimeout(ajustarTabuleiro, 350); }
  }

  // ---------- Voz (voz do aparelho, uma fala por vez) ----------
  let falando = false;
  function falar(texto, urgente) {
    if (!pref.voz || !('speechSynthesis' in window)) return Promise.resolve();
    if (falando && !urgente) return Promise.resolve();
    return new Promise((fim) => {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR';
      u.rate = 0.92;
      u.pitch = 1.1;
      const voz = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('pt-BR'));
      if (voz) u.voice = voz;
      let pronto = false;
      const acabar = () => { if (pronto) return; pronto = true; falando = false; Musica.abaixar(false); fim(); };
      u.onend = u.onerror = acabar;
      speechSynthesis.cancel();
      falando = true;
      Musica.abaixar(true);
      speechSynthesis.speak(u);
      setTimeout(acabar, 9000);
    });
  }
  function calar() { if ('speechSynthesis' in window) speechSynthesis.cancel(); falando = false; Musica.abaixar(false); }
  if ('speechSynthesis' in window) speechSynthesis.getVoices();

  // ---------- Efeitos sonoros curtinhos (gerados no navegador) ----------
  let ctxSom = null;
  function som(tipo) {
    if (!pref.voz) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctxSom = ctxSom || new AC();
    if (ctxSom.state !== 'running') ctxSom.resume().catch(() => {});
    const notas = {
      mover: [[660, 0, 0.09]],
      chegou: [[784, 0, 0.12], [988, 0.1, 0.12], [1319, 0.2, 0.22]],
      ops: [[330, 0, 0.14], [294, 0.12, 0.18]],      // suave, sem cara de castigo
      vitoria: [[523, 0, 0.14], [659, 0.13, 0.14], [784, 0.26, 0.14], [1047, 0.39, 0.4]],
    }[tipo] || [];
    const t0 = ctxSom.currentTime + 0.02;
    notas.forEach(([f, d, dur]) => {
      const o = ctxSom.createOscillator(), g = ctxSom.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + d);
      g.gain.linearRampToValueAtTime(0.18, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + d + dur);
      o.connect(g).connect(ctxSom.destination);
      o.start(t0 + d); o.stop(t0 + d + dur + 0.05);
    });
  }
  // o navegador só libera som depois de um toque
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (ctxSom && ctxSom.state !== 'running') ctxSom.resume().catch(() => {});
  }, { capture: true, passive: true }));

  // ---------- Botões de som ----------
  function atualizarBotoesSom() {
    $('btn-musica').setAttribute('aria-pressed', String(pref.musica));
    $('btn-som').setAttribute('aria-pressed', String(pref.voz));
    $('btn-musica').setAttribute('aria-label', pref.musica ? 'Desligar música' : 'Ligar música');
    $('btn-som').setAttribute('aria-label', pref.voz ? 'Desligar voz e sons' : 'Ligar voz e sons');
  }
  Musica.alternar(false);
  $('btn-musica').onclick = () => { pref.musica = !pref.musica; guardar(CHAVE_PREF, pref); Musica.alternar(pref.musica); atualizarBotoesSom(); };
  $('btn-som').onclick = () => { pref.voz = !pref.voz; guardar(CHAVE_PREF, pref); if (!pref.voz) calar(); atualizarBotoesSom(); };
  atualizarBotoesSom();
  const ligarMusica = () => { if (pref.musica) Musica.alternar(true); };

  // ---------- Nágila animada ----------
  const ROTULO_PRO = { parada: 'Nágila', tchau: 'Nágila dando tchau', feliz: 'Nágila pulando de alegria' };
  let timerPro = null;
  function proEstado(estado, voltarEm) {
    const el = $('pro-jogo');
    el.className = `pro-sprite pro-tabuleiro ${estado}`;
    el.setAttribute('aria-label', ROTULO_PRO[estado]);
    clearTimeout(timerPro);
    if (voltarEm) timerPro = setTimeout(() => proEstado('parada'), voltarEm);
  }

  // ---------- Nome ----------
  function telaNome() {
    $('campo-nome').value = nome;
    $('erro-nome').textContent = '';
    mostrar('tela-nome');
    $('campo-nome').focus();
  }

  $('form-nome').onsubmit = (e) => {
    e.preventDefault();
    const n = $('campo-nome').value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { $('erro-nome').textContent = 'Escreva o seu nome, por favor.'; return; }
    nome = n.toUpperCase();
    guardar(CHAVE_NOME, nome);
    telaInicio(true);
  };

  function telaInicio(saudar) {
    if (!nome) return telaNome();
    $('nome-jogador').textContent = nome;
    atualizarOpcoes();
    mostrar('tela-inicio');
    if (saudar) { ligarMusica(); falar(`Oi, ${nome.toLowerCase()}! Vamos jogar o Desafio das Peças?`); }
  }

  $('btn-trocar').onclick = () => { calar(); nome = ''; try { localStorage.removeItem(CHAVE_NOME); } catch (e) {} telaNome(); };

  // ---------- Opções da partida: só o nível; o modo é o botão que a pessoa toca ----------
  function atualizarOpcoes() {
    $('op-nivel').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === conf.nivel)));
    $('campo-nome2').value = conf.nome2;
  }
  $('op-nivel').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    conf.nivel = chip.dataset.v;
    guardar(CHAVE_CONF, conf);
    atualizarOpcoes();
  });
  $('campo-nome2').addEventListener('input', () => { conf.nome2 = $('campo-nome2').value.trim().toUpperCase(); guardar(CHAVE_CONF, conf); });

  // ---------- Tabuleiro na tela ----------
  const pctX = (n) => `${n.x}%`;
  const pctY = (n) => `${(n.y / 140) * 100}%`;

  function desenharTabuleiro() {
    const p = (id) => NOS[indice[id]];
    const areas = AREAS.map((a) => `<polygon class="area" points="${a.map((id) => `${p(id).x},${p(id).y}`).join(' ')}"/>`).join('');
    const linhas = LINHAS.map(([a, b]) => `<line x1="${p(a).x}" y1="${p(a).y}" x2="${p(b).x}" y2="${p(b).y}"/>`).join('');
    const pontos = NOS.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="1.7"/>`).join('');
    $('desenho').innerHTML = `<rect class="faixa cima" x="2" y="2" width="96" height="16" rx="8"/><rect class="faixa baixo" x="2" y="122" width="96" height="16" rx="8"/>${areas}<g class="linhas">${linhas}</g><g class="pontos">${pontos}</g>`;
    $('camada-casas').innerHTML = NOS.map((n, i) =>
      `<button class="casa" type="button" data-i="${i}" style="left:${pctX(n)};top:${pctY(n)}"></button>`).join('');
  }
  desenharTabuleiro();

  // o tabuleiro ocupa o maior tamanho que couber no espaço livre, sem deformar (100 x 140)
  function ajustarTabuleiro() {
    const areaTab = document.querySelector('.tabuleiro-area');
    const w = Math.min(areaTab.clientWidth, (areaTab.clientHeight * 100) / 140, 520);
    if (w > 0) $('tabuleiro').style.width = `${Math.floor(w)}px`;
  }
  if ('ResizeObserver' in window) new ResizeObserver(ajustarTabuleiro).observe(document.querySelector('.tabuleiro-area'));
  // girar o celular ou abrir/fechar a barra do navegador: confere de novo depois que a tela assenta
  const reajustar = () => { ajustarTabuleiro(); setTimeout(ajustarTabuleiro, 150); setTimeout(ajustarTabuleiro, 500); };
  window.addEventListener('resize', reajustar);
  window.addEventListener('orientationchange', reajustar);
  if (window.visualViewport) visualViewport.addEventListener('resize', reajustar);

  // ---------- Partida ----------
  let jogo = null;
  const ehMaquina = (p) => jogo.modo === 'maquina' && p === 1;
  const humanos = () => (jogo.modo === 'maquina' ? [0] : [0, 1]);
  const nomeDe = (p) => jogo.nomes[p];
  const donoArtigo = (p) => (ehMaquina(p) ? `da ${PROFISSIONAL}` : `de ${nomeDe(p)}`);

  function novaPartida(modo = conf.modo) {
    conf.modo = modo;
    guardar(CHAVE_CONF, conf);
    calar();
    clearTimeout(timerMaquina);
    const pos = Tabuleiro.posicaoInicial(PECAS);
    // cada peça tem número (1 a 4, da esquerda para a direita) para o relatório "peça por peça"
    const pecas = [];
    [0, 1].forEach((p) => {
      let num = 1;
      pos.forEach((dono, i) => { if (dono === p) pecas.push({ dono: p, num: num++, no: i, chegouEm: null, el: null }); });
    });
    const nome2 = conf.nome2 || 'JOGADOR 2';
    jogo = {
      inicio: new Date(),
      modo, nivel: conf.nivel, n: PECAS,
      nomes: [nome, modo === 'maquina' ? PROFISSIONAL.toUpperCase() : nome2],
      pos, pecas,
      vez: modo === 'maquina' ? 1 : 0,   // contra a máquina a Nágila começa
      relogio: [0, 0],          // segundos de cada jogador (só anda na vez dele)
      marco: null,              // quando o relógio da vez começou a contar
      pausado: true,
      bloqueado: true,
      acabou: false,
      jogadas: [],              // { p, num, de, para, tempo, tipo, vaiVolta, dica, lado }
      toques: [],               // toques fora da regra: { p, tipo }
      trocas: [0, 0],           // escolheu uma peça e mudou de ideia
      dicas: [0, 0],
      passou: [0, 0],
      inicioJogada: 0,          // tempo de relógio do jogador quando a vez começou
      ultima: [null, null],
      melhor: [Tabuleiro.falta(pos, 0), Tabuleiro.falta(pos, 1)],
      parado: [0, 0],
      errosSeguidos: 0,
      selecionada: null,
      dicaAtual: null,
    };
    montarPecas();
    montarCartoes();
    ligarMusica();
    mostrar('tela-jogo');
    atualizarTela();
    proEstado('parada');
    // as regras aparecem só na primeira partida do aparelho (depois, no botão ❓)
    if (!ler(CHAVE_REGRAS, false)) { abrirRegras(); return; }
    jogo.pausado = false;
    comecarVez();
  }

  function abrirRegras() {
    if (!jogo.acabou) { pararRelogio(); jogo.pausado = true; clearTimeout(timerMaquina); }
    mensagem('Leia como jogar e toque em COMEÇAR.');
    $('explicacao').hidden = false;
    $('btn-comecar').focus();
    falar('Leve todas as suas peças para o outro lado do tabuleiro. Ande pelas linhas, uma bolinha por vez. Não pode pular e não pode comer peça.', true);
  }
  $('btn-regras').onclick = () => { if (jogo && !jogo.acabou) abrirRegras(); };

  $('btn-jogar').onclick = () => novaPartida('maquina');
  $('btn-dupla').onclick = () => { conf.nome2 = $('campo-nome2').value.trim().toUpperCase(); novaPartida('dupla'); };
  $('btn-comecar').onclick = () => {
    calar();
    guardar(CHAVE_REGRAS, true);
    $('explicacao').hidden = true;
    continuar();
  };

  function montarPecas() {
    $('camada-pecas').innerHTML = '';
    jogo.pecas.forEach((pc) => {
      const el = document.createElement('div');
      el.className = `peca dono-${pc.dono}`;
      el.textContent = pc.num;
      $('camada-pecas').appendChild(el);
      pc.el = el;
      posicionar(pc);
    });
  }
  function posicionar(pc) {
    pc.el.style.left = pctX(NOS[pc.no]);
    pc.el.style.top = pctY(NOS[pc.no]);
  }
  const pecaEm = (i) => jogo.pecas.find((pc) => pc.no === i);

  function montarCartoes() {
    [0, 1].forEach((p) => {
      $(`nome-${p}`).textContent = nomeDe(p);
      $(`avatar-${p}`).innerHTML = ehMaquina(p)
        ? `<img src="assets/nagila/nagila.jpg" alt="">`
        : `<span class="avatar-peca dono-${p}">${nomeDe(p).charAt(0)}</span>`;
    });
  }

  function chegadas(p) {
    return jogo.pecas.filter((pc) => pc.dono === p && DESTINO[p].includes(pc.no)).length;
  }

  const relogioTxt = (s) => { s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function relogioAtual(p) {
    return jogo.relogio[p] + (jogo.marco !== null && jogo.vez === p ? (performance.now() - jogo.marco) / 1000 : 0);
  }
  function pararRelogio() {
    if (jogo.marco === null) return;
    jogo.relogio[jogo.vez] += (performance.now() - jogo.marco) / 1000;
    jogo.marco = null;
  }
  function ligarRelogio() { if (jogo.marco === null && !jogo.pausado && !jogo.acabou) jogo.marco = performance.now(); }

  function atualizarTela() {
    if (!jogo) return;
    [0, 1].forEach((p) => {
      $(`relogio-${p}`).textContent = relogioTxt(relogioAtual(p));
      const c = chegadas(p);
      $(`chegadas-${p}`).innerHTML = Array.from({ length: jogo.n }, (_, k) => `<i class="${k < c ? 'cheia' : ''} dono-${p}"></i>`).join('');
      $(`chegadas-${p}`).setAttribute('aria-label', `${c} de ${jogo.n} peças já chegaram`);
      $(`card-${p}`).classList.toggle('vez', jogo.vez === p && !jogo.acabou);
    });
    // casas: rótulos para leitor de tela e destaques
    const destinos = jogo.selecionada !== null ? VIZINHOS[jogo.selecionada].filter((j) => jogo.pos[j] === -1) : [];
    document.querySelectorAll('#camada-casas .casa').forEach((b) => {
      const i = Number(b.dataset.i);
      const pc = pecaEm(i);
      b.classList.toggle('destino', destinos.includes(i));
      b.classList.toggle('dica', !!jogo.dicaAtual && jogo.dicaAtual[1] === i);
      b.setAttribute('aria-label', pc
        ? `Peça ${pc.num} ${donoArtigo(pc.dono)}${jogo.selecionada === i ? ', escolhida' : ''}`
        : destinos.includes(i) ? 'Casa livre: pode ir para cá' : 'Casa livre');
    });
    jogo.pecas.forEach((pc) => {
      pc.el.classList.toggle('escolhida', jogo.selecionada === pc.no);
      pc.el.classList.toggle('dica', !!jogo.dicaAtual && jogo.dicaAtual[0] === pc.no);
      pc.el.classList.toggle('chegou', DESTINO[pc.dono].includes(pc.no));
    });
  }
  setInterval(() => { if (jogo && !jogo.acabou && $('tela-jogo').classList.contains('ativa')) {
    [0, 1].forEach((p) => { $(`relogio-${p}`).textContent = relogioTxt(relogioAtual(p)); });
  } }, 250);

  function mensagem(texto) { $('mensagem').innerHTML = texto; }

  // ---------- Vez de cada um ----------
  let timerMaquina = null;

  function comecarVez() {
    if (!jogo || jogo.acabou) return;
    const p = jogo.vez;
    const lista = Tabuleiro.jogadas(jogo.pos, p);
    if (!lista.length) {
      if (!Tabuleiro.jogadas(jogo.pos, 1 - p).length) return fimDaPartida('travou');
      jogo.passou[p]++;
      jogo.bloqueado = true;
      mensagem(`Nenhuma peça ${donoArtigo(p)} pode andar agora: passa a vez.`);
      setTimeout(() => { if (!jogo.acabou) { jogo.vez = 1 - p; comecarVez(); } }, 1800);
      return;
    }
    jogo.emVez = true;
    jogo.inicioJogada = jogo.relogio[p];
    jogo.selecionada = null;
    jogo.dicaAtual = null;
    jogo.errosSeguidos = 0;
    ligarRelogio();
    atualizarTela();
    if (ehMaquina(p)) {
      jogo.bloqueado = true;
      proEstado('tchau');
      mensagem(`A ${PROFISSIONAL} está pensando… 🤔`);
      const [a, b] = ESPERA_MAQUINA;
      timerMaquina = setTimeout(jogadaMaquina, a + Math.random() * (b - a));
    } else {
      jogo.bloqueado = false;
      const primeira = !jogo.jogadas.some((j) => j.p === p);
      if (jogo.parado[p] >= Tabuleiro.TRAVADO + 2) {
        mensagem('Ninguém está conseguindo passar? Às vezes é preciso <b>recuar uma peça</b> para abrir caminho! 💡');
      } else {
        mensagem(jogo.modo === 'dupla' ? `Vez de <b>${nomeDe(p)}</b> (peças ${p === 0 ? 'azuis, embaixo' : 'vermelhas, em cima'}).` : `Sua vez, <b>${nomeDe(p)}</b>! Toque numa peça azul.`);
      }
      if (primeira) falar(jogo.modo === 'dupla' ? `Vez de ${nomeDe(p).toLowerCase()}` : 'Sua vez!');
    }
  }

  function jogadaMaquina() {
    if (!jogo || jogo.acabou || jogo.pausado) return;
    const m = Tabuleiro.escolher(jogo.pos, 1, jogo.nivel, jogo.ultima[1], jogo.parado[1]);
    if (m) mover(m[0], m[1]);
  }

  // executa a jogada (já conferida) e registra para o relatório
  function mover(de, para) {
    const p = jogo.vez;
    const pc = pecaEm(de);
    pararRelogio();
    jogo.emVez = false;
    const tempo = jogo.relogio[p] - jogo.inicioJogada;
    const delta = FALTA[p][para] - FALTA[p][de];
    const anterior = jogo.ultima[p];
    jogo.jogadas.push({
      p, num: pc.num, de, para, tempo,
      tipo: delta < 0 ? 'avancou' : delta > 0 ? 'voltou' : 'lado',
      vaiVolta: !!anterior && anterior[0] === para && anterior[1] === de,
      dica: !!jogo.dicaAtual && jogo.dicaAtual[0] === de && jogo.dicaAtual[1] === para,
      lado: LADO[NOS[para].id] || null,
    });
    jogo.ultima[p] = [de, para];
    jogo.pos[de] = -1;
    jogo.pos[para] = p;
    pc.no = para;
    posicionar(pc);
    jogo.selecionada = null;
    jogo.dicaAtual = null;

    // progresso: se ficou várias jogadas sem chegar mais perto, a máquina passa a abrir caminho
    const f = Tabuleiro.falta(jogo.pos, p);
    if (f < jogo.melhor[p]) { jogo.melhor[p] = f; jogo.parado[p] = 0; } else jogo.parado[p]++;

    const chegouAgora = DESTINO[p].includes(para) && !DESTINO[p].includes(de);
    if (chegouAgora && pc.chegouEm === null) pc.chegouEm = jogo.relogio[p];
    som(chegouAgora ? 'chegou' : 'mover');
    if (ehMaquina(p)) proEstado(chegouAgora ? 'feliz' : 'parada', chegouAgora ? 1600 : 0);
    if (chegouAgora && !ehMaquina(p)) {
      proEstado('feliz', 1600);
      const c = chegadas(p);
      if (c < jogo.n) falar(c === jogo.n - 1 ? 'Falta só uma!' : 'Uma peça chegou!');
    }
    jogo.bloqueado = true;
    atualizarTela();

    if (Tabuleiro.venceu(jogo.pos, p)) return setTimeout(() => fimDaPartida('venceu', p), 450);
    if (jogo.jogadas.filter((j) => j.p === p).length >= MAX_JOGADAS && jogo.jogadas.filter((j) => j.p === 1 - p).length >= MAX_JOGADAS) {
      return setTimeout(() => fimDaPartida('limite'), 450);
    }
    setTimeout(() => { if (!jogo.acabou && !jogo.pausado) { jogo.vez = 1 - p; comecarVez(); } else if (!jogo.acabou) jogo.vez = 1 - p; }, 420);
  }

  // ---------- Toques no tabuleiro ----------
  function toqueFora(p, tipo, texto) {
    jogo.toques.push({ p, tipo });
    jogo.errosSeguidos++;
    som('ops');
    mensagem(texto);
    if (jogo.errosSeguidos >= DICA_APOS && !jogo.dicaAtual) mostrarDica(false);
  }

  function tocarCasa(i) {
    if (!jogo || jogo.acabou || jogo.pausado) return;
    const pc = pecaEm(i);
    // tocou na vez da Nágila: conta como impulso (controle inibitório), sem castigo
    if (ehMaquina(jogo.vez)) {
      if (pc && pc.dono === 0 || jogo.bloqueado) {
        jogo.toques.push({ p: 0, tipo: 'fora-da-vez' });
        mensagem(`Espere um pouquinho: agora é a vez da ${PROFISSIONAL}. ✋`);
      }
      return;
    }
    if (jogo.bloqueado) return;
    const p = jogo.vez;
    if (pc && pc.dono === p) {
      if (jogo.selecionada === i) { jogo.selecionada = null; atualizarTela(); mensagem('Escolha uma peça.'); return; }
      if (!Tabuleiro.podeAndar(jogo.pos, i)) {
        toqueFora(p, 'peca-presa', `A peça ${pc.num} está sem caminho livre agora. Tente outra peça.`);
        atualizarTela();
        return;
      }
      if (jogo.selecionada !== null) jogo.trocas[p]++;
      jogo.selecionada = i;
      atualizarTela();
      mensagem(`Peça ${pc.num} escolhida. Agora toque numa <b>bolinha brilhando</b>.`);
      return;
    }
    if (pc) {
      toqueFora(p, 'peca-outro', `Essa peça é ${donoArtigo(pc.dono)}. Mexa nas suas peças ${p === 0 ? 'azuis' : 'vermelhas'}.`);
      atualizarTela();
      return;
    }
    if (jogo.selecionada === null) { mensagem(`Primeiro toque numa das suas peças ${p === 0 ? 'azuis' : 'vermelhas'}.`); return; }
    if (VIZINHOS[jogo.selecionada].includes(i)) { jogo.errosSeguidos = 0; mover(jogo.selecionada, i); return; }
    toqueFora(p, 'fora-da-linha', 'Por aí não dá: siga a <b>linha</b> até uma bolinha vizinha. 🙂');
    falar('Siga a linha até a bolinha vizinha.');
    atualizarTela();
  }

  function mostrarDica(pedida) {
    if (!jogo || jogo.acabou || jogo.bloqueado || ehMaquina(jogo.vez)) return;
    const p = jogo.vez;
    const m = Tabuleiro.escolher(jogo.pos, p, 'dica', jogo.ultima[p], jogo.parado[p]);
    if (!m) return;
    jogo.dicas[p]++;
    jogo.dicaAtual = m;
    jogo.selecionada = m[0];
    atualizarTela();
    mensagem(`${pedida ? 'Dica' : 'Vou te ajudar'}: leve a <b>peça ${pecaEm(m[0]).num}</b> para a bolinha que está brilhando. 💡`);
  }
  $('btn-dica').onclick = () => mostrarDica(true);

  // arrastar (dedo, mouse ou caneta) ou tocar e tocar
  let arrasto = null;
  const camada = $('camada-casas');
  camada.addEventListener('pointerdown', (e) => {
    const casa = e.target.closest('.casa');
    if (!casa || !jogo) return;
    e.preventDefault();
    const i = Number(casa.dataset.i);
    const pc = pecaEm(i);
    const podeArrastar = pc && !jogo.bloqueado && !jogo.acabou && !ehMaquina(jogo.vez) && pc.dono === jogo.vez && Tabuleiro.podeAndar(jogo.pos, i);
    arrasto = { i, x0: e.clientX, y0: e.clientY, id: e.pointerId, fantasma: null, pc: podeArrastar ? pc : null };
    try { casa.setPointerCapture(e.pointerId); } catch (err) {}
  });
  camada.addEventListener('pointermove', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id || !arrasto.pc) return;
    if (!arrasto.fantasma && Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) > 12) {
      if (jogo.selecionada !== arrasto.i) { if (jogo.selecionada !== null) jogo.trocas[jogo.vez]++; jogo.selecionada = arrasto.i; atualizarTela(); }
      const f = arrasto.pc.el.cloneNode(true);
      f.classList.add('fantasma');
      f.style.width = `${arrasto.pc.el.offsetWidth}px`;
      f.style.height = `${arrasto.pc.el.offsetHeight}px`;
      f.style.fontSize = getComputedStyle(arrasto.pc.el).fontSize;
      document.body.appendChild(f);
      arrasto.fantasma = f;
      arrasto.pc.el.classList.add('arrastando');
    }
    if (arrasto.fantasma) { arrasto.fantasma.style.left = `${e.clientX}px`; arrasto.fantasma.style.top = `${e.clientY}px`; }
  });
  function soltar(e, cancelado) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const a = arrasto;
    arrasto = null;
    if (a.fantasma) { a.fantasma.remove(); a.pc.el.classList.remove('arrastando'); }
    if (cancelado) return;
    if (!a.fantasma) { tocarCasa(a.i); return; }
    const alvo = casaPerto(e.clientX, e.clientY);
    if (alvo !== null && alvo !== a.i) tocarCasa(alvo);
  }
  camada.addEventListener('pointerup', (e) => soltar(e, false));
  camada.addEventListener('pointercancel', (e) => soltar(e, true));
  // teclado: Enter/Espaço na casa
  camada.addEventListener('click', (e) => { const casa = e.target.closest('.casa'); if (casa && e.detail === 0) tocarCasa(Number(casa.dataset.i)); });

  // casa mais perto do ponto onde soltou (margem generosa, para mãos com pouca precisão)
  function casaPerto(x, y) {
    let melhor = null, menor = Infinity;
    document.querySelectorAll('#camada-casas .casa').forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < r.width * 0.9 && d < menor) { menor = d; melhor = Number(c.dataset.i); }
    });
    return melhor;
  }

  // ---------- Pausa ----------
  $('btn-pausa').onclick = () => {
    if (!jogo || jogo.acabou) return;
    pararRelogio();
    jogo.pausado = true;
    clearTimeout(timerMaquina);
    $('pausa').hidden = false;
    $('btn-continuar').focus();
  };
  $('btn-continuar').onclick = () => { $('pausa').hidden = true; continuar(); };
  function continuar() {
    jogo.pausado = false;
    if (!jogo.emVez) return comecarVez();
    // continua a mesma vez: o tempo que já tinha pensado continua contando
    ligarRelogio();
    if (ehMaquina(jogo.vez)) timerMaquina = setTimeout(jogadaMaquina, ESPERA_MAQUINA[0]);
  }
  $('btn-terminar').onclick = () => { $('pausa').hidden = true; fimDaPartida('interrompida'); };

  // ---------- Fim e relatório ----------
  function fimDaPartida(motivo, vencedor = null) {
    if (jogo.acabou) return;
    clearTimeout(timerMaquina);
    pararRelogio();
    jogo.acabou = true;
    jogo.bloqueado = true;
    if (motivo === 'limite' || motivo === 'travou') {
      // quem estiver mais perto de terminar leva
      const f0 = Tabuleiro.falta(jogo.pos, 0), f1 = Tabuleiro.falta(jogo.pos, 1);
      vencedor = f0 < f1 ? 0 : f1 < f0 ? 1 : null;
    }
    jogo.motivo = motivo;
    jogo.vencedor = vencedor;
    const relatorios = humanos().map((p) => calcularRelatorio(p));
    relatorios.forEach(salvarHistorico);
    mostrarFim(relatorios);
  }

  const classe = (pontos) => (pontos >= 1.5 ? 'otimo' : pontos >= 0.75 ? 'regular' : 'treinar');
  const NOME_CLASSE = { otimo: 'Ótimo', regular: 'Regular', treinar: 'Precisa treinar mais' };
  const COR_CLASSE = { otimo: '#2e7d32', regular: '#b45309', treinar: '#c62828' };
  const VALOR = { otimo: 2, regular: 1, treinar: 0 };
  const fmt = (n) => n.toFixed(1).replace('.', ',');
  const vezes = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function calcularRelatorio(p) {
    const js = jogo.jogadas.filter((j) => j.p === p);
    const toques = jogo.toques.filter((t) => t.p === p);
    const n = js.length;
    const conta = (f) => js.filter(f).length;
    const avancou = conta((j) => j.tipo === 'avancou'), lado = conta((j) => j.tipo === 'lado'), voltou = conta((j) => j.tipo === 'voltou');
    const rapidas = conta((j) => j.tempo < IMPULSIVA);
    const demoradas = conta((j) => j.tempo > DEMORADA);
    const vaiVolta = conta((j) => j.vaiVolta);
    const foraLinha = toques.filter((t) => t.tipo === 'fora-da-linha').length;
    const pecaOutro = toques.filter((t) => t.tipo === 'peca-outro').length;
    const pecaPresa = toques.filter((t) => t.tipo === 'peca-presa').length;
    const foraVez = toques.filter((t) => t.tipo === 'fora-da-vez').length;
    const lados = [...new Set(js.map((j) => j.lado).filter(Boolean))];
    const pecasMovidas = new Set(js.map((j) => j.num)).size;
    const tempo = jogo.relogio[p];
    const media = n ? js.reduce((s, j) => s + j.tempo, 0) / n : 0;
    const pctAvanco = n ? Math.round((avancou / n) * 100) : 0;

    const porPeca = jogo.pecas.filter((pc) => pc.dono === p).map((pc) => {
      const dela = js.filter((j) => j.num === pc.num);
      return {
        num: pc.num, jogadas: dela.length, tempo: dela.reduce((s, j) => s + j.tempo, 0),
        chegou: DESTINO[p].includes(pc.no), chegouEm: pc.chegouEm,
      };
    });

    // habilidades (critérios simples, para apoiar a observação)
    const taxa = (x) => (n ? x / n : 0);
    const nivel = (v, bom, medio, menorMelhor = true) => (menorMelhor ? (v <= bom ? 'otimo' : v <= medio ? 'regular' : 'treinar') : (v >= bom ? 'otimo' : v >= medio ? 'regular' : 'treinar'));
    const erradas = foraLinha + pecaOutro + pecaPresa;
    const habilidades = n < 3 ? [] : [
      { nome: 'Atenção', classe: nivel(taxa(erradas), 0.1, 0.3),
        texto: `${vezes(erradas, 'toque', 'toques')} fora da regra em ${vezes(n, 'jogada', 'jogadas')}` },
      { nome: 'Planejamento', classe: vaiVolta > Math.max(2, n * 0.15) ? 'treinar' : nivel(pctAvanco, 70, 50, false),
        texto: `${pctAvanco}% das jogadas levaram a peça para mais perto · ${vezes(vaiVolta, 'vai e volta', 'vai e volta')}` },
      { nome: 'Controle inibitório', classe: nivel(taxa(rapidas + foraVez), 0.15, 0.35),
        texto: `${vezes(rapidas, 'jogada muito rápida', 'jogadas muito rápidas')} (menos de ${fmt(IMPULSIVA)} s)` + (jogo.modo === 'maquina' ? ` · ${vezes(foraVez, 'toque', 'toques')} na vez da ${PROFISSIONAL}` : '') },
      { nome: 'Soluções diversas', classe: lados.length >= 3 ? 'otimo' : lados.length === 2 ? 'regular' : 'treinar',
        texto: `Caminhos usados: ${lados.length ? lados.join(', ') : 'nenhum'} · ${pecasMovidas} de ${jogo.n} peças movimentadas` },
    ];
    const geral = habilidades.length ? classe(habilidades.reduce((s, h) => s + VALOR[h.classe], 0) / habilidades.length) : null;

    const resultado = jogo.motivo === 'interrompida' ? 'interrompida' : jogo.vencedor === null ? 'empate' : jogo.vencedor === p ? 'venceu' : 'perdeu';

    // pontos de atenção (texto para a profissional)
    const pontos = [];
    if (rapidas) pontos.push(`Fez <b>${vezes(rapidas, 'jogada', 'jogadas')}</b> em menos de ${fmt(IMPULSIVA)} s: observar se agiu antes de pensar.`);
    if (foraVez) pontos.push(`Tentou mexer <b>${vezes(foraVez, 'vez', 'vezes')}</b> na vez da ${PROFISSIONAL} (esperar a vez).`);
    if (foraLinha) pontos.push(`Tentou andar fora das linhas ou pular casa <b>${vezes(foraLinha, 'vez', 'vezes')}</b>.`);
    if (pecaOutro) pontos.push(`Tocou na peça do outro jogador <b>${vezes(pecaOutro, 'vez', 'vezes')}</b>.`);
    if (pecaPresa) pontos.push(`Escolheu peça sem caminho livre <b>${vezes(pecaPresa, 'vez', 'vezes')}</b>.`);
    if (vaiVolta) pontos.push(`Voltou com a peça para a casa de onde tinha acabado de sair <b>${vezes(vaiVolta, 'vez', 'vezes')}</b> (vai e volta).`);
    if (voltou) pontos.push(`Recuou peças <b>${vezes(voltou, 'vez', 'vezes')}</b> (pode ser estratégia para abrir caminho ou falta de plano).`);
    if (demoradas) pontos.push(`Pensou mais de ${DEMORADA} s em <b>${vezes(demoradas, 'jogada', 'jogadas')}</b>.`);
    if (n >= 3 && lados.length === 1) pontos.push(`Usou só o caminho da <b>${lados[0]}</b>: vale mostrar outros caminhos.`);
    if (jogo.trocas[p] >= 3) pontos.push(`Mudou de ideia (trocou a peça escolhida) <b>${jogo.trocas[p]} vezes</b>.`);
    if (jogo.dicas[p]) pontos.push(`Precisou de dica <b>${vezes(jogo.dicas[p], 'vez', 'vezes')}</b>.`);
    const trabalhosa = [...porPeca].sort((a, b) => b.tempo - a.tempo)[0];
    if (trabalhosa && trabalhosa.jogadas >= 4) pontos.push(`A peça mais trabalhosa foi a <b>${trabalhosa.num}</b>: ${vezes(trabalhosa.jogadas, 'jogada', 'jogadas')} e ${fmt(trabalhosa.tempo)} s pensando.`);
    if (!pontos.length) pontos.push('Nenhum ponto de atenção forte nesta partida. Continue praticando!');

    return {
      p, nome: nomeDe(p), adversario: ehMaquina(1 - p) ? `${PROFISSIONAL} (nível ${NIVEL_NOME[jogo.nivel]})` : nomeDe(1 - p),
      data: jogo.inicio, n: jogo.n, resultado, jogadas: js, totalJogadas: n, tempo, media, pctAvanco,
      avancou, lado, voltou, rapidas, erradas, foraVez, dicas: jogo.dicas[p], chegaram: chegadas(p),
      porPeca, habilidades, geral, pontos, passou: jogo.passou[p],
    };
  }

  function chaveHistorico(nomeJogador) { return CHAVE_HIST + nomeJogador.toLowerCase(); }
  function salvarHistorico(r) {
    if (!r.totalJogadas) return;
    const h = ler(chaveHistorico(r.nome), []);
    h.push({ data: r.data.toISOString(), pctAvanco: r.pctAvanco, media: r.media, resultado: r.resultado, jogadas: r.totalJogadas });
    guardar(chaveHistorico(r.nome), h.slice(-20));
  }

  let relatorios = [];
  let atual = 0;
  function mostrarFim(lista) {
    relatorios = lista;
    atual = 0;
    $('dica-envio').hidden = true;
    mostrar('tela-relatorio');
    const r0 = lista[0];
    let titulo, resumo, festa = true;
    if (jogo.motivo === 'interrompida') {
      titulo = 'Partida terminada'; resumo = 'Veja abaixo como foi até aqui.'; festa = false;
    } else if (jogo.vencedor === null) {
      titulo = 'Empate!'; resumo = 'Os dois ficaram bem pertinho. Vamos de novo?';
    } else if (jogo.modo === 'dupla') {
      titulo = `Parabéns, ${nomeDe(jogo.vencedor)}!`;
      resumo = `Levou todas as peças para o outro lado! ⭐`;
    } else if (jogo.vencedor === 0) {
      titulo = `Parabéns, ${nome}!`;
      resumo = `Você levou todas as peças para o outro lado em <b>${r0.totalJogadas}</b> jogadas! ⭐`;
    } else {
      titulo = `Muito bem, ${nome}!`;
      resumo = `A ${PROFISSIONAL} chegou primeiro desta vez, mas você levou <b>${r0.chegaram}</b> de ${jogo.n} peças! Vamos de novo?`;
      festa = false;
    }
    if (jogo.motivo === 'limite' || jogo.motivo === 'travou') resumo += ' (a partida parou porque ninguém conseguia mais avançar)';
    $('fim-titulo').textContent = titulo;
    $('fim-resumo').innerHTML = resumo;
    $('pro-fim').className = `pro-sprite grande ${festa ? 'feliz' : 'tchau'}`;
    if (festa) som('vitoria');
    setTimeout(() => falar(`${titulo.replace(/!/g, '.')} ${resumo.replace(/<[^>]+>/g, '').replace(/⭐/g, '')}`, true), 500);

    $('abas-jogador').hidden = lista.length < 2;
    $('abas-jogador').innerHTML = lista.map((r, k) => `<button type="button" class="chip" data-k="${k}" aria-pressed="${k === 0}">${r.nome}</button>`).join('');
    mostrarRelatorio(lista[0]);
  }
  $('abas-jogador').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    atual = Number(chip.dataset.k);
    $('abas-jogador').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    mostrarRelatorio(relatorios[atual]);
  });

  const TEXTO_RESULTADO = { venceu: 'Venceu', perdeu: 'Não venceu desta vez', empate: 'Empate', interrompida: 'Partida interrompida' };

  function mostrarRelatorio(r) {
    $('relatorio-info').textContent = `${r.nome} · contra ${r.adversario} · ${r.n} peças · ${r.data.toLocaleDateString('pt-BR')} às ${r.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    $('selo').className = `selo ${r.geral || 'regular'}`;
    $('selo').innerHTML = r.geral
      ? `${NOME_CLASSE[r.geral]}<small>${TEXTO_RESULTADO[r.resultado]} · média das 4 habilidades</small>`
      : `Poucas jogadas<small>${TEXTO_RESULTADO[r.resultado]} · são precisas pelo menos 3 jogadas para avaliar</small>`;
    $('numeros').innerHTML = [
      ['Jogadas', r.totalJogadas],
      ['Tempo no relógio', relogioTxt(r.tempo)],
      ['Por jogada', `${fmt(r.media)} s`],
      ['Peças que chegaram', `${r.chegaram}/${r.n}`],
      ['Avançaram', `${r.pctAvanco}%`],
      ['Toques fora da regra', r.erradas],
    ].map(([t, v]) => `<div class="numero"><b>${v}</b>${t}</div>`).join('');
    $('habilidades').innerHTML = r.habilidades.length
      ? r.habilidades.map((h) => `<div class="habilidade ${h.classe}"><b>${h.nome}</b><span class="nivel">${NOME_CLASSE[h.classe]}</span><small>${h.texto}</small></div>`).join('')
      : '<p>Ainda sem jogadas suficientes para observar as habilidades.</p>';
    $('dificuldades').innerHTML = r.pontos.map((d) => `<li>${d}</li>`).join('');
    graficoJogadas($('grafico-jogadas'), r);
    graficoPecas($('grafico-pecas'), r);
    const h = ler(chaveHistorico(r.nome), []);
    $('evolucao-area').hidden = h.length < 2;
    if (h.length >= 2) graficoEvolucao($('grafico-evolucao'), h);
  }

  // ---------- Gráficos (canvas, também vão para o PDF) ----------
  const FONTE = 'Andika, Verdana, sans-serif';
  const COR_TIPO = { avancou: '#2e7d32', lado: '#1f6fb4', voltou: '#c62828' };

  function eixo(ctx, W, H, m, maxV, passo, sufixo) {
    ctx.font = `22px ${FONTE}`;
    ctx.fillStyle = '#545b6e';
    ctx.strokeStyle = '#e4e0d8';
    ctx.lineWidth = 2;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= maxV + 0.001; v += passo) {
      const y = H - m.b - (v / maxV) * (H - m.t - m.b);
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke();
      ctx.fillText(`${Math.round(v * 10) / 10}${sufixo}`, m.l - 10, y);
    }
  }
  const passoEixo = (maxV) => (maxV > 40 ? 10 : maxV > 10 ? 5 : 2);

  function semDados(ctx, W, H, texto = 'Ainda sem jogadas nesta partida.') {
    ctx.fillStyle = '#545b6e';
    ctx.font = `28px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, W / 2, H / 2);
  }

  function graficoJogadas(cv, r) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 20, t: 24, b: 50 };
    ctx.clearRect(0, 0, W, H);
    const js = r.jogadas;
    if (!js.length) return semDados(ctx, W, H);
    const maxV = Math.max(6, Math.ceil(Math.max(...js.map((j) => j.tempo)) + 1));
    eixo(ctx, W, H, m, maxV, passoEixo(maxV), ' s');
    const y = (v) => H - m.b - (v / maxV) * (H - m.t - m.b);
    ctx.setLineDash([10, 8]); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m.l, y(IMPULSIVA)); ctx.lineTo(W - m.r, y(IMPULSIVA)); ctx.stroke(); ctx.setLineDash([]);
    const largura = (W - m.l - m.r) / js.length;
    const barra = Math.max(2, Math.min(40, largura * 0.7));
    js.forEach((j, k) => {
      const x = m.l + largura * k + (largura - barra) / 2;
      ctx.fillStyle = COR_TIPO[j.tipo];
      ctx.fillRect(x, y(j.tempo), barra, Math.max(2, H - m.b - y(j.tempo)));
      if (j.dica) { ctx.fillStyle = '#b8862f'; ctx.font = `bold 18px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('💡', x + barra / 2, y(j.tempo) - 2); }
    });
    ctx.fillStyle = '#545b6e'; ctx.font = `18px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const marca = Math.max(1, Math.ceil(js.length / 15));
    js.forEach((_, k) => { if (k % marca === 0 || k === js.length - 1) ctx.fillText(String(k + 1), m.l + largura * k + largura / 2, H - m.b + 8); });
    ctx.fillText('número da jogada', W / 2, H - 22);
  }

  function graficoPecas(cv, r) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 20, t: 40, b: 80 };
    ctx.clearRect(0, 0, W, H);
    const itens = r.porPeca;
    if (!r.jogadas.length) return semDados(ctx, W, H);
    const maxV = Math.max(6, Math.ceil(Math.max(...itens.map((x) => x.tempo)) + 1));
    eixo(ctx, W, H, m, maxV, passoEixo(maxV), ' s');
    const largura = (W - m.l - m.r) / itens.length;
    const barra = Math.min(90, largura * 0.55);
    const cor = r.p === 0 ? '#1e50c8' : '#d32f2f';
    itens.forEach((x, k) => {
      const cx = m.l + largura * k + largura / 2;
      const h = (x.tempo / maxV) * (H - m.t - m.b);
      ctx.fillStyle = cor;
      ctx.globalAlpha = x.chegou ? 1 : 0.45;
      ctx.fillRect(cx - barra / 2, H - m.b - h, barra, Math.max(h, 3));
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1f2433'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = `bold 21px ${FONTE}`;
      ctx.fillText(`${fmt(x.tempo)}s`, cx, H - m.b - h - 4);
      // a peça (bolinha com número)
      ctx.beginPath(); ctx.arc(cx, H - m.b + 24, 17, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.font = `bold 20px ${FONTE}`;
      ctx.fillText(String(x.num), cx, H - m.b + 25);
      ctx.fillStyle = '#545b6e'; ctx.font = `17px ${FONTE}`; ctx.textBaseline = 'top';
      ctx.fillText(`${vezes(x.jogadas, 'jogada', 'jogadas')} ${x.chegou ? '✓' : ''}`, cx, H - m.b + 46);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#545b6e'; ctx.font = `19px ${FONTE}`;
    ctx.fillText('barra = tempo pensando nas jogadas da peça · ✓ = chegou do outro lado', m.l, 6);
  }

  function graficoEvolucao(cv, h) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 30, t: 30, b: 50 };
    ctx.clearRect(0, 0, W, H);
    eixo(ctx, W, H, m, 100, 25, '%');
    const px = (i) => m.l + (h.length === 1 ? 0 : (i / (h.length - 1)) * (W - m.l - m.r));
    const py = (v) => H - m.b - (v / 100) * (H - m.t - m.b);
    ctx.strokeStyle = '#1d2b4a'; ctx.lineWidth = 4;
    ctx.beginPath();
    h.forEach((x, i) => (i ? ctx.lineTo(px(i), py(x.pctAvanco)) : ctx.moveTo(px(i), py(x.pctAvanco))));
    ctx.stroke();
    h.forEach((x, i) => {
      ctx.fillStyle = x.resultado === 'venceu' ? '#2e7d32' : '#b8862f';
      ctx.beginPath(); ctx.arc(px(i), py(x.pctAvanco), 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#545b6e'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = `17px ${FONTE}`;
      const d = new Date(x.data);
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, px(i), H - m.b + 12);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = `19px ${FONTE}`;
    ctx.fillText('% de jogadas que levaram a peça para mais perto · verde = venceu', m.l, 4);
  }

  // ---------- PDF e compartilhar ----------
  const limpar = (html) => html.replace(/<[^>]+>/g, '');
  const canvasNovo = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

  function gerarPDF(lista) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const L = 15, Wp = 180;
    let y;
    const novaPagina = () => { doc.addPage(); y = 18; };
    const titulo = (t) => {
      if (y > 262) novaPagina();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(29, 43, 74);
      doc.text(t, L, y); y += 7;
    };
    const imagem = (cv, t) => {
      const h = (cv.height / cv.width) * Wp;
      if (y + h + 10 > 285) novaPagina();
      titulo(t); y -= 4;
      doc.addImage(cv.toDataURL('image/png'), 'PNG', L, y, Wp, h, undefined, 'FAST');
      y += h + 8;
    };

    lista.forEach((r, k) => {
      if (k) doc.addPage();
      doc.setFillColor(29, 43, 74);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
      doc.text(`Desafio das Peças - Relatório de ${r.nome}`, L, 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      doc.text(`Contra ${r.adversario}  ·  ${r.n} peças  ·  ${r.data.toLocaleDateString('pt-BR')} ${r.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, L, 23);
      y = 40;
      const cor = { otimo: [46, 125, 50], regular: [180, 83, 9], treinar: [198, 40, 40] }[r.geral || 'regular'];
      doc.setFillColor(...cor);
      doc.roundedRect(L, y, Wp, 16, 3, 3, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text(`${r.geral ? NOME_CLASSE[r.geral] : 'Poucas jogadas'}  ·  ${TEXTO_RESULTADO[r.resultado]}`, L + 5, y + 10.5);
      y += 24;
      doc.setTextColor(31, 36, 51); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text(`Jogadas: ${r.totalJogadas}   Tempo no relógio: ${relogioTxt(r.tempo)}   Média por jogada: ${fmt(r.media)} s   Peças que chegaram: ${r.chegaram}/${r.n}`, L, y); y += 6;
      doc.text(`Jogadas que avançaram: ${r.pctAvanco}%   De lado: ${r.lado}   Recuos: ${r.voltou}   Toques fora da regra: ${r.erradas}   Dicas: ${r.dicas}`, L, y); y += 9;

      titulo('Habilidades observadas');
      doc.setFontSize(10.5);
      if (!r.habilidades.length) { doc.setFont('helvetica', 'normal'); doc.text('Poucas jogadas para avaliar.', L, y); y += 6; }
      r.habilidades.forEach((h) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...{ otimo: [46, 125, 50], regular: [180, 83, 9], treinar: [198, 40, 40] }[h.classe]);
        doc.text(`${h.nome}: ${NOME_CLASSE[h.classe]}`, L, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(84, 91, 110);
        const linhas = doc.splitTextToSize(h.texto, Wp - 80);
        doc.text(linhas, L + 80, y);
        y += Math.max(1, linhas.length) * 5 + 1.5;
      });
      y += 3;

      const c1 = canvasNovo(900, 400), c2 = canvasNovo(900, 360);
      graficoJogadas(c1, r);
      graficoPecas(c2, r);
      imagem(c1, 'Tempo para pensar em cada jogada (verde avançou, azul de lado, vermelho voltou)');
      imagem(c2, 'Tempo por peça');

      titulo('Pontos de atenção');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(31, 36, 51);
      r.pontos.forEach((d) => {
        const linhas = doc.splitTextToSize(`• ${limpar(d)}`, Wp);
        if (y + linhas.length * 5.2 > 285) novaPagina();
        doc.text(linhas, L, y); y += linhas.length * 5.2 + 1;
      });
      y += 3;

      titulo('Peça por peça');
      doc.setFontSize(10); doc.setTextColor(31, 36, 51);
      doc.text('Peça', L, y); doc.text('Jogadas', L + 25, y); doc.text('Tempo pensando', L + 55, y); doc.text('Chegou?', L + 100, y); doc.text('Chegou com (relógio)', L + 130, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      r.porPeca.forEach((x) => {
        if (y > 285) novaPagina();
        doc.text(String(x.num), L, y); doc.text(String(x.jogadas), L + 25, y); doc.text(`${fmt(x.tempo)} s`, L + 55, y);
        doc.text(x.chegou ? 'sim' : 'não', L + 100, y); doc.text(x.chegouEm !== null ? relogioTxt(x.chegouEm) : '-', L + 130, y);
        y += 5.2;
      });
      y += 4;
      const h = ler(chaveHistorico(r.nome), []);
      if (h.length >= 2) { const c3 = canvasNovo(900, 300); graficoEvolucao(c3, h); imagem(c3, 'Evolução nas últimas partidas'); }
      if (y > 275) novaPagina();
      doc.setFontSize(9); doc.setTextColor(120, 120, 130);
      doc.text(doc.splitTextToSize('Indicadores para apoiar a observação da profissional; não são diagnóstico. Jogada muito rápida: menos de 1,5 s. Habilidades: Atenção (toques fora da regra), Planejamento (jogadas que aproximam a peça do objetivo e vai e volta), Controle inibitório (jogadas muito rápidas e toques fora da vez), Soluções diversas (caminhos usados: esquerda, centro e direita).', Wp), L, y);
    });

    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFontSize(9); doc.setTextColor(120, 120, 130);
      doc.text('Nágila Jamaica · Neuropsicopedagoga · Av. Queiroz Júnior, 1081, sala 201 - Praia, Itabirito/MG · (31) 8883-3589', L, 287);
      doc.text('Desafio das Peças com a Nágila  ·  Pedagogia Gamificada  ·  © Marco Nunes - Todos os direitos reservados', L, 292);
    }
    return doc;
  }

  const nomeArquivo = (r) => `relatorio-desafio-${r.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${r.data.toISOString().slice(0, 10)}.pdf`;

  $('btn-pdf').onclick = () => { if (relatorios.length) gerarPDF(relatorios).save(nomeArquivo(relatorios[0])); };

  const linkWhats = (texto) => `https://wa.me/${TELEFONE_PRO}?text=${encodeURIComponent(texto)}`;

  $('btn-compartilhar').onclick = async () => {
    if (!relatorios.length) return;
    const r = relatorios[0];
    const doc = gerarPDF(relatorios);
    const arquivo = new File([doc.output('blob')], nomeArquivo(r), { type: 'application/pdf' });
    const texto = `Oi ${PROFISSIONAL}, segue o relatório do Desafio das Peças de ${relatorios.map((x) => x.nome).join(' e ')}`;
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: `Relatório de ${r.nome}`, text: texto });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // computador: baixa o PDF e abre o WhatsApp para anexar
    $('dica-envio').hidden = false;
    $('dica-envio').innerHTML = `O PDF foi baixado e o WhatsApp abriu. <b>Arraste o PDF para a conversa</b>${TELEFONE_PRO ? ` da ${PROFISSIONAL}` : ''} (ou toque no clipe 📎) e envie.`;
    doc.save(nomeArquivo(r));
    window.open(linkWhats(texto), '_blank', 'noopener');
  };

  if (TELEFONE_PRO) {
    $('btn-falar').hidden = false;
    $('btn-falar').href = linkWhats(`Oi ${PROFISSIONAL}! Vim pelo jogo Desafio das Peças.`);
  }

  $('btn-de-novo').onclick = () => novaPartida();
  $('btn-sair').onclick = () => { calar(); telaInicio(false); };

  // ---------- Instalar como app ----------
  let pedidoInstalacao = null;
  const rodandoComoApp = () => matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedidoInstalacao = e;
    $('btn-instalar').hidden = false;
  });
  window.addEventListener('appinstalled', () => { pedidoInstalacao = null; $('btn-instalar').hidden = true; });
  if (!rodandoComoApp()) $('btn-instalar').hidden = false;

  $('btn-instalar').onclick = async () => {
    if (pedidoInstalacao) {
      pedidoInstalacao.prompt();
      const { outcome } = await pedidoInstalacao.userChoice;
      pedidoInstalacao = null;
      if (outcome === 'accepted') $('btn-instalar').hidden = true;
      return;
    }
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const dentroDeApp = /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
    const fim = 'Abra pelo <b>ícone do jogo</b> na tela do celular.';
    let passos;
    if (ios) {
      const outroNavegador = /CriOS|OPiOS|OPT\/|FxiOS|EdgiOS/.test(ua);
      passos = [
        outroNavegador
          ? 'Toque em <b>Compartilhar</b> (quadrado com a seta ⬆, no menu ou na barra de endereço). Se não aparecer, abra este link no <b>Safari</b>.'
          : 'Toque em <b>Compartilhar</b> (quadrado com a seta ⬆, embaixo ou em cima da tela).',
        'Role a lista e escolha <b>Adicionar à Tela de Início</b>.',
        'Toque em <b>Adicionar</b>.',
        fim,
      ];
    } else if (/SamsungBrowser/.test(ua)) {
      passos = ['Toque em <b>☰</b> (menu, embaixo à direita).', 'Toque em <b>Adicionar página a → Tela inicial</b>.', 'Toque em <b>Adicionar</b>.', fim];
    } else if (/Firefox/.test(ua)) {
      passos = ['Toque em <b>⋮</b> (menu).', 'Toque em <b>Instalar</b> ou <b>Adicionar à tela inicial</b>.', fim];
    } else {
      passos = ['Toque em <b>⋮</b> no canto de cima do navegador.', 'Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial → Instalar</b>).', fim];
    }
    if (dentroDeApp) passos.unshift('⚠ Você abriu pelo navegador de outro app (WhatsApp, Instagram), que não instala jogos. Toque em <b>⋮ → Abrir no navegador</b> (no iPhone: abrir no <b>Safari</b>).');
    $('passos-instalar').innerHTML = passos.map((p) => `<li>${p}</li>`).join('');
    mostrar('tela-instalar');
  };
  $('btn-fechar-instalar').onclick = () => telaInicio(false);

  // começa pedindo o nome; se já tem nome salvo, vai para o início
  if (nome) telaInicio(false); else telaNome();

  // atalho para testes no console
  window.__desafio = { get jogo() { return jogo; }, tocar: (i) => tocarCasa(i), fim: (m, v) => jogo && fimDaPartida(m, v), mover: (a, b) => mover(a, b) };
})();
