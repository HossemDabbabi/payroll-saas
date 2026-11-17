# AI Interaction Log

| Date | Prompt | Output AI | Chnoua badelt / chnoua kan ghalet |
|------|--------|-----------|-------------------------------------|

| 2026-11-16 | Tests Supertest lel routes protégées | Test `GET /api/subscriptions` yestenna 401 | El route el 7a9i9iya hiya `/api/subscriptions/current`. El IA 7atet chemin bla ma tchouf `subscription.routes.js` (el test kan yرaja3 404) |

| 2026-11-16 | Rendre server.js testable pour Supertest | `if (require.main === module)` 7awel connectDB w listen | El tests el awlin kenou yconnectiw 3la MongoDB Atlas el 7a9i9i w yفta7ou port 5000, lazem nفasslou app mel serveur |

| 2026-11-16 | Commit des fichiers de tests (git add) | El IA 9alet "5ar el 5 fichiers" | Staged Changes kenet fiha 54 fichier (dossier `coverage`), lazem `.gitignore` + `git reset` |

| 2026-11-16 | Fix CI GitHub Actions | `npm ci` 3la eslint 10 m3a eslint-plugin-react | Versions mouch mtوafa9in, el workflow fchel, 7allineh b `--legacy-peer-deps` |

| 2026-11-16 | Workflow GitHub Actions lel Playwright | Workflow yconfigurer `npm ci` w yلanci Playwright direct | El workflow ma yونazzelch dependencies mta3 el frontend (`vite: not found`), w ma fihch backend/MongoDB. El CI yفchel w el tests ma yوslouch |

| 2026-11-16 | Tests Supertest pour register (boundary mot de passe, email invalide) | Tests envoyaient `{ name }` au lieu de `{ companyName }` | Les tests passaient (400) pour la mauvaise raison: champ obligatoire manquant, pas l'email ni le mot de passe. L'IA n'avait pas lu auth.controller.js |

| 2026-11-16 | Tests payroll controller + middleware upload/error (45 tests) | 13 tests failed, 32 passed | Les 13 echecs sont des vrais bugs du code, pas des erreurs de test: `month` non numerique accepte (201), fichiers orphelins dans `uploads/`, `limit=0` -> `pages=Infinity`, multer -> 500, filtre `OR` mimetype/extension, stack exposee. L'IA avait lu le code avant d'ecrire les tests |

| 2026-11-16 | Meme prompt payroll | `test.each([['abc'], ['1.5x'], ['']])` pour `month` | Bug correct mais explication fausse: l'IA a dit "NaN passe la validation" pour   les 3 cas. En realite `"abc"` -> NaN (201), `"1.5x"` -> `parseInt` donne 1 (201), et `""` est deja rejete par `!month`: cas redondant |

| 2026-11-16 | Meme prompt payroll | Severite "Haute" pour la stack trace exposee dans la reponse | L'IA n'a pas verifie `NODE_ENV` du deploiement: le test `production` passe, donc le bug concerne seulement hors production |

| 2026-11-16 | Tests Supertest pour la validation auth | `expect([400, 401, 422]).toContain(res.status)` | Assertions trop faibles: le test passe meme si le code renvoie un mauvais status. A durcir apres lecture de `auth.controller.js` |

| 2026-11-17 | Tests Playwright negatifs (mauvais login, fichier invalide) avec API mockee | Test `wrong credentials` attendait le message "Invalid email or password." visible apres un 401 | Le test a echoue pour une bonne raison: `api.js` fait `window.location.href='/login'` sur TOUT 401, y compris un login rate. La page se recharge et le message disparait. Vrai bug (#12), corrige en ignorant la route `/auth/login` dans l'intercepteur |

| 2026-11-17 | Meme prompt, test `.pdf` refuse | `page.waitForEvent('dialog')` puis `setInputFiles` | Le test restait bloque (timeout 30 s): l'`alert()` du client bloque la page tant que personne ne la ferme. Il faut `page.once('dialog', d => d.dismiss())` avant l'action. Puis l'IA a verifie `toHaveCount(0)` sur le bouton Process, alors qu'il existe toujours (desactive): corrige en `toBeDisabled()` |

| 2026-11-17 | Relecture du depot avant le rapport final | L'IA a signale que `payroll-flow.spec.js` contenait encore un email et un mot de passe en clair | Le premier correctif (commit 6756d3c) n'avait traite que `auth.spec.js`. Identifiants maintenant lus depuis `PLAYWRIGHT_TEST_EMAIL/PASSWORD`, tests ignores si absents |

| 2026-11-17 | Rapport de couverture (`npm test`) | Couverture de `copilot.controller.js` a 6 % alors que des tests existent | `testMatch` ne contenait que `**/tests/**`: les 2 suites de `src/**/__tests__` (7 tests) n'etaient jamais executees, et elles etaient comptees comme du code source dans la couverture. `jest.config.js` corrige: 8 suites, 135 tests |

| 2026-11-17 | Workflow CI Playwright (2e version) | Workflow lance backend + frontend + Playwright sur 3 navigateurs | Choix simplifie: Chromium uniquement, tests negatifs avec API mockee (pas de MongoDB en CI), job Jest separe avec upload du rapport de couverture. Les tests avec compte reel restent ignores sans secrets |
