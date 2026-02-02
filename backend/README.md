# CRM Commercial - Solution GS - Backend API

API REST pour le CRM de gestion commerciale Solution GS.

## Stack Technique

- **Node.js 18+** + Express
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **JWT** pour l'authentification
- **PDFKit** pour la génération de PDF

## Déploiement sur Railway

### 1. Créer le projet
1. Connectez-vous à [Railway](https://railway.app)
2. Cliquez "New Project" > "Deploy from GitHub"
3. Sélectionnez ce repository, dossier `/backend`

### 2. Ajouter PostgreSQL
1. Dans le projet, cliquez "Add Service" > "PostgreSQL"
2. Railway créera automatiquement la variable `DATABASE_URL`

### 3. Variables d'environnement
Ajoutez ces variables dans Railway (Settings > Variables):

```env
JWT_SECRET=votre-secret-jwt-super-securise
NODE_ENV=production
PORT=3001

# Optionnel - Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://votre-app.railway.app/api/calendar/google/callback

# Optionnel - SMS (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Optionnel - SMS (OVH)
OVH_SMS_SERVICE=...
OVH_APP_KEY=...
OVH_APP_SECRET=...
OVH_CONSUMER_KEY=...
```

### 4. Déployer
Railway déploiera automatiquement. Le script `postinstall` exécute:
- `prisma generate` - Génère le client Prisma
- `prisma migrate deploy` - Applique les migrations

### 5. Créer l'admin initial
Après le premier déploiement, créez un utilisateur admin via l'API:

```bash
curl -X POST https://votre-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@solutionsg.fr",
    "password": "VotreMotDePasse123!",
    "firstName": "Admin",
    "lastName": "SGS",
    "role": "ADMIN"
  }'
```

## API Endpoints

### Authentification
```
POST /api/auth/register    # Inscription
POST /api/auth/login       # Connexion
GET  /api/auth/me          # Profil utilisateur
```

### Prospects
```
GET    /api/prospects              # Liste avec filtres
POST   /api/prospects              # Créer un prospect
GET    /api/prospects/:id          # Détail
PUT    /api/prospects/:id          # Modifier
POST   /api/prospects/:id/qualify  # Qualifier
POST   /api/prospects/:id/geocode  # Géocoder l'adresse
```

### Rendez-vous
```
GET    /api/appointments           # Liste
POST   /api/appointments           # Créer
PUT    /api/appointments/:id       # Modifier
DELETE /api/appointments/:id       # Supprimer
```

### Devis
```
GET    /api/quotes                 # Liste
POST   /api/quotes                 # Créer
GET    /api/quotes/:id             # Détail
PUT    /api/quotes/:id             # Modifier
POST   /api/quotes/:id/sign        # Signer
```

### Exports
```
GET /api/exports/prospects         # Export CSV prospects
GET /api/exports/quotes            # Export CSV devis
GET /api/exports/quote/:id/pdf     # PDF devis
```

### SMS
```
POST /api/sms/send                 # Envoyer SMS
POST /api/sms/send-bulk            # Envoi groupé
POST /api/sms/reminder/:id         # Rappel RDV
```

## Développement local

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Editez .env avec votre DATABASE_URL

# Migrations
npx prisma migrate dev

# Lancer le serveur
npm run dev
```

## Structure du projet

```
backend/
├── prisma/
│   └── schema.prisma      # Schéma de base de données
├── src/
│   ├── index.ts           # Point d'entrée
│   ├── routes/            # Routes API
│   ├── middleware/        # Middlewares (auth, etc.)
│   ├── services/          # Services (PDF, SMS, etc.)
│   └── types/             # Types TypeScript
├── package.json
└── tsconfig.json
```

## Support

Pour toute question technique, consultez la documentation ou ouvrez une issue.
