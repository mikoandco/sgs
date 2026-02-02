# CRM Commercial - Solution GS

Application CRM complète pour la gestion commerciale de solutions de sécurité et d'affichage dynamique pour tabacs.

## Architecture

```
sgs/
├── frontend/          # Application React (Lovable)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   └── package.json
│
└── backend/           # API Node.js (Railway)
    ├── prisma/
    ├── src/
    │   ├── routes/
    │   ├── services/
    │   └── middleware/
    └── package.json
```

## Déploiement

### Frontend → Lovable
1. Importez le dossier `/frontend` dans Lovable
2. Configurez la variable `VITE_API_URL` avec l'URL du backend

### Backend → Railway
1. Créez un projet Railway avec PostgreSQL
2. Déployez le dossier `/backend`
3. Configurez les variables d'environnement (voir backend/README.md)

## Fonctionnalités principales

### Gestion des prospects
- Wizard de création avec qualification
- Scoring automatique
- Timeline d'activités
- Géocodage des adresses
- Carte interactive des RDV

### CPQ (Configure Price Quote)
- Catalogue produits configurable
- Kits prédéfinis
- Calcul automatique TVA
- Mode leasing / comptant
- Génération PDF professionnelle

### Intégrations
- Google Calendar (synchronisation bidirectionnelle)
- SMS (Twilio / OVH)
- Géocodage (API data.gouv.fr)

### Commissions
- Calcul automatique par vente
- Bonus performance
- Bonus parrainage

## Rôles

| Rôle | Description |
|------|-------------|
| ADMIN | Configuration système, tous les accès |
| DIRECTION | Stats, validation, commissions |
| COMMERCIAL | Gestion de ses prospects et devis |
| SDR | Qualification et prise de RDV |

## Technologies

| Couche | Stack |
|--------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT |

## Licence

Propriétaire - Solution GS
