# 🏋️ Planilha de Treino A & B

App de acompanhamento de treino com histórico em nuvem.

## Estrutura do projeto

```
treino-app/
├── frontend/
│   └── index.html        ← GitHub Pages (app completo)
├── backend/
│   ├── server.js         ← API Express + PostgreSQL
│   ├── package.json
│   └── .env.example
├── render.yaml           ← Deploy automático no Render
└── README.md
```

---

## 🚀 Deploy em 3 passos

### Passo 1 — Subir o repositório no GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/treino-app.git
git push -u origin main
```

---

### Passo 2 — Hospedar o frontend no GitHub Pages

1. Abra o repositório no GitHub
2. Vá em **Settings → Pages**
3. Em *Source*, selecione **Deploy from a branch**
4. Branch: `main` / Folder: `/frontend`
5. Clique **Save**

Aguarde ~1 minuto. O app ficará disponível em:
```
https://SEU-USUARIO.github.io/treino-app/
```

> O frontend já funciona sem backend — histórico fica salvo no navegador (localStorage).

---

### Passo 3 — Deploy do backend no Render (gratuito)

#### 3a. Criar conta no Render
- Acesse [render.com](https://render.com) e crie uma conta gratuita (pode entrar com GitHub)

#### 3b. Criar o banco de dados PostgreSQL
1. No dashboard do Render, clique **New → PostgreSQL**
2. Nome: `treino-db`
3. Plano: **Free**
4. Clique **Create Database**
5. Aguarde ficar "Available" (pode levar 1-2 min)

#### 3c. Criar o Web Service (API)
1. Clique **New → Web Service**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name:** `treino-backend`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Em **Environment Variables**, adicione:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(copie a "Internal Database URL" do banco criado no 3b)* |
   | `ALLOWED_ORIGIN` | `https://SEU-USUARIO.github.io` |
5. Clique **Create Web Service**

#### 3d. Conectar o frontend ao backend
1. Após o deploy terminar, copie a URL do serviço:
   ```
   https://treino-backend.onrender.com
   ```
2. Abra o app no GitHub Pages
3. Clique no botão **⚙ Backend** no cabeçalho
4. Cole a URL e salve

✅ Pronto! O histórico agora é salvo na nuvem.

---

## 🔧 Desenvolvimento local

```bash
# Backend
cd backend
cp .env.example .env
# edite .env com sua DATABASE_URL local
npm install
npm run dev   # inicia com nodemon na porta 3001

# Frontend
# Abra frontend/index.html direto no navegador
# ou use qualquer servidor estático:
npx serve frontend
```

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/sessions` | Lista todas as sessões |
| GET | `/sessions/:id` | Sessão completa com exercícios |
| POST | `/sessions` | Salva nova sessão |
| DELETE | `/sessions/:id` | Remove uma sessão |

### POST /sessions — payload esperado

```json
{
  "day": "A",
  "date_label": "sábado, 24 de maio de 2025",
  "done_count": 10,
  "total_exs": 12,
  "total_sets": 30,
  "exercises": [
    {
      "id": "a1",
      "num": 1,
      "name": "Agachamento + Salto",
      "sets": "3 x 15",
      "done": true,
      "load": "40",
      "time_val": "",
      "sets_done": "3",
      "notes": "Boa execução"
    }
  ]
}
```

---

## 🛡️ Notas

- O frontend **sempre salva localmente** (localStorage) como backup, mesmo quando o backend está ativo.
- Se o backend estiver offline, a sessão é salva só localmente e aparece no histórico normalmente.
- O banco PostgreSQL gratuito do Render fica suspenso após 90 dias sem uso — basta reconectar.
- O Web Service gratuito do Render fica em "sleep" após 15 min de inatividade; a primeira requisição pode levar ~30s para acordar.
