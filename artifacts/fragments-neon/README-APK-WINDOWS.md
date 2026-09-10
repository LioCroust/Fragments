# Compiler Fragments Neon en APK depuis Windows

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
artifacts\fragments-neon\Fragments-Neon-release.apk
```

Le fichier `.apk` est ignoré par Git afin de ne pas être ajouté au dépôt par
erreur.

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