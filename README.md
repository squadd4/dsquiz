# DS Automobiles — Modo Silêncio

Web App/PWA fullscreen para a experiência DS Automobiles — Modo Silêncio / ENVE 2026. A composição parte dos assets 3840×2160 fornecidos e mantém uma área de palco 16:9 em qualquer viewport.

O inventário e a associação visual dos ficheiros estão documentados em `ASSET_AUDIT.md`.

## Estrutura e fluxo

O fluxo implementado é `1 → 2 → 3 → 4 → 5 → 6 → 7 → 10 → 8 → 1`.

- Slides 1, 2 e 8: navegação por botões extraídos do design.
- Slides 3 e 4: vídeo no próprio slide, ativado pelo microfone sobreposto.
- Slide 5: microfone oculto durante 3 segundos, entrada suave e reprodução no próprio slide.
- Slide 6: vídeo integrado; toque na área visual alterna reprodução/pausa.
- Slide 7: mensagem institucional do preview e continuação direta para o formulário.
- Slide 10: formulário, privacidade obrigatória e intenção de test-drive.
- Slides intermédios: seta discreta no canto superior esquerdo, com 10% de opacidade e área tátil 4K, para voltar ao ecrã visitado anteriormente.

O questionário adicional de quatro opções foi removido: não fazia parte do preview. O Slide 7 conserva apenas a composição oficial fornecida.

## Auditoria dos assets

Todos os slides em `png/`, `jpeg/`, `preview/` e `novas imagens/` têm composição 3840×2160 (16:9). Nos Slides 3, 4 e 10 são usados os novos fundos JPG limpos, sem controlos incorporados. Os microfones, botões, legendas dos campos e CTA do formulário são PNGs independentes, evitando qualquer duplicação visual.

Os originais não foram alterados.

## Vídeos

Adicione os MP4 finais a `videos/`. Os caminhos estão centralizados em `js/video-player.js`. A aplicação não abre janelas, tabs ou players externos; os vídeos permanecem no slide.

## Base de dados (Supabase) e Vercel

O projeto está otimizado para a **Vercel** utilizando **Serverless Functions** em Node.js (`/api/`) e base de dados **Supabase** (PostgreSQL com RLS).

### 1. Configuração no Supabase
1. No painel do seu projeto Supabase, aceda ao menu **SQL Editor**.
2. Abra o ficheiro [`supabase/schema.sql`](supabase/schema.sql), cole o conteúdo no editor e execute (**Run**).
3. A tabela `ds_silencio_leads` será criada com índices e políticas de Row Level Security (RLS).
4. Aceda a **Project Settings** → **API** e anote:
   - **Project URL**
   - **service_role key** (secreta) ou **anon key** (pública).

### 2. Configuração no Vercel
1. Importe o repositório `dsquiz` no Vercel.
2. Em **Settings** → **Environment Variables**, adicione:
   - `SUPABASE_URL`: URL do seu projeto Supabase (`https://seu-id.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase (ou `SUPABASE_ANON_KEY`)
3. Conclua o Deploy.

### 3. Diagnóstico e Endpoints
- Submissão de leads: `POST /api/submit_quiz`
  Valida rigorosamente os dados (nome, email, telefone, código postal português `0000-000`, RGPD) e garante idempotência via `client_record_id`.
- Teste de ligação à base de dados: `GET /api/check_db`
  Permite confirmar se o Vercel comunica com o Supabase e exibe o total de leads registadas.

## Offline-first

Cada submissão é primeiro guardada em IndexedDB (`pending_submissions`), com fallback local em `localStorage`. A sincronização silenciosa com a API do Vercel é tentada:
- No evento `online` do browser;
- Ao recuperar foco na janela;
- Quando a página volta a ficar visível;
- A cada três minutos em segundo plano.

Um registo só sai da fila após confirmação do backend (`/api/submit_quiz`).

O Service Worker guarda a interface, os assets estáticos e os vídeos. Os pedidos `Range` dos MP4 são respondidos a partir do ficheiro completo em cache com HTTP `206 Partial Content`, permitindo reprodução offline no Microsoft Edge e Chromium.

O browser recebe também um pedido de armazenamento persistente (`navigator.storage.persist()`). Cada lead fica numa cópia local de arquivo mesmo depois de uma sincronização bem-sucedida. Para exportar todas as leads em CSV compatível com Excel, prima `F9` ou toque cinco vezes, em menos de quatro segundos, no canto superior direito do ecrã.

## Execução local

### Modo de desenvolvimento com Vercel CLI
```sh
npm install
npx vercel dev
```

### Servidor HTTP simples (apenas frontend estático)
```sh
npm start
```
Depois abra `http://localhost:3000` (ou a porta indicada) num browser Chromium e ative fullscreen/kiosk conforme o equipamento do evento.
