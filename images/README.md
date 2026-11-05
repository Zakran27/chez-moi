# Photos du site

Chaque photo existe en deux versions :

- `nom.jpg` : l'original (grand format, visionneuse et hero sur grand écran) ;
- `nom-640.webp` : la miniature (galerie, mobile), à régénérer quand l'original change.

Pour ajouter ou remplacer une photo :

1. Déposer le JPG ici (2000 px max sur le grand côté, qualité 80, moins de 400 Ko).
2. Générer la miniature (Pillow) :

   ```bash
   python -c "from PIL import Image; im=Image.open('images/NOM.jpg').convert('RGB'); im.resize((640, round(im.height*640/im.width))).save('images/NOM-640.webp', quality=65, method=6)"
   ```

3. Ajouter le bouton dans la galerie de `index.html` (copier un bloc existant : `data-full` = le JPG,
   `src` = la miniature, `width` / `height` = taille de la miniature, `alt` en français).

`og.jpg` (1200 x 630) est l'image d'aperçu quand le lien est partagé (WhatsApp, SMS).
Vérifier qu'aucune photo ne contient de position GPS avant de la publier.
