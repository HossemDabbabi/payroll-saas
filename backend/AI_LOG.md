# AI Interaction Log

| Date | Prompt | Output AI | Chnoua badelt / chnoua kan ghalet |
|------|--------|-----------|-------------------------------------|
| 2026-11-16 | Tests Supertest lel routes protégées | Test `GET /api/subscriptions` yestenna 401 | El route el 7a9i9iya hiya `/api/subscriptions/current`. El IA 7atet chemin bla ma tchouf `subscription.routes.js` (el test kan yرaja3 404) |
| 2026-11-16 | Rendre server.js testable pour Supertest | `if (require.main === module)` 7awel connectDB w listen | El tests el awlin kenou yconnectiw 3la MongoDB Atlas el 7a9i9i w yفta7ou port 5000, lazem nفasslou app mel serveur |
| 2026-11-16 | Commit des fichiers de tests (git add) | El IA 9alet "5ar el 5 fichiers" | Staged Changes kenet fiha 54 fichier (dossier `coverage`), lazem `.gitignore` + `git reset` |
| 2026-11-16 | Fix CI GitHub Actions | `npm ci` 3la eslint 10 m3a eslint-plugin-react | Versions mouch mtوafa9in, el workflow fchel, 7allineh b `--legacy-peer-deps` |
| 2026-11-16 | Workflow GitHub Actions lel Playwright | Workflow yconfigurer `npm ci` w yلanci Playwright direct | El workflow ma yونazzelch dependencies mta3 el frontend (`vite: not found`), w ma fihch backend/MongoDB. El CI yفchel w el tests ma yوslouch |
| 2026-11-16 | Tests Supertest pour register (boundary mot de passe, email invalide) | Tests envoyaient `{ name }` au lieu de `{ companyName }` | Les tests passaient (400) pour la mauvaise raison: champ obligatoire manquant, pas l'email ni le mot de passe. L'IA n'avait pas lu auth.controller.js |