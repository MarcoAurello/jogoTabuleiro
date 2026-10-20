# Desafio das Peças com a Nágila

Jogo de tabuleiro em HTML5 (funciona como app/PWA, offline) feito para a neuropsicopedagoga **Nágila Jamaica**.
Baseado no "Desafio das 4 peças" (tabuleiro de papel, referências em `referencias/`).
Treina **atenção, planejamento, controle inibitório e percepção de soluções diversas**.

## Regras
- Sempre **4 peças** de cada lado, na fileira de 5 casas (uma casa livre, como no tabuleiro de papel). Quem joga embaixo tem as peças **azuis**; em cima, as **vermelhas**.
- Objetivo: levar **todas as suas peças para a fileira do outro lado**.
- Anda pelas **linhas**, uma casa por vez, só para casa vazia. **Não pula** e **não come** peça.
- Se nenhuma peça pode andar, passa a vez. Se passar de 150 jogadas cada um, ou ninguém puder andar, vence quem estiver mais perto.
- **Dois cronômetros**: o de cada jogador só anda na vez dele (para enquanto a partida está pausada).

## Como começar (poucos passos)
1. Digita o nome (só na primeira vez; o aparelho lembra).
2. Escolhe o nível e toca em **Contra a Nágila** (a Nágila sempre começa) ou em **2 jogadores** (nome do 2º jogador é opcional; quem está embaixo começa).
3. As regras aparecem só na primeira partida do aparelho; depois ficam no botão ❓.

A Nágila (animação) fica em destaque no próprio tabuleiro, no lado direito: acena na vez dela e pula de alegria quando uma peça chega.

## Contato da Nágila
WhatsApp (31) 8883-3589 (`TELEFONE_PRO` no `jogo.js`, botão "Falar com a Nágila" e envio do relatório).
Endereço: Av. Queiroz Júnior, 1081, sala 201 – Praia, Itabirito/MG (tela inicial, relatório e PDF).

## Inclusão
- Tocar na peça e depois na casa brilhando, ou arrastar (dedo, mouse ou caneta). Também funciona pelo teclado (Tab + Enter).
- Casas de toque grandes (19% da largura do tabuleiro) e peças numeradas, com cor e número.
- Erro sem punição: um som suave e uma frase explicando. Depois de 3 toques fora da regra seguidos, a jogada certa brilha.
- Botão 💡 de dica; botão ⏸ de pausa (para os relógios). Voz do aparelho (pt-BR) nos momentos principais.
- Se ninguém consegue passar, o jogo sugere "recuar uma peça para abrir caminho", e a Nágila (máquina) também recua para destravar.

## Relatório (fim da partida)
Selo geral, números (jogadas, tempo no relógio, média por jogada, peças que chegaram, % de jogadas que avançaram,
toques fora da regra) e as **4 habilidades**:

| Habilidade | O que conta | Ótimo | Regular |
|---|---|---|---|
| Atenção | toques fora da regra (fora da linha, peça do outro, peça presa) por jogada | até 10% | até 30% |
| Planejamento | % de jogadas que aproximam a peça do destino; muitos "vai e volta" baixa o nível | 70% ou mais | 50% ou mais |
| Controle inibitório | jogadas em menos de 1,5 s + toques na vez da Nágila, por jogada | até 15% | até 35% |
| Soluções diversas | caminhos usados (esquerda, centro, direita) | os 3 | 2 |

Gráficos: tempo para pensar em cada jogada (cor: avançou / de lado / voltou), **tempo por peça** (jogadas e tempo
de cada peça, se chegou) e evolução nas últimas partidas. Pontos de atenção em texto. PDF com tudo (um bloco por jogador
no modo de duas pessoas). Os limites ficam no começo do `jogo.js` (`IMPULSIVA`, `DEMORADA`, `DICA_APOS`, `MAX_JOGADAS`).
**Enviar para a Nágila** compartilha o PDF (celular) ou baixa o PDF e abre o WhatsApp (computador).


## Arquivos
- `tabuleiro.js`: casas, linhas, regras e a jogadora máquina (busca minimax com poda; modo "abrir caminho" quando trava). Roda também no Node (`require`).
- `jogo.js`: telas, toques, relógios, relatório e PDF. `musica.js`: musiquinha de fundo. `vendor/jspdf.umd.min.js`: PDF.
- `assets/nagila/`: foto (ilustração) e animações da Nágila, recortadas de `referencias/sprites.jpg` por `ferramentas/sprites.py`.
- `icons/`: ícones do app (desenho do tabuleiro).

## Testar no computador
```
python -m http.server 8137 --directory C:\dev\pedagogia
```
e abrir http://localhost:8137/jogo1/ (o service worker só liga em HTTPS).

## Atualizar
Ao mudar arquivos, aumente `VERSAO` no `service-worker.js` e o `?v=` no `index.html`.

## Publicar na VPS (Dokploy)
O `Dockerfile` monta um nginx que serve o jogo em `/desafio/`. No Dokploy: Build Type **Dockerfile**,
domínio com path `/desafio`, **Strip Path desligado**, porta **80** e HTTPS (Let's Encrypt).
`referencias/` e `ferramentas/` não entram na imagem (`.dockerignore`).

© Marco Nunes — Todos os direitos reservados
