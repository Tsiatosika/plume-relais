# ✒️ Plume Relais

Application d'écriture collaborative mobile et web, construite avec React Native / Expo.

## Concept

Plume Relais est un jeu d'écriture à plusieurs mains. Une histoire grandit une contribution à la fois : chaque participant propose un paragraphe, la communauté vote, et la proposition gagnante devient la suite officielle du récit.

## Fonctionnalités

- **Authentification** — inscription et connexion par email/mot de passe
- **Création d'histoires** — titre, paragraphe d'ouverture, paramètres personnalisables
- **Mode aveugle** — chaque auteur ne voit que les 2 derniers paragraphes avant de proposer
- **Propositions et votes** — chaque membre propose une suite, la communauté vote
- **Temps réel** — les votes et nouvelles suites se mettent à jour en direct (Supabase Realtime)
- **Clôture de tour** — le créateur clôt le tour, la proposition gagnante est ajoutée au récit
- **Profil et réputation** — score et badges selon les contributions retenues

## Stack technique

| Outil | Usage |
|-------|-------|
| React Native + Expo | Application mobile et web |
| Expo Router | Navigation par fichiers |
| Supabase | Auth, base de données, temps réel, storage |
| Zustand | Gestion d'état global |
| TypeScript | Typage statique |

## Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd plume-relais

# Installer les dépendances
npm install

# Lancer sur le web
npx expo start --web

# Lancer sur mobile (avec Expo Go)
npx expo start
```

## Configuration

Crée un projet sur [supabase.com](https://supabase.com) et renseigne tes clés dans `lib/supabase.ts` :

```typescript
const SUPABASE_URL = 'https://XXXXXXXX.supabase.co'
const SUPABASE_ANON_KEY = 'eyJ...'
```

## Structure du projet
app/
├── (auth)/ # Écrans login et inscription
├── (app)/ # Écrans principaux (tabs)
│ ├── feed.tsx # Fil des histoires
│ ├── profile.tsx # Profil utilisateur
│ ├── story/ # Lecture, création, vote
│ └── contribute/ # Rédaction d'une suite
components/ # Composants réutilisables
hooks/ # Hooks personnalisés (realtime)
lib/ # Client Supabase
store/ # Stores Zustand
types/ # Types TypeScript

## Architecture des données

- `profiles` — utilisateurs
- `stories` — histoires
- `paragraphs` — paragraphes canon
- `proposals` — propositions en attente de vote
- `votes` — votes par tour
- `story_members` — membres d'une histoire