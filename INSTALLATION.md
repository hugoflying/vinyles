# Installer la discothèque sur un nouveau compte Cloudflare

Ce guide met le site en ligne sur **votre** compte GitHub et **votre** compte Cloudflare, avec une discothèque vide,
puis donne à Hugo (et à son Claude) l'accès pour continuer les corrections.
Compter une vingtaine de minutes. Tout se fait dans le navigateur, rien à installer.
Il faut seulement un compte GitHub et un compte Cloudflare, gratuits tous les deux. Pas besoin de compte Claude.

**Partie A** (étapes 1 à 7) : pour le propriétaire du nouveau compte. **Partie B** (étapes 8 et 9) : pour Hugo.

## 1. Récupérer le dépôt sur GitHub

Hugo transfère son dépôt `hugoflying/vinyles` vers votre compte (Settings → Transfer ownership).
Accepter le transfert depuis le mail reçu de GitHub. Le dépôt arrive avec tout son historique.

## 2. Créer la base de données (D1)

1. Sur https://dash.cloudflare.com : **Storage & Databases → D1 SQL Database → Create**.
2. Nom : `vinyles`. Valider.
3. Sur la page de la base, copier le **Database ID** (une suite comme `c6c5b8e4-554b-…`).

Les tables se créent toutes seules au premier passage sur le site : aucune commande SQL à taper.

## 3. Créer le stockage des pochettes (R2)

1. **Storage & Databases → R2 Object Storage**. La première fois, Cloudflare demande d'activer R2 (gratuit jusqu'à 10 Go, une carte bancaire peut être demandée).
2. **Create bucket**, nom exact : `vinyles-pochettes`. Valider.

## 4. Mettre votre base dans le dépôt

1. Sur GitHub, dans votre copie du dépôt, ouvrir `wrangler.toml` puis le crayon (Edit).
2. Remplacer la valeur de `database_id` par le Database ID copié à l'étape 2.
3. **Commit changes**.

## 5. Créer le site sur Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git**, autoriser GitHub, choisir le dépôt `vinyles`.
2. Framework preset : **None**. Build command : vide. Build output directory : `.` (un point).
3. **Save and Deploy**. Le site reçoit une adresse du type `vinyles-xxx.pages.dev`.

## 6. Régler les deux secrets

Dans **Workers & Pages → vinyles → Settings → Variables and Secrets**, ajouter (type **Secret**, environnement Production) :

| Nom | Valeur |
| --- | --- |
| `ADMIN_KEY` | Un mot de passe au choix. C'est la clé du cadenas pour ajouter, modifier et supprimer des disques. |
| `DISCOGS_TOKEN` | Un jeton personnel Discogs, à créer sur https://www.discogs.com/settings/developers (« Generate new token »). |

Puis **Deployments → … → Retry deployment** pour que les secrets soient pris en compte.

## 7. Vérifier

1. Ouvrir l'adresse du site : la discothèque s'affiche, vide.
2. Cliquer sur le cadenas et entrer la clé `ADMIN_KEY`.
3. Ajouter un disque avec le bouton + : il doit rester après rechargement de la page.

Si un message parle de la base ou du stockage, vérifier les noms exacts (`vinyles` et `vinyles-pochettes`) et le `database_id` de `wrangler.toml`.

## 8. Donner l'accès à Hugo et à Claude

1. Dans le dépôt sur GitHub : **Settings → Collaborators → Add people**, ajouter `hugoflying`.
2. Ouvrir https://github.com/apps/claude/installations/new . La page « Sign in to GitHub to continue to Claude » est celle de GitHub :
   se connecter avec **son propre compte GitHub**.
3. Choisir son compte, cocher **Only select repositories**, sélectionner `vinyles`, puis **Install**.

Cela permet seulement au Claude de Hugo de lire le dépôt et d'y envoyer des corrections. L'accès se retire à tout moment
dans GitHub (Settings → Applications).

## 9. Côté Hugo

1. Accepter l'invitation de collaborateur reçue par mail (ou dans les notifications GitHub).
2. Dans le projet Claude, **Réglages du projet → Ressources** : ajouter le dépôt `son-compte/vinyles`.
   S'il n'apparaît pas, refaire la connexion sur https://claude.ai/connect-github puis réessayer.

Ensuite, chaque correction fusionnée sur la branche `main` de ce dépôt est mise en ligne automatiquement par Cloudflare.

## Facultatif : Spotify à la place de Deezer

Sans rien régler, la fiche d'un disque montre le lecteur **Deezer**. Pour avoir le lecteur **Spotify** sur un site :

1. Sur https://developer.spotify.com/dashboard , se connecter avec un compte Spotify **Premium**
   (Spotify l'exige pour les petites applications), puis **Create app**.
   Nom et description au choix, *Redirect URIs* : l'adresse du site, par exemple `https://vinyles.pages.dev/`, puis **Add** (pas utilisée, mais obligatoire ; Spotify refuse `localhost`), cocher **Web API**, puis **Save**.
2. Dans l'application : **Settings**, copier le **Client ID**, puis **View client secret** et copier le **Client secret**.
3. Sur Cloudflare, dans le projet Pages : **Settings → Variables and Secrets → Add**, type **Secret** :
   `SPOTIFY_CLIENT_ID` puis `SPOTIFY_CLIENT_SECRET`, avec les deux valeurs copiées.
4. **Deployments → … → Retry deployment** sur le dernier déploiement, pour que les secrets soient pris en compte.

Pour revenir à Deezer, il suffit de supprimer ces deux secrets et de redéployer.
