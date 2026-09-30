# Operations Portal

> 🇺🇸 English first · 🇧🇷 [Versão em português abaixo](#-português)

---

## 🇺🇸 English

### What it is

**Operations Portal** is a full-stack internal portal for an e-commerce operations team
(warehouse / shipping / after-sales). It has two faces:

- **Admin panel** (React SPA): staff write operational manuals with a block editor, manage
  users and permissions, keep a logo library, publish small HTML tools and track product returns.
- **Public portal** (server-rendered by Express at `/portal`): read-only pages where the team
  opens published manuals and tools without logging in.

It was built for a real operation and later cleaned up for this portfolio.
**All data in this repository is fictional.**

### Features

- **Authentication** with JWT (24h expiry) and passwords hashed with **bcrypt**.
- **4 access levels**: `viewer` → `editor` → `admin` → `admin_master`.
- **Granular per-module permissions** (`view / create / edit / delete` for manuals, templates,
  tools, logos, users, audit logs and returns). Each role has sensible defaults; an
  `admin_master` can override them per user. Enforced on the server, not only in the UI.
- **Audit logs** of every relevant action (login, CRUD, permission changes, password resets)
  with user, details and **IP address**.
- **Block-based manual editor**: title, subtitle, text, alert, step, checklist, table, image and
  divider blocks, with colors and ordering; optional custom-HTML mode; draft / published status.
- **Templates**: save any manual as a template and create new manuals from it.
- **Logo library**: SVG/PNG upload to Supabase Storage, reused by the embedded tools.
- **Tools**: upload a self-contained HTML tool; the portal serves it inside an iframe.
- **Returns module**: register returns per sales channel, configurable reasons per channel,
  complaint **quarantine** with countdown, penalty tracking, resolve/reopen flow, filters,
  CSV export and a dashboard (totals, losses, by channel, by reason, by month).
- **Password recovery** by e-mail (hashed, 15-minute, single-use code with an attempt limit) plus
  admin-initiated reset. **Rate limiting** on login and recovery routes.

### Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express 5, `jsonwebtoken`, `bcrypt`, `nodemailer` |
| Database | PostgreSQL via **Supabase** (`@supabase/supabase-js`) + Supabase Storage |
| Frontend | React 19, React Router, **Vite**, **Tailwind CSS** v4 |

### Architecture

```
            ┌──────────────────────────┐
 Browser ──►│  Admin SPA (Vite/React)  │── fetch + Bearer JWT ─┐
            └──────────────────────────┘                        ▼
                                              ┌─────────────────────────────────┐
 Browser ──── GET /portal/* (public HTML) ───►│ Express API (server.js)         │
                                              │ routes → middleware → controllers│
                                              │  auth (JWT) · requirePermission │
                                              │  requireRole · validate · audit │
                                              └──────────────┬──────────────────┘
                                                             │ supabase-js (server key)
                                              ┌──────────────▼──────────────────┐
                                              │ Supabase: PostgreSQL + Storage  │
                                              │ buckets: logos · images · tools │
                                              └─────────────────────────────────┘
```

- Every protected route runs `auth` (verifies the JWT) and then `requirePermission(resource, action)`,
  which loads the user's `permissions` JSON (or the role defaults) from the database on each request,
  so permission changes apply immediately without a new login.
- The Supabase key lives **only on the server**; the SPA never talks to Supabase directly.
- Tools are stored in Supabase Storage, which serves HTML as `text/plain` with a sandbox CSP.
  The route `/portal/ferramenta/:slug/embed` fetches the file and re-serves it as `text/html`.

### Running locally

**Requirements:** Node.js 20+, a PostgreSQL database (a free Supabase project works) and,
optionally, an SMTP account for password-recovery e-mails.

1. **Database** — run the schema and the demo seed (Supabase SQL Editor or `psql`):
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed.sql
   ```
   In Supabase Storage, create three **public** buckets: `logos`, `images`, `tools`.
   See [`database/README.md`](database/README.md) for the ER diagram.

2. **Environment variables**
   ```bash
   cp .env.example .env              # backend: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, EMAIL_*, TRUST_PROXY
   cp admin/.env.example admin/.env  # frontend: VITE_API_URL
   ```

3. **Install and run**
   ```bash
   npm install                 # backend
   npm run dev                 # API on http://localhost:3000, public portal on /portal

   cd admin
   npm install
   npm run dev                 # admin panel on http://localhost:5173
   ```

4. **Log in** with any demo user — password **`Demo@1234`**:

   | E-mail | Role |
   |---|---|
   | `master@example.com` | admin_master |
   | `admin@example.com` | admin |
   | `editor@example.com` | editor (with custom permissions) |
   | `viewer@example.com` | viewer |

### Security notes

- **Passwords** are hashed with bcrypt; JWTs expire in 24h and permissions are re-read from the
  database on every request.
- **Password recovery** codes are 32 random hex characters (`crypto.randomBytes`). Only their
  SHA-256 hash is stored; a code expires in 15 minutes, is single-use and is burned after 5 wrong
  attempts. Requesting a new code invalidates the previous one.
- **Rate limiting** (`express-rate-limit`) on login (failed attempts only), forgot-password and
  reset-password. Behind a reverse proxy set `TRUST_PROXY=1` so limits and audit logs see the real
  client IP.
- **Public pages** (`/portal`) escape every database value interpolated into HTML (`src/lib/html.js`),
  accept only `http(s)` image URLs and whitelist colors, widths and divider styles.
- **Custom HTML is trusted by design.** A manual's `custom_html` is served as-is, so only `admin`
  and `admin_master` can write or remove it (role re-checked in the database, not taken from the JWT).
  Editors keep full access to the block editor; the HTML tab is hidden for them.
- **Size charts** (`/portal/size-charts`) are readable publicly (used by the embedded tool), but
  creating/updating requires login + `tools.view` and deleting requires `tools.edit`.

### Folder structure

```
.
├── server.js                 # Express entry point, route mounting
├── src/
│   ├── config/permissions.js # resources, actions and role defaults
│   ├── controllers/          # business logic (one file per module)
│   ├── middleware/           # auth (JWT), roles, permissions, validation, errors
│   ├── routes/               # Express routers
│   └── lib/supabase.js       # Supabase client (server-side)
├── admin/                    # React + Vite admin panel
│   └── src/
│       ├── config.js         # API_URL (VITE_API_URL with localhost fallback)
│       ├── components/       # Layout, Sidebar
│       └── pages/            # one page per module
├── database/
│   ├── schema.sql            # structure only
│   ├── seed.sql              # fictional demo data
│   └── README.md             # ER diagram (Mermaid)
└── .env.example
```

### What I learned

1. **Roles are not enough; permissions need layers.** I started with a simple role hierarchy
   (`requireRole`) and later needed per-module exceptions. The final design keeps role-based
   defaults (`defaultPermissionsForRole`) and stores only overrides as JSON, resets them when the
   role changes, and keeps `admin_master` unrestrictable so nobody can lock the system out.
2. **Hiding a button is not authorization.** The sidebar hides modules, but every rule is enforced
   again in Express middleware, and permissions are read from the database on each request, so a
   revoked permission takes effect without waiting for the JWT to expire.
3. **Storage is not a web server.** Supabase Storage deliberately serves uploaded HTML as plain text
   with a sandbox CSP. Understanding *why* (it protects against hosted XSS) led to a small proxy
   route instead of fighting the platform.
4. **Audit from day one.** A single `logAction(user, action, details, ip)` helper called from every
   controller made it cheap to answer "who changed this?" — and showed me how much easier it is to
   add auditing at the start than to retrofit it.
5. **Keep front-end and back-end contracts in sync.** Validation rules and the API base URL were
   duplicated across files; centralizing the URL in `VITE_API_URL` and finding blocks that the UI
   offers but the validator rejects taught me to share constants and test the contract end-to-end.

> ⚠️ **Demo data is fictional.** Users, manuals, orders, channels and IPs in `database/seed.sql`
> were invented for this repository. Change or delete the demo users in any real deployment.

---

## 🇧🇷 Português

### O que é

**Operations Portal** é um portal interno full-stack para a equipe de operações de um e-commerce
(expedição / estoque / pós-venda). Tem duas partes:

- **Painel administrativo** (SPA React): a equipe escreve manuais operacionais com um editor em
  blocos, gerencia usuários e permissões, mantém uma biblioteca de logos, publica pequenas
  ferramentas HTML e controla devoluções.
- **Portal público** (renderizado pelo Express em `/portal`): páginas somente leitura onde a equipe
  abre manuais e ferramentas publicados sem precisar logar.

Foi construído para uma operação real e depois limpo para este portfólio.
**Todos os dados deste repositório são fictícios.**

### Funcionalidades

- **Autenticação** com JWT (expira em 24h) e senhas com hash **bcrypt**.
- **4 níveis de acesso**: `viewer` → `editor` → `admin` → `admin_master`.
- **Permissões granulares por módulo** (`view / create / edit / delete` para manuais, templates,
  ferramentas, logos, usuários, logs de auditoria e devoluções). Cada role tem um padrão; o
  `admin_master` pode sobrescrever por usuário. Checado no servidor, não só na interface.
- **Audit logs** de toda ação relevante (login, CRUD, troca de permissão, reset de senha) com
  usuário, detalhes e **endereço IP**.
- **Editor de manuais em blocos**: título, subtítulo, texto, alerta, passo, checklist, tabela,
  imagem e divisor, com cores e ordenação; modo HTML customizado; status rascunho / publicado.
- **Templates**: salvar qualquer manual como template e criar manuais a partir dele.
- **Biblioteca de logos**: upload SVG/PNG no Supabase Storage, reutilizados pelas ferramentas.
- **Ferramentas**: upload de uma ferramenta HTML autocontida, servida no portal via iframe.
- **Módulo de devoluções**: registro por canal de venda, motivos configuráveis por canal,
  **quarentena** de reclamação com contagem regressiva, controle de multa, fluxo de concluir /
  reabrir, filtros, exportação CSV e dashboard (totais, prejuízo, por canal, por motivo, por mês).
- **Recuperação de senha** por e-mail (código com hash, validade de 15 min, uso único e limite de
  tentativas) e reset feito por admin. **Rate limit** nas rotas de login e recuperação.

### Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js, Express 5, `jsonwebtoken`, `bcrypt`, `nodemailer` |
| Banco | PostgreSQL via **Supabase** (`@supabase/supabase-js`) + Supabase Storage |
| Frontend | React 19, React Router, **Vite**, **Tailwind CSS** v4 |

### Arquitetura

Veja o diagrama na seção em inglês. Resumo:

- Toda rota protegida passa por `auth` (valida o JWT) e depois `requirePermission(recurso, ação)`,
  que lê do banco o JSON de `permissions` do usuário (ou o padrão da role) a cada requisição —
  mudanças de permissão valem na hora, sem novo login.
- A chave do Supabase fica **só no servidor**; o SPA nunca fala direto com o Supabase.
- As ferramentas ficam no Supabase Storage, que serve HTML como `text/plain` com CSP sandbox.
  A rota `/portal/ferramenta/:slug/embed` busca o arquivo e o reenvia como `text/html`.

### Como rodar localmente

**Requisitos:** Node.js 20+, um banco PostgreSQL (um projeto gratuito do Supabase serve) e,
opcionalmente, uma conta SMTP para os e-mails de recuperação de senha.

1. **Banco** — rode o schema e o seed de demonstração (SQL Editor do Supabase ou `psql`):
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed.sql
   ```
   No Supabase Storage, crie três buckets **públicos**: `logos`, `images`, `tools`.
   O diagrama ER está em [`database/README.md`](database/README.md).

2. **Variáveis de ambiente**
   ```bash
   cp .env.example .env              # backend: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, EMAIL_*, TRUST_PROXY
   cp admin/.env.example admin/.env  # frontend: VITE_API_URL
   ```

3. **Instalar e rodar**
   ```bash
   npm install                 # backend
   npm run dev                 # API em http://localhost:3000, portal público em /portal

   cd admin
   npm install
   npm run dev                 # painel em http://localhost:5173
   ```

4. **Entre** com qualquer usuário de demonstração — senha **`Demo@1234`**:
   `master@example.com` (admin_master), `admin@example.com` (admin),
   `editor@example.com` (editor com permissões customizadas), `viewer@example.com` (viewer).

### Notas de segurança

- **Senhas** com hash bcrypt; o JWT expira em 24h e as permissões são relidas do banco a cada
  requisição.
- **Códigos de recuperação de senha** têm 32 caracteres hex aleatórios (`crypto.randomBytes`). Só o
  hash SHA-256 é salvo; o código expira em 15 minutos, é de uso único e é queimado após 5
  tentativas erradas. Pedir um código novo invalida o anterior.
- **Rate limit** (`express-rate-limit`) no login (só tentativas que falham), esqueci-senha e reset.
  Atrás de proxy reverso defina `TRUST_PROXY=1` para os limites e os audit logs verem o IP real.
- **Páginas públicas** (`/portal`) escapam todo valor do banco interpolado no HTML
  (`src/lib/html.js`), aceitam só URLs de imagem `http(s)` e validam cores, larguras e estilos.
- **HTML customizado é confiável por design.** O `custom_html` de um manual é servido sem escape,
  por isso só `admin` e `admin_master` podem gravá-lo ou removê-lo (a role é conferida no banco, não
  no JWT). Editores continuam com o editor de blocos completo; a aba HTML fica oculta para eles.
- **Tabelas de medidas** (`/portal/size-charts`) têm leitura pública (usada pela ferramenta
  embarcada), mas criar/atualizar exige login + `tools.view` e apagar exige `tools.edit`.

### Estrutura de pastas

Veja a árvore na seção em inglês: `server.js` + `src/` (config, controllers, middleware, routes,
lib) no backend, `admin/` com o painel React, `database/` com schema, seed e diagrama.

### O que aprendi

1. **Roles não bastam; permissões precisam de camadas.** Comecei com uma hierarquia simples de
   roles (`requireRole`) e depois precisei de exceções por módulo. O desenho final mantém padrões
   por role (`defaultPermissionsForRole`), guarda só os overrides em JSON, zera os overrides quando
   a role muda e mantém o `admin_master` irrestringível para ninguém trancar o sistema.
2. **Esconder botão não é autorização.** A sidebar esconde módulos, mas toda regra é checada de
   novo no middleware do Express, e as permissões são lidas do banco a cada requisição — uma
   permissão revogada vale na hora, sem esperar o JWT expirar.
3. **Storage não é servidor web.** O Supabase Storage serve HTML enviado como texto puro com CSP
   sandbox de propósito. Entender *por quê* (evita XSS hospedado) me levou a uma pequena rota proxy
   em vez de brigar com a plataforma.
4. **Auditoria desde o primeiro dia.** Um único helper `logAction(usuário, ação, detalhes, ip)`
   chamado em todos os controllers tornou barato responder "quem mudou isso?" — e mostrou como é
   mais fácil auditar desde o início do que adaptar depois.
5. **Manter o contrato front/back sincronizado.** Regras de validação e a URL da API estavam
   duplicadas; centralizar a URL em `VITE_API_URL` e achar blocos que a interface oferece mas o
   validador rejeita me ensinou a compartilhar constantes e testar o contrato de ponta a ponta.

> ⚠️ **Os dados de demonstração são fictícios.** Usuários, manuais, pedidos, canais e IPs em
> `database/seed.sql` foram inventados para este repositório. Troque ou apague os usuários de
> demonstração em qualquer ambiente real.
