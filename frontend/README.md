# CRM Commercial - Solution GS

Application CRM complète pour la gestion commerciale de solutions de sécurité pour tabacs.

## Stack Technique

### Frontend (Ce projet - pour Lovable)
- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Lucide React** - Icons

### Backend (à déployer séparément sur Railway)
- **Node.js** + Express + TypeScript
- **Prisma** - ORM
- **PostgreSQL** - Base de données
- **JWT** - Authentification

## Configuration pour Lovable

### 1. Variables d'environnement
Configurez dans Lovable Settings > Environment Variables:

```
VITE_API_URL=https://votre-backend.railway.app/api
```

### 2. Structure des pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/prospects` | Liste des prospects |
| `/prospects/new` | Création prospect (wizard) |
| `/prospects/:id` | Détail prospect |
| `/calendar` | Calendrier RDV |
| `/quotes` | Liste des devis |
| `/quotes/new` | Création devis (CPQ) |
| `/admin/*` | Pages administration |

## Fonctionnalités

### Gestion Prospects
- Création avec wizard de qualification
- Scoring automatique
- Timeline d'activités
- Géocodage des adresses
- Carte interactive

### Rendez-vous
- Calendrier hebdomadaire
- Gestion des zones géographiques
- Synchronisation Google Calendar
- Rappels SMS

### Devis (CPQ)
- Catalogue produits configurable
- Kits prédéfinis
- Calcul automatique (HT, TVA, TTC)
- Mode leasing / comptant
- Génération PDF professionnelle
- Signature électronique

### Commissions
- Calcul automatique par vente
- Bonus performance
- Bonus parrainage
- Suivi des paiements

## Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| **ADMIN** | Accès total, configuration |
| **DIRECTION** | Stats, validation devis, commissions |
| **COMMERCIAL** | Prospects, RDV, devis (ses clients) |
| **SDR** | Qualification, prise de RDV |

## Déploiement Backend (Railway)

1. Créez un nouveau projet Railway
2. Ajoutez PostgreSQL
3. Déployez le dossier `/backend`
4. Configurez les variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=votre-secret-jwt
   ```
5. Exécutez les migrations: `npx prisma migrate deploy`

## API Endpoints principaux

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/prospects
POST   /api/prospects
GET    /api/prospects/:id
POST   /api/prospects/:id/qualify
GET    /api/appointments
POST   /api/appointments
GET    /api/quotes
POST   /api/quotes
GET    /api/exports/quote/:id/pdf
POST   /api/sms/send
```

## Support

Pour toute question, consultez la documentation ou contactez l'équipe technique.
