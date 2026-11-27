/* Traduction de l'interface (français → anglais).
   Le code reste écrit en français ; en anglais, chaque texte affiché est traduit à la volée
   (textes, info-bulles, champs vides, messages d'After Effects). */
(function () {
  var lang = "en";
  try { lang = JSON.parse(localStorage.getItem("sz_lang")) || "en"; } catch (e) {}

  /* Textes complets */
  var EXACT = {
    // Hub, réglages, licence
    "Réglages": "Settings", "Terminé": "Done", "Onglets": "Tabs", "Accès rapide": "Quick access", "Licence": "License",
    "Langue": "Language", "Passage en français…": "Passage en français…",
    "Appliqué en cliquant sur Terminé · Applied when you click Done": "Applied when you click Done",
    "Glisse pour changer l'ordre. Les onglets décochés passent dans le menu ☰.": "Drag to reorder. Unchecked tabs move to the ☰ menu.",
    "Afficher le nom sous les icônes": "Show names under icons",
    "Clic droit sur n'importe quel bouton d'un onglet pour l'épingler en haut du panneau. Glisse pour réordonner.": "Right-click any button in a tab to pin it at the top of the panel. Drag to reorder.",
    "Aucune action épinglée pour l'instant.": "No pinned actions yet.",
    "Mode développement : aucune licence demandée.": "Development mode: no license required.",
    "Gérer la licence": "Manage license", "Activer une licence": "Activate a license",
    "Réinitialiser la disposition": "Reset layout", "Disposition réinitialisée.": "Layout reset.",
    "Clique à nouveau pour confirmer": "Click again to confirm", "Personnaliser…": "Customize…",
    "Autres outils": "More tools", "Clic droit sur un bouton pour l'épingler ici": "Right-click a button to pin it here",
    "Masquer": "Hide", "Glisser pour déplacer": "Drag to move", "Retirer": "Remove",
    "Garde au moins un onglet visible.": "Keep at least one tab visible.",
    "Ce bouton ne peut pas être épinglé.": "This button can't be pinned.",
    "Action introuvable : réépingle-la depuis son onglet.": "Action not found: pin it again from its tab.",
    "Le module de cette action n'est plus installé.": "This action's module is no longer installed.",
    "Aucun module installé.": "No modules installed.",
    "Activer Toolkit": "Activate Toolkit",
    "Pas encore de licence ?": "No license yet?", "Acheter sur Gumroad": "Buy on Gumroad", "Vérification…": "Checking…", "Licence activée. Bienvenue !": "License activated. Welcome!",
    "Entre ta clé de licence.": "Enter your license key.",
    "Séparer les dimensions automatiquement": "Separate dimensions automatically", "Séparer": "Separate", "Annulé.": "Cancelled.",
    "Quand une courbe dépasse du carré (Back…) sur une Position, la séparation X / Y est faite sans te demander.": "When a curve overshoots (Back…) on a Position, X / Y separation is done without asking.",
    "Cette courbe dépasse : sur une Position, il faut séparer les dimensions (X / Y) pour l'appliquer. Séparer ?": "This curve overshoots: on a Position, dimensions (X / Y) must be separated to apply it. Separate?",
    "Jouer": "Play", "Rejouer": "Play again", "Touche un maximum de cibles en 20 s": "Hit as many targets as you can in 20 s",
    "Codec": "Codec",
    "Pipette": "Eyedropper", "Loupe (zoom sur les pixels)": "Magnifier (pixel zoom)", "bêta": "beta",
    "Remplace ce mot dans le nom des copies (compo et précompos)": "Replaces this word in the copies' names (comp and precomps)",
    "2 clés sélectionnées : courbe entière · 1 seule clé : seulement son côté": "2 selected keys: whole curve · 1 key only: just its side",
    "Clic ou glisser sur la courbe : charger · Double-clic ou glisser sur « Appliquer » : appliquer · étoile : favori.": "Click or drag onto the curve: load · Double-click or drag onto “Apply”: apply · star: favorite.",
    "Sélectionne 2 clés pour la courbe entière, ou 1 seule clé pour ne changer que son côté (sa sortie si c'est la première, son entrée si c'est la dernière).": "Select 2 keys for the whole curve, or a single key to change only its side (its out if it's the first, its in if it's the last).",
    "Glisse les poignées pour modifier la courbe du décalage": "Drag the handles to edit the offset curve",
    "Supprimer ce format": "Delete this format", "Supprimer ce preset": "Delete this preset", "Clique encore pour supprimer": "Click again to delete",
    "Décaler de": "Offset by",
    "Entière": "Whole", "Origine": "Native", "Près du projet": "Next to project",
    "Ajouté au nom des copies quand « Changer » est vide": "Added to the copies' names when “Replace” is empty",
    "Ajouté devant le nom des compos créées (ex. nom du projet)": "Added before the name of created comps (e.g. project name)",
    "Les précompos dont le nom contient un de ces mots ne sont pas copiées (elles restent partagées)": "Precomps whose name contains one of these words are not copied (they stay shared)",
    "Ctrl/Cmd + clic : plusieurs · Double-clic : créer": "Ctrl/Cmd + click: several · Double-click: create",
    "Ranger la copie dans un dossier": "Put the copy in a folder", "Optionnel": "Optional", "Fond": "Background", "ex. Logo": "e.g. Logo",
    "Copier des clés : récupère la courbe entre les 2 clés sélectionnées": "Copy from keys: reads the curve between the 2 selected keys",
    "= numéro (autant de chiffres que de #, ex. ### → 001).": "= number (as many digits as #, e.g. ### → 001).",
    "Réglages · mode développement": "Settings · development mode", "Réglages · hors ligne (licence vérifiée plus tard)": "Settings · offline (license checked later)",
    "Pose sur la compo active un calque guide (jamais rendu) : en rouge, les zones cachées par l'interface de l'appli. Un seul guide à la fois : choisir un autre réseau remplace le précédent, recliquer sur le guide actif le retire.": "Puts a guide layer (never rendered) on the active comp: in red, the areas hidden by the app's interface. One guide at a time: picking another network replaces the previous one, clicking the active guide again removes it.",
    ": sur un profil Instagram, les posts 4:5 sont affichés recadrés en 3:4 ; le guide montre ce qui reste visible.": ": on an Instagram profile, 4:5 posts are shown cropped to 3:4; the guide shows what stays visible.",
    "Grille Insta": "Insta grid", "Grille du profil Instagram : les posts 4:5 y sont recadrés en 3:4": "Instagram profile grid: 4:5 posts are cropped to 3:4 there",
    "+ Nom actuel": "+ Current name", "Insère le nom actuel de chaque élément": "Inserts each item's current name",
    "Numéro sans zéro : 1, 2… 10": "Number without padding: 1, 2… 10", "Numéro sur 2 chiffres : 01, 02… 10": "2-digit number: 01, 02… 10", "Numéro sur 3 chiffres : 001, 002…": "3-digit number: 001, 002…",
    "ex. Titre_##": "e.g. Title_##", "Premier numéro attribué (1 → Titre_01, 5 → Titre_05)": "First number given (1 → Title_01, 5 → Title_05)",
    "Écris un nom (ex. Titre_##) ou utilise les boutons + juste en dessous.": "Type a name (e.g. Title_##) or use the + buttons just below.",
    "Originale": "Original", "Taille": "Size", "Largeur maximale du fichier compressé (jamais agrandi)": "Maximum width of the compressed file (never upscaled)",
    "Garder aussi le fichier haute qualité": "Also keep the high-quality file",
    "C'est un réglage, pas une action : il est pris en compte par le bouton qui applique (ex. « Appliquer »). Épingle plutôt ce bouton-là.": "This is a setting, not an action: it's used by the button that applies (e.g. “Apply”). Pin that button instead.",
    "Favoris": "Favorites", "Palette": "Palette", "Ajouter le contour": "Add stroke", "Nouvelle expression": "New expression",
    "Clique sur l'étoile d'un preset pour l'épingler ici.": "Click the star on a preset to pin it here.",
    "Clic ou glisser sur la courbe : charger · Double-clic ou glisser sur « Appliquer » : appliquer · étoile : favori": "Click or drag onto the curve: load · Double-click or drag onto “Apply”: apply · star: favorite",
    "Colle la clé de licence reçue par mail après ton achat sur Gumroad.": "Paste the license key you received by email after buying on Gumroad.",
    "Clé de licence": "License key", "Activer": "Activate", "Acheter une licence": "Buy a license",
    "Licence active": "License active", "Merci pour ton achat.": "Thanks for your purchase.",
    "Clé": "Key", "Compte": "Account", "Version": "Version", "Retour": "Back",
    "Désactiver sur ce poste": "Deactivate on this computer", "Entre ta clé de licence.": "Enter your license key.",
    "Vérification…": "Checking…", "Licence activée.": "License activated.", "Clé de licence invalide.": "Invalid license key.",
    "Cet achat a été remboursé.": "This purchase was refunded.", "Cet achat fait l'objet d'un litige.": "This purchase is disputed.",
    "L'abonnement lié à cette clé n'est plus actif.": "The subscription for this key is no longer active.",
    "Impossible de joindre Gumroad. Vérifie ta connexion.": "Can't reach Gumroad. Check your connection.",
    "hors ligne": "offline", "Réglages ": "Settings",
    "After Effects n'a rien renvoyé. Ouvre la console (localhost:8088) pour le détail.": "After Effects returned nothing. Open the console (localhost:8088) for details.",
    "Erreur ExtendScript : le code du module n'est pas chargé dans After Effects.": "ExtendScript error: the module code isn't loaded in After Effects.",
    "Aucune réponse d'After Effects.": "No response from After Effects.",
    "(simulation hors After Effects)": "(simulated outside After Effects)",
    "Chargement :": "Loading:",
    "Aucune composition active.": "No active composition.",

    // Onglets
    "Compos": "Comps", "Ancrage": "Anchor", "Courbes": "Curves", "Clés": "Keys", "Couleurs": "Colors",
    "Expressions": "Expressions", "Calques": "Layers", "Projet": "Project", "Export": "Export",

    // Compos
    "Réseaux sociaux": "Social media", "Vidéo": "Video", "Mes formats": "My formats", "Carré": "Square",
    "Ajouter un format perso": "Add a custom format", "Ajoute tes formats clients avec +.": "Add your client formats with +.",
    "Clic : choisir · Ctrl/Cmd + clic : plusieurs formats · Double-clic : créer tout de suite": "Click: choose · Ctrl/Cmd + click: several formats · Double-click: create right away",
    "Nom (ex. Écran salon)": "Name (e.g. Lobby screen)", "Compo active": "Active comp",
    "Reprendre la taille de la compo active": "Use the active comp's size", "Annuler": "Cancel", "Ajouter": "Add",
    "Images/s": "Frames/s", "Durée": "Duration", "Fond": "Background", "Couleur de fond": "Background color",
    "Préfixe": "Prefix", "Nom du projet (optionnel)": "Project name (optional)",
    "Créer": "Create", "Créer la compo": "Create comp",
    "Adapter à d'autres formats": "Adapt to other formats",
    "Ton anim est finie en 16:9 et il te faut la version 4:5 et 9:16 ? Ouvre-la, choisis les formats au-dessus (Ctrl/Cmd + clic), puis clique ici.": "Finished your animation in 16:9 and need 4:5 and 9:16 versions? Open it, pick the formats above (Ctrl/Cmd + click), then click here.",
    "Une compo est créée par format, avec ton anim dedans, recadrée. Tu modifies l'original, toutes les versions suivent.": "One comp is created per format, with your animation inside, reframed. Edit the original and every version follows.",
    "Cadrage": "Framing", "Tout voir": "Fit", "Remplir le cadre": "Fill frame", "Adapter la compo active": "Adapt active comp",
    "Dupliquer en profondeur": "Deep duplicate", "Copie la compo": "Copies the comp", "et toutes ses précompos": "and all its precomps",
    ": la copie est totalement indépendante de l'original. Les médias (vidéos, images, sons) restent partagés.": ": the copy is fully independent from the original. Media (video, images, sound) stay shared.",
    "Source": "Source", "Sélection Projet": "Project selection", "Changer": "Replace", "par": "with",
    "Suffixe": "Suffix", "si rien à changer": "if nothing to replace", "Exclure": "Exclude",
    "Précompos à garder partagées (ex. Logo)": "Precomps to keep shared (e.g. Logo)",
    "Les précompos dont le nom contient un de ces mots ne sont pas copiées": "Precomps whose name contains one of these words are not copied",
    "Ranger la copie dans un nouveau dossier": "Put the copy in a new folder",
    "Duplication en cours…": "Duplicating…", "Choisis au moins un format.": "Choose at least one format.",
    "Ouvre la compo à décliner.": "Open the comp to adapt.",
    "Indique une largeur et une hauteur (en px).": "Enter a width and height (px).",
    // Nouveautés 0.17
    "Marges de sécurité": "Safe zones", "Grille 3:4": "Grid 3:4",
    "Instagram / Facebook Reels (9:16)": "Instagram / Facebook Reels (9:16)", "Instagram / Facebook Stories (9:16)": "Instagram / Facebook Stories (9:16)",
    "Zone visible dans la grille du profil Instagram (3:4)": "Area visible in the Instagram profile grid (3:4)",
    "Ajoute à la compo active un calque guide (jamais rendu) qui montre en rouge les zones cachées par l'interface. Clique à nouveau pour le retirer.": "Adds a guide layer (never rendered) to the active comp, showing in red the areas hidden by the app's interface. Click again to remove it.",
    "Secondes, images, ou timecode (ex. 00:00:10:00)": "Seconds, frames, or timecode (e.g. 00:00:10:00)", "im": "fr",
    "Chaque calque": "Each layer", "Toute la sélection": "Whole selection",
    "« Toute la sélection » : un ancrage commun, pour tourner un groupe autour de son centre.": "“Whole selection”: one shared anchor, to rotate a group around its center.",
    "Départ + arrivée": "Start + end", "Départ": "Start", "Arrivée": "End", "Partie de la courbe à appliquer": "Part of the curve to apply",
    "Clic ou glisser sur la courbe : charger · Double-clic ou glisser sur « Appliquer » : appliquer · ☆ : favori": "Click or drag onto the curve: load · Double-click or drag onto “Apply”: apply · ☆: favorite",
    "Inverser valeurs": "Reverse values", "Arrondir à l'image": "Snap to frames",
    "Inverse les valeurs des clés sélectionnées, sans toucher à leur timing ni à leurs courbes": "Reverses the selected keys' values, without changing their timing or curves",
    "Recale sur une image entière les clés qui tombent entre deux images": "Moves keys that fall between frames onto whole frames",
    "Rythme": "Rhythm", "Régulier": "Even", "Selon la courbe": "Follow curve",
    "Toutes les clés sont déjà sur des images entières.": "All keys are already on whole frames.",
    "Remplacer une couleur": "Replace a color", "Couleur à remplacer": "Color to replace", "Couleur courante": "Current color",
    "Où": "Where", "Tout le projet": "Whole project", "Tolérance": "Tolerance", "0 = identique": "0 = exact",
    "Remplacer par la couleur courante": "Replace with current color",
    "Remplit aussi les clés animées, les textes et les solides. Maj + clic sur une pastille la choisit comme couleur à remplacer.": "Also updates animated keys, text and solids. Shift + click a swatch to pick it as the color to replace.",
    "Clic : appliquer · Alt + clic : charger dans l'éditeur · Maj + clic : couleur à remplacer": "Click: apply · Alt + click: load in editor · Shift + click: color to replace",
    "Les deux couleurs sont identiques.": "Both colors are the same.",
    "Exporter cette palette en .ase (Illustrator, Photoshop)": "Export this palette as .ase (Illustrator, Photoshop)",
    "Export indisponible hors After Effects.": "Export unavailable outside After Effects.", "La palette est vide.": "The palette is empty.",
    "Enchaîner les morceaux": "Chain the pieces", "im.": "fr.",
    "Enchaîner": "Chain", ": chaque morceau démarre ce nombre d'images après le précédent, prêt pour une animation lettre par lettre.": ": each piece starts that many frames after the previous one, ready for a letter-by-letter animation.",
    "Profil d'export": "Export profile", "Enregistrer les réglages actuels comme profil": "Save current settings as a profile",
    "Supprimer ce profil": "Delete this profile", "Nom du profil": "Profile name", "Profil : réglages libres": "Profile: custom settings",
    "Réseaux sociaux · MP4 léger": "Social media · light MP4", "Client · haute qualité": "Client · high quality", "GIF léger (Slack, mail)": "Light GIF (Slack, email)",
    "Clique encore pour supprimer le profil.": "Click again to delete the profile.",

    "Options avancées": "Advanced options", "0 = couleur identique": "0 = exact color", "Aucune autre palette.": "No other palettes.",
    "Secondes": "Seconds", "Images": "Frames", "Timecode (hh:mm:ss:ii)": "Timecode (hh:mm:ss:ff)", "TC": "TC",

    // Projet
    "Ranger le projet": "Organize project", "Ranger par type": "Organize by type",
    "Compos, précomps, vidéos, images, audio, solides": "Comps, precomps, videos, images, audio, solids",
    "Fusionner les doublons": "Merge duplicates", "Métrages importés plusieurs fois": "Footage imported more than once",
    "Supprimer l'inutilisé": "Remove unused", "Métrages non utilisés et dossiers vides": "Unused footage and empty folders",
    "Annulable avec Ctrl/Cmd + Z": "Undo with Ctrl/Cmd + Z",
    "Renommer": "Rename", "Début": "Start", "Pas": "Step", "Commencer à": "Start at", "Écart": "Increment",
    "Premier numéro attribué (1 → Forme 01, 5 → Forme 05)": "First number given (1 → Shape 01, 5 → Shape 05)",
    "Écart entre deux numéros (1 → 01, 02, 03 · 10 → 10, 20, 30)": "Gap between two numbers (1 → 01, 02, 03 · 10 → 10, 20, 30)", "Renommer la sélection": "Rename selection",
    "= nom actuel ·": "= current name ·", "= numéro (autant de chiffres que de #).": "= number (as many digits as #).",
    "Agit sur les calques sélectionnés, sinon sur les éléments sélectionnés du panneau Projet.": "Acts on selected layers, otherwise on items selected in the Project panel.",
    "Rien à ranger : la racine du projet est déjà propre.": "Nothing to organize: the project root is already clean.",
    "Indique un modèle de nom.": "Enter a name pattern.",
    "Sélectionne des calques (ou des éléments du panneau Projet).": "Select layers (or items in the Project panel).",

    // Ancrage
    "Point d'ancrage": "Anchor point", "Inclure le contour": "Include stroke",
    "Le calque ne bouge pas : la position est compensée.": "The layer doesn't move: position is compensated.",
    "Fonctionne en 2D, 3D et avec parentage.": "Works in 2D, 3D and with parenting.",
    "Haut gauche": "Top left", "Haut": "Top", "Haut droite": "Top right", "Gauche": "Left", "Centre": "Center",
    "Droite": "Right", "Bas gauche": "Bottom left", "Bas": "Bottom", "Bas droite": "Bottom right",
    "Sélectionne au moins un calque.": "Select at least one layer.",

    // Courbes
    "Courbe": "Curve", "Appliquer aux clés sélectionnées": "Apply to selected keys", "⧉ Copier des clés": "⧉ Copy from keys", "Copier des clés": "Copy from keys",
    "+ Enregistrer": "+ Save", "★ Favoris": "★ Favorites", "Presets": "Presets",
    "Clic : charger · Double-clic : appliquer · ☆ : favori": "Click: load · Double-click: apply · ☆: favorite",
    "Clique sur ☆ d'un preset pour l'épingler ici.": "Click ☆ on a preset to pin it here.",
    "Colle une valeur cubic-bezier": "Paste a cubic-bezier value",
    "Récupère la courbe entre les 2 clés sélectionnées pour la coller ailleurs ou l'enregistrer": "Gets the curve between the 2 selected keys to paste elsewhere or save it",
    "Enregistrer la courbe actuelle dans tes presets": "Save the current curve to your presets",
    "Nom du preset": "Preset name", "OK": "OK", "Supprimer": "Delete",
    "Ajouter aux favoris": "Add to favorites", "Retirer des favoris": "Remove from favorites",
    "Pelure d'oignon : montre les positions à intervalles réguliers": "Onion skin: shows positions at regular intervals",
    "Linéaire": "Linear", "Doux": "Smooth",
    "Courbe copiée. Sélectionne les clés cibles puis Appliquer.": "Curve copied. Select the target keys, then Apply.",
    "Format attendu : x1, y1, x2, y2": "Expected format: x1, y1, x2, y2",
    "Sélectionne au moins 2 images clés.": "Select at least 2 keyframes.",
    "Sélectionne 2 images clés sur une propriété animée.": "Select 2 keyframes on an animated property.",
    "Les deux clés ont la même valeur, courbe illisible.": "Both keys have the same value, can't read the curve.",
    "Aucun segment à modifier.": "No segment to change.",
    "Dépassement impossible sur une position (vitesse ≥ 0), courbe adaptée": "Overshoot isn't possible on a position (speed ≥ 0), curve adjusted",

    // Clés
    "Valeur": "Value", "Copier la valeur": "Copy value", "Coller la valeur": "Paste value",
    "Mémorise la valeur des clés sélectionnées": "Stores the value of the selected keys",
    "Pose la valeur mémorisée sur les clés sélectionnées, sans toucher à leur timing ni à leur courbe": "Puts the stored value on the selected keys, without changing their timing or curve",
    "La courbe des clés copiées est aussi envoyée dans l'onglet Courbes.": "The copied keys' curve is also sent to the Curves tab.",
    "Temps": "Time", "Inverser": "Reverse", "Miroir": "Mirror", "Aligner début": "Align start", "Aligner fin": "Align end",
    "Cloner ici": "Clone here", "Sur l'indicateur": "To playhead",
    "Renverse l'ordre des clés sélectionnées": "Reverses the order of the selected keys",
    "Ajoute le chemin retour après la dernière clé": "Adds the return path after the last key",
    "Aligne la première clé de chaque propriété sur la plus précoce": "Aligns each property's first key to the earliest one",
    "Aligne la dernière clé de chaque propriété sur la plus tardive": "Aligns each property's last key to the latest one",
    "Duplique les clés sélectionnées à l'indicateur de temps": "Duplicates the selected keys at the playhead",
    "Déplace les clés sélectionnées sur l'indicateur de temps": "Moves the selected keys to the playhead",
    "Escalier": "Stagger", "Décalage": "Offset", "images": "frames", "Ordre": "Order", "↓ Haut": "↓ Top", "↑ Bas": "↑ Bottom",
    "Aléatoire": "Random", "Décaler": "Apply to", "Clés sélect.": "Selected keys", "Appliquer l'escalier": "Apply stagger",
    "Étirer le timing": "Stretch timing", "Étirer": "Stretch",
    "Rien à coller : copie d'abord des clés.": "Nothing to paste: copy keys first.",
    "Sélectionne des images clés à copier.": "Select keyframes to copy.",
    "Seule la première propriété est copiée.": "Only the first property is copied.",
    "Sélectionne les clés qui recevront la valeur.": "Select the keys that will receive the value.",
    "Sélectionne au moins 2 images clés sur une propriété.": "Select at least 2 keyframes on a property.",
    "Sélectionne au moins 2 calques.": "Select at least 2 layers.",
    "Sélectionne des images clés sur les calques.": "Select keyframes on the layers.",
    "Sélectionne des images clés.": "Select keyframes.", "Déjà alignées.": "Already aligned.",
    "Clés alignées sur l'indicateur": "Keys aligned to playhead", "Clés clonées à l'indicateur": "Keys cloned at playhead",
    "Place l'indicateur de temps là où cloner les clés.": "Move the playhead to where the keys should be cloned.",
    "Sélectionne des clés sur au moins 2 propriétés.": "Select keys on at least 2 properties.",
    "Pourcentage invalide.": "Invalid percentage.", "Aucune clé compatible.": "No compatible key.",

    // Couleurs
    "Remplissage": "Fill", "Contour": "Stroke", "Appliquer": "Apply", "Appliquer au contour": "Apply to stroke", "+ Palette": "+ Palette",
    "Afficher / masquer le sélecteur": "Show / hide picker",
    "Récupérer la couleur du calque sélectionné dans After Effects": "Get the color of the selected layer in After Effects",
    "Colle un ou plusieurs codes HEX": "Paste one or more HEX codes",
    "Ajouter la couleur à la palette ouverte": "Add the color to the open palette",
    "Prélever une couleur à l'écran": "Pick a color from the screen",
    "Épaisseur": "Width", "+ Ajouter le contour": "+ Add stroke", "Retirer le contour": "Remove stroke",
    "Ajoute un contour aux formes et textes qui n'en ont pas, et règle ceux qui existent": "Adds a stroke to shapes and text that have none, and sets existing ones",
    "Style": "Style", "Arrondi": "Round", "Net": "Sharp", "Coins": "Corners", "Arrondir": "Round",
    "Arrondit les angles des calques de forme (0 = retirer)": "Rounds shape layer corners (0 = remove)",
    "Palettes": "Palettes", "Nouvelle palette": "New palette", "Ma palette": "My palette",
    "Importer (.ase d'Illustrator / Photoshop, .json, .txt)": "Import (.ase from Illustrator / Photoshop, .json, .txt)",
    "Exporter la bibliothèque (.json)": "Export library (.json)", "Rechercher…": "Search…",
    "Ton ordre (glisser pour déplacer)": "Your order (drag to move)", "Récentes": "Recent",
    "Les plus récemment utilisées d'abord": "Most recently used first", "Ordre alphabétique": "Alphabetical",
    "Double-clic pour renommer": "Double-click to rename", "Supprimer la palette": "Delete palette", "Supprimer ?": "Delete?",
    "Garder en haut de la liste": "Keep at the top of the list", "Retirer des favorites": "Remove from favorites",
    "Vide : « + Palette » ajoute la couleur courante, ou colle plusieurs codes HEX dans le champ.": "Empty: “+ Palette” adds the current color, or paste several HEX codes in the field.",
    "Retirer de la palette": "Remove from palette",
    "Les couleurs appliquées apparaîtront ici.": "Applied colors will appear here.",
    "Dans le projet": "In the project", "Compo": "Comp", "Actualiser": "Refresh",
    "Enregistrer ces couleurs comme nouvelle palette": "Save these colors as a new palette",
    "Aucune couleur trouvée.": "No colors found.", "Analyse…": "Scanning…",
    "Clic : appliquer · Alt + clic : charger dans l'éditeur": "Click: apply · Alt + click: load in editor",
    "Code HEX invalide (ex. DDFF12).": "Invalid HEX code (e.g. DDFF12).",
    "Aucune couleur à enregistrer.": "No colors to save.", "Import indisponible hors After Effects.": "Import unavailable outside After Effects.",
    "Aucune couleur trouvée dans ce fichier.": "No colors found in this file.",
    "Couleurs de la compo": "Comp colors", "Couleurs du projet": "Project colors",
    "Sélectionne un calque ou une propriété couleur.": "Select a layer or a color property.",
    "Aucune couleur de remplissage trouvée dans la sélection.": "No fill color found in the selection.",
    "Aucune couleur trouvée dans la sélection.": "No color found in the selection.",
    "Le contour s'ajoute aux calques de forme et de texte.": "Strokes can be added to shape and text layers.",
    "Aucun contour dans la sélection.": "No stroke in the selection.",
    "L'arrondi s'applique aux calques de forme.": "Rounding applies to shape layers.",
    "Arrondi retiré": "Rounding removed", "Aucun contour de forme dans la sélection.": "No shape stroke in the selection.",
    "Sélectionne un calque de forme ou de texte.": "Select a shape or text layer.",

    // Expressions
    "Clignotement": "Blink", "Rotation": "Rotation", "Compteur": "Counter",
    "Fait clignoter la propriété (idéal sur l'Opacité).": "Makes the property blink (great on Opacity).",
    "Rotation continue à vitesse réglable (sur la Rotation).": "Continuous rotation at adjustable speed (on Rotation).",
    "Compteur de chiffres animable, sur le Texte source d'un calque de texte.": "Animatable number counter, on a text layer's Source Text.",
    "Rebond": "Bounce", "Inertie": "Inertia", "Wiggle": "Wiggle", "Boucle": "Loop", "Aller-retour": "Ping-pong",
    "Cumulée": "Offset", "Continuer": "Continue",
    "La valeur rebondit après la dernière clé, comme une balle.": "The value bounces after the last key, like a ball.",
    "Dépassement amorti à l'arrivée, effet ressort.": "Damped overshoot on arrival, spring effect.",
    "Mouvement aléatoire réglable, bouclable.": "Adjustable random motion, loopable.",
    "Rejoue les clés en boucle.": "Loops the keys.", "Rejoue les clés à l'endroit puis à l'envers.": "Plays the keys forward then backward.",
    "Boucle en repartant de la dernière valeur (escalier, rotation continue).": "Loops from the last value (steps, continuous rotation).",
    "Prolonge le mouvement à la vitesse de la dernière clé.": "Continues the motion at the last key's speed.",
    "Mes expressions": "My expressions", "Importer (.json, .txt, .jsx)": "Import (.json, .txt, .jsx)",
    "Exporter ma bibliothèque": "Export my library", "+ Nouvelle expression": "+ New expression",
    "Nom (ex. Rotation infinie)": "Name (e.g. Infinite rotation)", "Colle ton expression ici…": "Paste your expression here…",
    "⧉ Depuis la sélection": "⧉ From selection", "Depuis la sélection": "From selection",
    "Récupère l'expression de la propriété sélectionnée dans After Effects": "Gets the expression of the selected property in After Effects",
    "Enregistrer": "Save", "Mettre à jour": "Update", "Modifier": "Edit", "Retirer les expressions": "Remove expressions",
    "Enregistre tes expressions favorites pour les poser en un clic.": "Save your favorite expressions to apply them in one click.",
    "Cliquer pour appliquer": "Click to apply", "Clique encore pour supprimer": "Click again to delete",
    "Sélectionne une ou plusieurs propriétés (Position, Échelle, Rotation…), puis clique.": "Select one or more properties (Position, Scale, Rotation…), then click.",
    "Les réglages apparaissent dans les effets du calque (ex. « Inertie · Amplitude »).": "Settings appear in the layer's effects (e.g. “Inertie · Amplitude”).",
    "Expression récupérée.": "Expression retrieved.", "Colle ou récupère une expression d'abord.": "Paste or retrieve an expression first.",
    "Ta bibliothèque est vide.": "Your library is empty.", "Rien de nouveau à importer.": "Nothing new to import.",
    "Sélectionne une propriété (Position, Échelle…) dans la timeline.": "Select a property (Position, Scale…) in the timeline.",
    "Sélectionne une propriété qui contient déjà une expression.": "Select a property that already has an expression.",
    "Sélectionne les propriétés à nettoyer.": "Select the properties to clean.",
    "Expression posée mais en erreur": "Expression applied but it has an error", "Preset inconnu.": "Unknown preset.",

    // Calques
    "Null de contrôle": "Control null", "Créer": "Create", "Un pour tous": "One for all", "Un par calque": "One per layer",
    "Parenter les calques au null": "Parent layers to the null", "Créer le null": "Create null",
    "Découper": "Split", "Par": "By", "Lettres": "Letters", "Mots": "Words", "Lignes": "Lines", "Texte": "Text",
    "En formes": "As shapes", "Éditable": "Editable", "Garder l'original (masqué)": "Keep the original (hidden)",
    "Découper la sélection": "Split selection", "Découpage en cours…": "Splitting…",
    ": converti en formes puis découpé, en un clic.": ": converted to shapes then split, in one click.",
    ": chaque morceau reste un texte modifiable (texte de point uniquement).": ": each piece stays editable text (point text only).",
    "Calque de forme : découpé par lettre (un groupe = un calque), mot ou ligne.": "Shape layer: split by letter (one group = one layer), word or line.",
    "Chaque morceau garde sa place, avec son ancrage centré.": "Each piece stays in place, with its anchor centered.",
    "Rien à découper.": "Nothing to split.",
    "Les calques avaient des parents différents : ils sont maintenant tous rattachés au null": "Layers had different parents: they are now all parented to the null",

    // Export
    "Exporter": "Export", "Quoi": "What", "Compo entière": "Whole comp", "Zone de travail": "Work area",
    "Nom du fichier": "File name", "Destination": "Destination", "À côté du projet": "Next to project",
    "Dossier fixe": "Fixed folder", "Demander": "Ask", "Choisir…": "Choose…", "Aucun dossier choisi": "No folder chosen",
    "Ouvrir le dossier d'export": "Open export folder",
    "Chemin relatif au fichier .aep (../ pour remonter)": "Path relative to the .aep file (../ to go up)",
    "Compression": "Compression", "Format": "Format", "Qualité": "Quality", "Basse": "Low", "Moyenne": "Medium", "Haute": "High",
    "Largeur": "Width", "px · 0 = d'origine": "px · 0 = original", "Supprimer le rendu intermédiaire": "Delete intermediate render",
    "Rendu avancé": "Advanced render", "Mode": "Mode", "Rendre ici": "Render here", "Module de sortie": "Output module",
    "Paramètres de rendu": "Render settings", "Recharger les listes": "Reload lists", "Par défaut d'After Effects": "After Effects default",
    "Compresser des fichiers existants…": "Compress existing files…", "Rendu en cours dans After Effects…": "Rendering in After Effects…",
    "Localiser ffmpeg": "Locate ffmpeg", "changer": "change",
    "Compression indisponible hors After Effects.": "Compression unavailable outside After Effects.",
    "ffmpeg est nécessaire pour compresser des fichiers.": "ffmpeg is required to compress files.",
    "Jetons : [comp] [projet] [date] [heure] [taille] [fps]": "Tokens: [comp] [project] [date] [time] [size] [fps]",
    "+ Compo": "+ Comp", "+ Projet": "+ Project", "+ Date": "+ Date", "+ Heure": "+ Time", "+ Taille": "+ Size", "+ Fps": "+ Fps",
    "La file de rendu est déjà en cours.": "The render queue is already running.",
    "Le rendu n'a produit aucun fichier.": "The render produced no file.",
    "Enregistre le projet avant d'envoyer à Media Encoder.": "Save the project before sending to Media Encoder.",
    "Enregistre le projet d'abord (le dossier d'export est relatif au .aep).": "Save the project first (the export folder is relative to the .aep).",
    "Sélectionne une ou plusieurs compos dans le panneau Projet.": "Select one or more comps in the Project panel.",
    "Dossier introuvable (rien n'a encore été exporté ?).": "Folder not found (nothing exported yet?).",
    "Export annulé.": "Export canceled.", "Annulé.": "Canceled.", "Import annulé.": "Import canceled.",

    // Sélecteur
    "Valeur ": "Value"
  };

  /* Messages construits (nombres, noms) */
  var RULES = [
    [/« ([^»]+) » : clés impossibles à lire \(formes identiques ou nombre de points différent\)/g, "“$1”: keys can't be read (identical shapes or different point counts)"],
    [/« ([^»]+) » n'accepte pas les courbes/g, "“$1” doesn't accept curves"],
    [/^1 poste par licence · vérifiée en ligne tous les (\d+) jours · fonctionne (\d+) jours hors ligne$/, "1 seat per license · checked online every $1 days · works $2 days offline"],
    [/^(\d+) postes par licence · vérifiée en ligne tous les (\d+) jours · fonctionne (\d+) jours hors ligne$/, "$1 seats per license · checked online every $2 days · works $3 days offline"],
    [/^·? ?par Sürpriz · v(.+)$/, "· by Sürpriz · v$1"],
    [/^Autres palettes \((\d+)\)$/, "Other palettes ($1)"], [/^Masquer \((\d+)\)$/, "Hide ($1)"],
    [/^Guide « (.+) » (ajouté|retiré).*$/, function (m, a, b) { return "“" + tr(a) + "” guide " + (b === "ajouté" ? "added (guide layer, not rendered)" : "removed"); }],
    [/^Attention : ce guide est prévu pour du 9:16\.$/, "Note: this guide is designed for 9:16."],
    [/^([\d.]+) s \((\d+) im\)$/, "$1 s ($2 fr)"],
    [/^Ancrage commun placé sur (\d+) calques?$/, "Shared anchor set on $1 layer(s)"],
    [/^Valeurs inversées sur (\d+) propriétés? .*$/, "Values reversed on $1 property(ies) (timing and curves kept)"],
    [/^(\d+) clés? recalées? sur l'image$/, "$1 key(s) snapped to frames"],
    [/^Les décalages suivent la courbe de l'onglet Courbes \((.+)\)\.$/, "Offsets follow the curve from the Curves tab ($1)."],
    [/^#([0-9A-F]{6}) → #([0-9A-F]{6}) : (\d+) remplacements?$/, "#$1 → #$2: $3 replacement(s)"],
    [/^#([0-9A-F]{6}) introuvable dans (la compo active|le projet)\.$/, function (m, a, b) { return "#" + a + " not found in " + (b === "le projet" ? "the project." : "the active comp."); }],
    [/^Palette exportée : (.+)$/, "Palette exported: $1"],
    [/^Impossible d'écrire le fichier : (.+)$/, "Can't write the file: $1"],
    [/^(\d+) calques créés, enchaînés toutes les (\d+) im\.$/, "$1 layers created, chained every $2 fr."],
    [/^Profil « (.+) » (chargé|enregistré|supprimé)\.$/, function (m, a, b) { return "Profile “" + tr(a) + "” " + ({ "chargé": "loaded", "enregistré": "saved", "supprimé": "deleted" })[b] + "."; }],
    [/^(.+) \(modifié\)$/, function (m, a) { return tr(a) + " (modified)"; }],
    [/^Ton anim est finie en 16:9 .*$/, "Finished your animation in 16:9 and need 4:5 and 9:16 versions? Open it, pick the formats above (Ctrl/Cmd + click), then click here. One comp is created per format, with your animation inside, reframed. Edit the original and every version follows."],
    [/^(.+?)  \(([-\d., ]+)\)$/, function (m, n, v) { return tr(n) + "  (" + v + ")"; }],
    [/^(\d+) calques? mis à jour$/, "$1 layer(s) updated"],
    [/^(.+) ignoré \(caméra\/lumière\)$/, "$1 skipped (camera/light)"],
    [/^(.+) ignoré \(verrouillé\)$/, "$1 skipped (locked)"],
    [/^(.+) : échelle\/rotation animée, compensation exacte seulement à l'instant courant$/, "$1: animated scale/rotation, exact compensation only at the current time"],
    [/^Courbe appliquée sur (\d+) segments?$/, "Curve applied to $1 segment(s)"],
    [/^Compo active · (zone de travail|compo entière)\s+→\s+(.*)$/, function (m, a, b) { return "Active comp · " + (a === "zone de travail" ? "work area" : "whole comp") + "  →  " + tr(b); }],
    [/^Sélection Projet · (zone de travail|compo entière)\s+→\s+(.*)$/, function (m, a, b) { return "Project selection · " + (a === "zone de travail" ? "work area" : "whole comp") + "  →  " + tr(b); }],
    [/^MP4 (.+)$/, function (m, q) { return "MP4 " + q.split(" + ").map(function (x) { return ({ basse: "low", moyenne: "medium", haute: "high" })[x] || x; }).join(" + "); }],
    [/^module de sortie par défaut$/, "default output module"],
    [/^Créer (\d+) compos$/, "Create $1 comps"],
    [/^(\d+) formats · (\d+) i\/s · ([\d.]+) s(?: \((\d+) im\))?$/, function (m, n, f, d, fr) { return n + " formats · " + f + " fps · " + d + " s" + (fr ? " (" + fr + " fr)" : ""); }],
    [/^(.+) · (\d+)×(\d+) · (\d+) i\/s · ([\d.]+) s(?: \((\d+) im\))?$/, function (m, n, w, h, f, d, fr) { return tr(n) + " · " + w + "×" + h + " · " + f + " fps · " + d + " s" + (fr ? " (" + fr + " fr)" : ""); }],
    [/^Aperçu : (.*)$/, function (m, a) { return "Preview: " + a.replace(/Forme/g, "Shape").replace(/Calque/g, "Layer").replace(/Titre/g, "Title"); }], [/^Ex\. : (.*)$/, "e.g.: $1"],
    [/^En mémoire : (.*)$/, function (m, a) { return "Stored: " + a.replace(/(\d+) clés? copiées?/, "$1 key(s) copied").replace(" · courbe dispo dans Courbes", " · curve available in Curves"); }],
    [/^(\d+) clés? copiées? \((.+)\)$/, "$1 key(s) copied ($2)"],
    [/^Valeur collée sur (\d+) clés?$/, "Value pasted on $1 key(s)"],
    [/^(\d+) clé\(s\) incompatible\(s\)$/, "$1 incompatible key(s)"],
    [/^Valeur incompatible \(copiée depuis « (.+) »\)\.$/, "Incompatible value (copied from “$1”)."],
    [/^(\d+) propriétés? inversées?$/, "$1 property(ies) reversed"],
    [/^Aller-retour ajouté sur (\d+) propriétés?$/, "Ping-pong added on $1 property(ies)"],
    [/^(\d+) calques? en escalier \((\d+) im\.\)$/, "$1 layer(s) staggered ($2 fr.)"],
    [/^Clés décalées en escalier \((\d+) im\.\)$/, "Keys staggered ($1 fr.)"],
    [/^Timing à (\d+) %$/, "Timing at $1%"],
    [/^(\d+) propriétés? alignées?$/, "$1 property(ies) aligned"],
    [/^#([0-9A-F]{6}) appliqué \((\d+) cibles?\)$/, "#$1 applied ($2 target(s))"],
    [/^Contour #([0-9A-F]{6}) · ([\d.]+) px \((\d+)\)$/, "Stroke #$1 · $2 px ($3)"],
    [/^Ignoré \(ni forme ni texte\) : (.*)$/, "Skipped (not shape or text): $1"],
    [/^(\d+) contours? retirés?$/, "$1 stroke(s) removed"],
    [/^Coins arrondis à ([\d.]+) px$/, "Corners rounded to $1 px"],
    [/^Style appliqué à (\d+) contours?$/, "Style applied to $1 stroke(s)"],
    [/^Couleur récupérée : #(.+)$/, "Color picked: #$1"],
    [/^#([0-9A-F]{6}) ajouté à « (.+) »\.$/, "#$1 added to “$2”."],
    [/^#([0-9A-F]{6}) est déjà dans « (.+) »\.$/, "#$1 is already in “$2”."],
    [/^(\d+) couleurs ajoutées à « (.+) »\.$/, "$1 colors added to “$2”."],
    [/^Palette « (.+) » supprimée\.$/, "Palette “$1” deleted."],
    [/^Palette créée avec (\d+) couleurs : renomme-la\.$/, "Palette created with $1 colors: rename it."],
    [/^(\d+) palettes? importées?\.$/, "$1 palette(s) imported."],
    [/^Fichier illisible : (.*)$/, "Unreadable file: $1"],
    [/^Aucune palette ne correspond à « (.*) »\.$/, "No palette matches “$1”."],
    [/^Ajouter à « (.+) »$/, "Add to “$1”"], [/^Ouvrir « (.+) »$/, "Open “$1”"],
    [/^(.+) appliqué sur (\d+) propriétés?$/, function (m, a, n) { return tr(a.replace(/^« |» $/g, "")) + " applied to " + n + " property(ies)"; }],
    [/^« (.+) » appliqué sur (\d+) propriétés?$/, "“$1” applied to $2 property(ies)"],
    [/^« (.+) » : il faut au moins 2 images clés pour cet effet$/, "“$1”: this effect needs at least 2 keyframes"],
    [/^(\d+) expressions? retirées?$/, "$1 expression(s) removed"],
    [/^« (.+) » enregistrée\.$/, "“$1” saved."], [/^Preset « (.+) » enregistré\.$/, "Preset “$1” saved."],
    [/^(\d+) expressions? importées?$/, "$1 expression(s) imported"],
    [/^(\d+) nulls? créés?$/, "$1 null(s) created"],
    [/^(.+) verrouillé : non parenté$/, "$1 locked: not parented"],
    [/^(\d+) calques créés$/, "$1 layers created"],
    [/^(.+) : verrouillé, ignoré$/, "$1: locked, skipped"],
    [/^(.+) : ni forme ni texte, ignoré$/, "$1: not shape or text, skipped"],
    [/^(.+) : moins de 2 groupes, rien à découper$/, "$1: fewer than 2 groups, nothing to split"],
    [/^(.+) : un seul (mot|ligne), rien à découper$/, function (m, a, b) { return a + ": only one " + (b === "mot" ? "word" : "line") + ", nothing to split"; }],
    [/^(.+) : texte animé, ignoré$/, "$1: animated text, skipped"],
    [/^(.+) : texte de paragraphe\. .*$/, "$1: paragraph text. Right-click › Convert to point text, then try again"],
    [/^(.+) : conversion en formes impossible, découpage en texte éditable$/, "$1: couldn't convert to shapes, split as editable text"],
    [/^(\d+) compos? créées?(?: : (.+) \((\d+)×(\d+)\))?$/, function (m, n, nm, w, h) { return n + " comp(s) created" + (nm ? ": " + nm + " (" + w + "×" + h + ")" : ""); }],
    [/^« (.+) » déclinée en (\d+) formats?$/, "“$1” adapted to $2 format(s)"],
    [/^(\d+) compos? dupliquées?(?: · (\d+) précompos? laissées? partagées?)?$/, function (m, n, k) { return n + " comp(s) duplicated" + (k ? " · " + k + " precomp(s) kept shared" : ""); }],
    [/^(\d+) expressions? mises? à jour$/, "$1 expression(s) updated"],
    [/^Format « (.+) » ajouté\.$/, "Format “$1” added."],
    [/^(\d+) (calque|élément)s? renommés?$/, function (m, n, k) { return n + " " + (k === "calque" ? "layer" : "item") + "(s) renamed"; }],
    [/^(\d+) éléments rangés$/, "$1 items organized"],
    [/^(\d+) métrages? inutilisés? supprimés?, (\d+) dossiers? vides?$/, "$1 unused footage item(s) removed, $2 empty folder(s)"],
    [/^(\d+) doublons? fusionnés?$/, "$1 duplicate(s) merged"],
    [/^(\d+) fichiers? (rendus|rendu)$/, "$1 file(s) rendered"],
    [/^(\d+) compos? (envoyées|envoyée) à Media Encoder$/, "$1 comp(s) sent to Media Encoder"],
    [/^Compression (\d+)\/(\d+) · (.+)$/, "Compressing $1/$2 · $3"],
    [/^(\d+) fichiers? prêts? : (.+)$/, "$1 file(s) ready: $2"],
    [/^Compression : (\d+) échec\(s\)$/, "Compression: $1 failure(s)"],
    [/^ffmpeg introuvable : la compression est désactivée\.$/, "ffmpeg not found: compression is disabled."],
    [/^Exporté : (.+)$/, "Exported: $1"],
    [/^« (.+) » épinglé dans l'accès rapide\.$/, "“$1” pinned to quick access."],
    [/^« (.+) » retiré de l'accès rapide\.$/, "“$1” removed from quick access."],
    [/^« (.+) » est déjà dans l'accès rapide\.$/, "“$1” is already in quick access."],
    [/^Paramètres de rendu « (.+) » introuvables$/, "Render settings “$1” not found"],
    [/^Module de sortie « (.+) » introuvable$/, "Output module “$1” not found"],
    [/^Cette clé est déjà activée sur un autre poste\. Contacte-nous pour le libérer\.$/, "This key is already activated on another computer. Contact us to free it."],
    [/^Cette clé est déjà activée sur (\d+) postes\. .*$/, "This key is already activated on $1 computers. Contact us to free one."],
    [/^Impossible de créer le dossier (.+)$/, "Can't create folder $1"]
  ];

  var FRAG = [
    ["ffmpeg introuvable : la compression est désactivée.", "ffmpeg not found: compression is disabled."],
    ["ffmpeg :", "ffmpeg:"]
  ];

  function tr(s) {
    if (lang === "fr" || !s) return s;
    if (s.indexOf("\n") >= 0) return s.split("\n").map(tr).join("\n");
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core) return s;
    if (EXACT.hasOwnProperty(core)) return m[1] + EXACT[core] + m[3];
    var flat = core.replace(/\s+/g, " ");
    if (EXACT.hasOwnProperty(flat)) return m[1] + EXACT[flat] + m[3];
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(core)) return m[1] + core.replace(RULES[i][0], RULES[i][1]) + m[3];
    }
    for (var j = 0; j < FRAG.length; j++) if (core.indexOf(FRAG[j][0]) >= 0) core = core.split(FRAG[j][0]).join(FRAG[j][1]);
    return m[1] + core + m[3];
  }

  /* Traduction du DOM : textes, info-bulles, champs vides. Les noms saisis par l'utilisateur sont ignorés. */
  var SKIP = ".pl-name, .pl-name-edit, .ex-row b, .ex-row small, code, textarea, .q-btn span";
  function skip(n) { var e = n.nodeType === 1 ? n : n.parentElement; return !e || (e.closest && e.closest(SKIP)); }
  var busy = false;
  function doNode(n) {
    if (n.nodeType === 3) {
      if (skip(n)) return;
      var t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t;
      return;
    }
    if (n.nodeType !== 1 || n.tagName === "SCRIPT" || n.tagName === "STYLE") return;
    ["title", "placeholder"].forEach(function (a) {
      if (n.hasAttribute && n.hasAttribute(a)) { var v = n.getAttribute(a), t2 = tr(v); if (t2 !== v) n.setAttribute(a, t2); }
    });
    if (skip(n)) return;
    for (var c = n.firstChild; c; c = c.nextSibling) doNode(c);
  }
  function start() {
    if (lang === "fr") return;
    document.documentElement.lang = "en";
    doNode(document.body);
    new MutationObserver(function (list) {
      if (busy) return;
      busy = true;
      list.forEach(function (r) {
        if (r.type === "characterData") doNode(r.target);
        else if (r.type === "attributes") doNode(r.target);
        else r.addedNodes.forEach(doNode);
      });
      busy = false;
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.SZI18N = {
    lang: lang, t: tr,
    setLang: function (l) { try { localStorage.setItem("sz_lang", JSON.stringify(l)); } catch (e) {} }
  };
})();
