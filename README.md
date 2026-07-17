# ✒️ Plume Relais

> Application d'écriture collaborative mobile et web, construite avec React Native / Expo.

[![Expo](https://img.shields.io/badge/Expo-52.0.0-black.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.76.0-blue.svg)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-2.47.0-green.svg)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)](https://www.typescriptlang.org/)

---

## 📖 Concept

**Plume Relais** est un jeu d'écriture à plusieurs mains. Une histoire grandit une contribution à la fois : chaque participant propose un paragraphe, la communauté vote, et la proposition gagnante devient la suite officielle du récit. Le résultat tient à mi-chemin entre le jeu du « cadavre exquis » et un réseau social d'écriture.

### Mécaniques principales

- **Relais à l'aveugle** — Un contributeur ne voit que les derniers paragraphes (ou seulement le dernier selon le mode), sans connaître l'intégralité du récit ni savoir qui écrira après lui.
- **Vote communautaire** — À chaque tour, plusieurs suites sont proposées. La communauté vote, et la proposition gagnante devient la suite officielle du récit.

---

## ✨ Fonctionnalités

### 🔐 Authentification
- Inscription et connexion par email/mot de passe
- Profil utilisateur avec pseudo et avatar
- Déconnexion avec modal de confirmation

### 📚 Gestion des histoires
- Création d'histoires : titre, paragraphe d'ouverture
- Paramètres personnalisables :
  - Mode aveugle
  - Histoire privée/publique
  - Nombre maximum de contributions
  - Durée d'un tour
- Image de couverture (upload vers Supabase Storage)
- Fil d'actualité avec onglets :
  - **Rejoindre** — Histoires ouvertes publiques
  - **Mes histoires** — Histoires auxquelles vous participez
  - **Terminées** — Histoires achevées

### ✍️ Contribution et vote
- Proposition de suite avec aperçu du contexte
- Affichage des propositions avec compteur de votes
- Barre de progression en temps réel
- Vote pour une proposition (impossible de voter pour soi-même)
- Clôture de tour par le créateur
- Ajout automatique de la proposition gagnante à l'histoire

### 🔄 Temps réel
- Mise à jour en direct des votes (Supabase Realtime)
- Décompte du temps restant par tour
- Affichage du tour en cours
- Indicateur de connexion en direct

### 👤 Profil et réputation
- Score de réputation basé sur les contributions retenues
- Système de badges avec 20+ distinctions :
  - **Contribution** : Premier pas, Écrivain assidu, Prolifique
  - **Qualité** : Plume d'argent, Plume d'or, Plume de diamant
  - **Social** : Apprécié, Populaire, Influenceur, Légende
  - **Participation** : Aventurier, Explorateur
  - **Spécial** : Créateur, Architecte, Apprenti, Maître, Grand Maître
  - **Communauté** : Bavard, Philanthrope
- Attribution automatique des badges
- Statistiques détaillées : propositions, retenues, taux de succès

### 💬 Commentaires
- Commentaires sur les histoires terminées
- Suppression de ses propres commentaires
- Affichage en temps réel
- Badges des commentateurs

### 🖼️ Images de couverture
- Upload d'images depuis la galerie
- Stockage dans Supabase Storage
- Affichage dans le feed et la page histoire
- Intégration dans le partage de texte

### 📤 Partage
- Copie du lien de l'histoire
- Copie du texte complet avec les auteurs
- Inclusion de l'image de couverture dans le partage

### 🏆 Badges et réputation
- Système complet de gamification
- 21 badges disponibles
- Attribution automatique basée sur l'activité
- Affichage dans le profil, le feed et les commentaires
- Modal de détail pour chaque badge

### 🔔 Notifications Push
- Configuration avec Expo Notifications
- Envoi de notifications pour :
  - Nouveau vote sur une proposition
  - Nouvelle proposition dans une histoire
  - Tour commencé
  - Histoire terminée
- Compatible iOS et Android

---

## 🛠️ Stack technique

| Outil | Usage |
|-------|-------|
| **[React Native](https://reactnative.dev/) + [Expo](https://expo.dev/)** | Application mobile et web |
| **[Expo Router](https://docs.expo.dev/router/)** | Navigation par fichiers |
| **[Supabase](https://supabase.com/)** | Auth, base de données, temps réel, storage |
| **[Zustand](https://zustand-demo.pmnd.rs/)** | Gestion d'état global |
| **[TypeScript](https://www.typescriptlang.org/)** | Typage statique |
| **[Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)** | Notifications push |
| **[Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)** | Sélection d'images |
| **[Ionicons](https://ionic.io/ionicons)** | Icônes vectorielles |

---

## 📁 Structure du projet

```
plume-relais/
├── app/
│   ├── (auth)/                 # Écrans authentification
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (app)/                  # Écrans principaux (tabs)
│   │   ├── _layout.tsx         # Navigation par onglets
│   │   ├── feed.tsx            # Fil des histoires
│   │   ├── profile.tsx         # Profil utilisateur
│   │   ├── story/
│   │   │   ├── [id].tsx        # Lecture d'une histoire
│   │   │   ├── create.tsx      # Création d'histoire
│   │   │   └── vote/
│   │   │       └── [id].tsx    # Vote des propositions
│   │   └── contribute/
│   │       └── [id].tsx        # Rédaction d'une suite
│   └── _layout.tsx             # Layout racine
├── components/
│   ├── BadgeSystem.tsx         # Système de badges
│   └── CommentSection.tsx      # Section commentaires
├── hooks/
│   ├── useCountdown.ts         # Timer de tour
│   ├── useReputation.ts        # Gestion des badges/réputation
│   └── useRealtime.ts          # Mises à jour en temps réel
├── lib/
│   └── supabase.ts             # Client Supabase
├── store/
│   └── authStore.ts            # Store authentification
├── types/
│   └── index.ts                # Types TypeScript
└── package.json
```

---

## 🗄️ Architecture des données

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Utilisateurs (pseudo, réputation, badges) |
| `stories` | Histoires (titre, paramètres, statut) |
| `paragraphs` | Paragraphes canon de l'histoire |
| `proposals` | Propositions en attente de vote |
| `votes` | Votes par tour |
| `story_members` | Membres d'une histoire |
| `comments` | Commentaires sur les histoires |
| `badges` | Liste des badges disponibles |
| `user_badges` | Badges débloqués par les utilisateurs |

### Buckets Storage

| Bucket | Usage |
|--------|-------|
| `covers` | Images de couverture des histoires |

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

### Étapes

```bash
# 1. Cloner le projet
git clone <url-du-repo>
cd plume-relais

# 2. Installer les dépendances
npm install

# 3. Configurer Supabase
# Créer un projet sur https://supabase.com
# Copier les clés dans lib/supabase.ts

# 4. Lancer sur le web
npx expo start --web

# 5. Lancer sur mobile (Expo Go)
npx expo start
```

---

## ⚙️ Configuration Supabase

### 1. Créer un projet Supabase

Rendez-vous sur [supabase.com](https://supabase.com) et créez un nouveau projet.

### 2. Configurer les clés

Dans `lib/supabase.ts` :

```typescript
const SUPABASE_URL = 'https://votre-projet.supabase.co'
const SUPABASE_ANON_KEY = 'votre-clé-anonyme'
```

### 3. Exécuter les scripts SQL

Exécutez les scripts SQL suivants dans l'éditeur SQL de Supabase :

- `schema.sql` — Création des tables
- `badges.sql` — Insertion des badges
- `policies.sql` — Politiques RLS
- `functions.sql` — Fonctions SQL (increment_votes, close_turn)

### 4. Configurer le Storage

Créez un bucket `covers` pour les images de couverture.

---

## 📱 Commandes utiles

```bash
# Lancer sur le web
npx expo start --web

# Lancer sur iOS
npx expo start --ios

# Lancer sur Android
npx expo start --android

# Build de production web
npx expo export:web

# Build APK
npx expo run:android

# Build IPA
npx expo run:ios
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment procéder :

1. Forker le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commiter vos changements (`git commit -m 'feat: add amazing feature'`)
4. Pousser (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- [Expo](https://expo.dev/) pour la plateforme de développement
- [Supabase](https://supabase.com/) pour le backend open-source
- [React Native](https://reactnative.dev/) pour le framework mobile

---

## 📞 Contact

- **Projet** : [GitHub](https://github.com/votre-repo)
