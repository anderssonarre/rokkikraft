# Modellstandard för bilar (GLB / glTF 2.0)

**Snabbast:** Garage → *3D-modell (GLB)* → välj en .glb-fil. Spelet passar in modellen automatiskt (längsta axeln längs bilen,
skala efter bilens riktiga längd, på marken, centrerad), hittar hjulen på namn (wheel/tire/tyre/rim/hjul …) och lacken
(material som heter paint/body/lack/carpaint, annars det största färgade materialet). Vrid 90° / vänd fram–bak med knapparna.
Modellen sparas i webbläsaren (IndexedDB) och används både i garaget och på banan. Vill du att modellen ska följa med spelet
för alla: lägg filen här och skriv in den i manifestet enligt nedan.

1. **Format**: en `.glb` per bil i `assets/models/`. Helst under 3 MB och under ~60 000 trianglar (6 bilar per heat).
2. **Licens**: bara modeller som får användas i projektet (egna, CC0, CC-BY med namngivning). Skriv licens och upphovsperson i manifestet.
3. **Enheter och riktning**: meter, +X framåt, +Y uppåt, bilens mitt i origo, marken vid y = 0. Annars justera med `scale`, `rotY` och `offset` i manifestet.
4. **Namn på noder**:
   - `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`: hjulen, med pivot i navets mitt. Spelet snurrar dem runt Z och styr framhjulen runt Y.
   - Allt annat är kaross. Dörrar, huv, lampor och interiör får gärna vara egna noder (`door_fl`, `hood`, `light_front` …) för framtida skadesystem.
5. **Material** (PBR metallic/roughness; texturer i sRGB för färg, linjära för normal/roughness/metalness/AO):
   - material vars namn innehåller `paint`, `lack` eller `body` byts mot spelarens lackfärg (klarlack),
   - glas: låg roughness, gärna `alphaMode: BLEND`,
   - övrigt (plast, gummi, krom, lampor med emissive) används som det är.
6. **Manifest** (`assets/models/manifest.json`), nyckel = spelets bil-id (se `CARS` i `js/data.js`):

```json
{
  "cars": {
    "passat_rx": { "file": "vw_passat_b5.glb", "scale": 1, "rotY": 0, "offset": [0, 0, 0],
                   "license": "CC-BY 4.0", "author": "Namn", "source": "länk" }
  }
}
```

Saknas manifestet eller en post används den inbyggda bilen. Fysiken använder alltid spelets egna mått – modellen är bara utseende.
