# Dufort Personal Blog

## Recursos
- Perfil GitHub com avatar automático: https://github.com/Dufortss.png?size=256
- Ícones visuais nas áreas de interesse
- Comentários/ideias persistidos no MongoDB
- Data e hora dos posts
- URL de avatar opcional
- HTML/tags/scripts removidos no backend e escapados no frontend
- Rate limit para publicação
- Área `/admin.html` protegida por `ADMIN_TOKEN`
- Exclusão e resposta somente para o administrador

## Rodar
1. `npm install`
2. Copie `.env.example` para `.env`
3. Configure `MONGODB_URI`, `DB_NAME` e um `ADMIN_TOKEN` forte.
4. `npm start`
5. Abra `http://localhost:5000`
6. Moderação: `http://localhost:5000/admin.html`

Não coloque o `ADMIN_TOKEN` no `index.html`, `script.js` ou em qualquer arquivo público.
