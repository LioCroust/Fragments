# Compiler Fragments en APK sans Android Studio

La méthode la plus simple consiste à utiliser **GitHub Desktop pour envoyer le
projet**, puis **GitHub Actions pour compiler automatiquement l’APK**. Android
Studio, Java et le SDK Android ne sont alors pas nécessaires sur ton PC.

## Méthode recommandée : GitHub Desktop + GitHub Actions

### 1. Envoyer le projet avec GitHub Desktop

1. Ouvrir le dépôt dans GitHub Desktop.
2. Vérifier que les fichiers suivants apparaissent dans les changements :
   - `.github/workflows/build-fragments-neon-apk.yml` ;
   - `artifacts/fragments-neon/android/` ;
   - `artifacts/fragments-neon/README-APK-WINDOWS.md`.
3. Écrire un message de commit, par exemple :
   `Préparer la compilation APK`.
4. Cliquer sur **Commit to main**.
5. Cliquer sur **Push origin**.

### 2. Laisser GitHub compiler l’APK

Après le push, la compilation démarre automatiquement.

1. Ouvrir le dépôt sur GitHub.com.
2. Cliquer sur l’onglet **Actions**.
3. Ouvrir **Build Fragments APK**.
4. Attendre que l’exécution affiche une coche verte.
5. Ouvrir l’exécution terminée.
6. Dans la section **Artifacts**, télécharger :
   `fragments-apk-...`.
7. Décompresser le fichier téléchargé.

La version Android augmente automatiquement à chaque compilation GitHub. Le
dernier numéro de l'exécution est utilisé comme numéro de build :

- par exemple `1.0.1` ;
- puis `1.0.2` à l'exécution suivante ;
- et ainsi de suite.

Le numéro de version Android (`versionCode`) suit le même numéro de build, ce
qui permet d’installer une nouvelle APK par-dessus la précédente.

L’APK à installer est :

```text
app-release.apk
```

Pour lancer une compilation manuellement sans modifier le code :

1. Aller dans **Actions**.
2. Choisir **Build Fragments APK**.
3. Cliquer sur **Run workflow**.
4. Cliquer à nouveau sur **Run workflow**.

Cette méthode utilise les outils Android et Java sur la machine GitHub Actions.
Ton PC n’a donc besoin que de GitHub Desktop et d’un navigateur.

## Installer l’APK sur le téléphone

1. Envoyer `app-release.apk` sur le téléphone, par câble USB, Drive ou un
   autre moyen de transfert.
2. Ouvrir le fichier APK sur le téléphone.
3. Si Android le demande, autoriser l’installation depuis cette source.
4. Confirmer l’installation.

L’APK est signé avec la clé debug générée pour les tests. Il est adapté à une
installation directe sur ton téléphone. Une signature release personnelle sera
nécessaire pour une publication Google Play.

---

## Alternative locale : Android Studio ou Gradle sous Windows

Le projet Android natif est déjà généré dans `android/`. Il peut être ouvert
dans Android Studio ou compilé directement avec le wrapper Gradle fourni.

## Pré-requis à installer sur le PC

1. **GitHub Desktop** pour cloner et synchroniser le dépôt.
2. **Node.js 20 LTS** ou une version LTS plus récente.
3. **pnpm** :

   ```powershell
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

4. **Android Studio**, avec :
   - Android SDK ;
   - Android SDK Platform correspondant à la version demandée par Gradle ;
   - Android SDK Build-Tools ;
   - Android SDK Command-line Tools ;
   - un appareil virtuel ou un téléphone Android avec le débogage USB.
5. Un **JDK 17** configuré pour Android Studio et Gradle.

Android Studio peut installer automatiquement une partie des composants
manquants lors de la première synchronisation.

## Étapes avec GitHub Desktop

1. Dans GitHub Desktop, choisir **File → Clone repository**.
2. Sélectionner le dépôt contenant ce projet.
3. Ouvrir le dossier cloné dans l’Explorateur Windows.
4. Ouvrir un terminal dans le dossier racine du dépôt.
5. Installer les dépendances :

   ```powershell
   corepack enable
   pnpm install --frozen-lockfile
   ```

6. Lancer le script :

   ```powershell
   .\artifacts\fragments-neon\scripts\build-apk-windows.bat
   ```

L’APK sera copié ici :

```text
artifacts\fragments-neon\Fragments-release.apk
```

Le fichier `.apk` est ignoré par Git afin de ne pas être ajouté au dépôt par
erreur.

## Tester rapidement avec Expo Go sur Android

Cette méthode est adaptée aux tests répétés sur un téléphone Android. Elle ne
dépend pas du domaine réseau Replit : Expo tourne directement sur ton
ordinateur et le téléphone le rejoint sur le même Wi-Fi.

### Pré-requis

- Node.js 20 LTS ou une version LTS plus récente ;
- GitHub Desktop ou Git pour récupérer le projet ;
- pnpm ;
- Expo Go installé sur le téléphone Android ;
- l’ordinateur et le téléphone connectés au même réseau Wi-Fi.

Dans PowerShell, depuis le dossier racine du projet :

```powershell
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm install --frozen-lockfile
pnpm --filter @workspace/fragments-neon run dev:local
```

Expo affiche ensuite un QR code. Scanne-le avec Expo Go. Pour arrêter le
serveur, utilise `Ctrl+C`.

Si Windows affiche une demande d’autorisation réseau pour Node.js, autorise
Node.js sur les réseaux privés. N’utilise pas le réseau Wi-Fi invité, qui
bloque souvent la communication entre les appareils.

Cette commande locale est distincte de la commande Replit `dev`, qui conserve
son fonctionnement actuel dans le Preview.

## Compilation avec Android Studio

1. Ouvrir le dossier suivant dans Android Studio :

   ```text
   artifacts\fragments-neon\android
   ```

2. Attendre la synchronisation Gradle.
3. Pour un APK de test, choisir **Build → Build APK(s)**.
4. Pour une version release, lancer dans un terminal PowerShell :

   ```powershell
   cd artifacts\fragments-neon\android
   .\gradlew.bat assembleRelease
   ```

Le résultat se trouve dans :

```text
artifacts\fragments-neon\android\app\build\outputs\apk\release\app-release.apk
```

## Signature de l’APK

La configuration générée utilise temporairement la clé debug Android pour
permettre une compilation locale immédiate. Cette version est adaptée aux
tests et à l’installation sur ton téléphone.

Pour publier sur Google Play ou distribuer une version officielle, il faudra
remplacer cette configuration par une clé de signature release personnelle et
ne jamais committer cette clé dans GitHub.

L’identifiant Android actuel est conservé :

```text
com.fragments.app
```

Ne le change pas après la première installation si tu veux conserver
l’identité de l’application et ses futures mises à jour.

## Dépannage rapide

### `pnpm` introuvable

Fermer puis rouvrir le terminal après :

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

### `JAVA_HOME` ou Java introuvable

Installer JDK 17, puis sélectionner ce JDK dans :

**Android Studio → Settings → Build, Execution, Deployment → Build Tools →
Gradle → Gradle JDK**

### SDK Android introuvable

Dans Android Studio :

**More Actions → SDK Manager**

Installer le SDK, les Build-Tools et les Command-line Tools, puis configurer
`ANDROID_HOME` si Android Studio ne le détecte pas automatiquement.