// js/map.js

import { GAME_WIDTH_LOGICAL, GAME_HEIGHT_LOGICAL, CHUNK_LOAD_BUFFER_TILES, RENDER_PADDING_TILES, tileSizeX, tileSizeY } from './constants.js';
import { cameraX, cameraY } from './camera.js';
import { loadImage } from './utils.js'; //

export let mapData;
export const loadedChunkImages = {};
export let collisionPolygons = []; // Array para almacenar los polígonos de colisión del mapa
export let mapTeleporters = {}; // ¡NUEVA LÍNEA! Objeto para almacenar los teletransportadores por su ID
export let mapInteractions = {}; 
// ¡NUEVAS VARIABLES PARA LA ANIMACIÓN DEL TELETRANSPORTADOR!
export let teleporterSpriteSheet; // Almacenará la imagen del sprite sheet
export const TELEPORTER_NUM_FRAMES = 4; // Número total de frames en tu animación
export const TELEPORTER_ANIMATION_SPEED = 0.2; // Tiempo en segundos por cada frame (ajusta para la velocidad)
export let teleporterFrameWidth; // Ancho de un solo frame
export let teleporterFrameHeight; // Alto de un solo frame



// Estado interno de la animación (no se exportan, se gestionan aquí)
let teleporterCurrentFrame = 0;
let teleporterFrameTimer = 0;

function getTiledProperty(obj, propName) {
    const prop = obj.properties?.find(p => p.name === propName);
    return prop ? prop.value : undefined;
}

export async function loadMap(path) {
    try {
        const response = await fetch(path);
        const json = await response.json();
        mapData = json;
       // console.log("Datos del mapa JSON cargados. Preparando información de tiles...");
        prepareTileData(mapData); 
        //console.log("Información de tiles preparada.");

          // ¡MODIFICADO!: Cargar el sprite sheet de teletransportación
        // Asegúrate de que './img/Teletransportacion.png' sea la ruta correcta a tu archivo.
        teleporterSpriteSheet = await loadImage('./img/Teletransportacion.png');
        // Calcula el ancho y alto de un frame individual del sprite sheet
        teleporterFrameWidth = teleporterSpriteSheet.width / TELEPORTER_NUM_FRAMES;
        teleporterFrameHeight = teleporterSpriteSheet.height;
       
             
         processCollisionObjects(mapData); // <--- ¡ESTA FUNCIÓN YA PROCESA TODO: COLISIONES, TELETRANSPORTADORES E INTERACCIONES!
        console.log("Polígonos de colisión cargados y procesados:", collisionPolygons.length);
        console.log("Interacciones (incluyendo tarjetas) cargadas:", Object.keys(mapInteractions).length); // <-- CAMBIA ESTE LOG ASÍ


        return mapData;
    } catch (err) {
        console.error('Error cargando mapa:', err);
        throw err;
    }
}

function prepareTileData(data) {
    if (!data || !data.tilesets || data.tilesets.length === 0) {
        console.error("prepareTileData: No se pudo cargar el mapa, no tiene tilesets o el array de tilesets está vacío.");
        return;
    }
 data.tileInfo = {};

    for (const tileset of data.tilesets) {
        if (tileset.tiles) {
            tileset.tiles.forEach(tileDef => {
                const globalId = tileset.firstgid + tileDef.id;
                data.tileInfo[globalId] = {
                    // ¡CORREGIDO AQUÍ!: Ajusta la ruta de la imagen del tile
                    // Asume que las imágenes de los tiles están en tu_proyecto/img/Mapa Base wp/
                    // Y que tileDef.image es solo el nombre del archivo (ej. "00.webp")
                    imagePath: `./${tileDef.image}`, 
                    width: tileDef.width,
                    height: tileDef.height
                };
            });
        }
    }
}

export function manageVisibleChunks() {
    if (!mapData || !mapData.layers || mapData.layers.length === 0) return;

    const layer = mapData.layers.find(l => l.type === 'tilelayer');
    if (!layer) return;

    const cols = mapData.width;
    const rows = mapData.height;

    const startCol = Math.max(0, Math.floor(cameraX / tileSizeX) - CHUNK_LOAD_BUFFER_TILES);
    const endCol = Math.min(cols, Math.ceil((cameraX + GAME_WIDTH_LOGICAL) / tileSizeX) + CHUNK_LOAD_BUFFER_TILES);
    const startRow = Math.max(0, Math.floor(cameraY / tileSizeY) - CHUNK_LOAD_BUFFER_TILES);
    const endRow = Math.min(rows, Math.ceil((cameraY + GAME_HEIGHT_LOGICAL) / tileSizeY) + CHUNK_LOAD_BUFFER_TILES);

    const currentlyNeededChunks = new Set();

    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            const tileIndex = layer.data[row * cols + col];
            if (tileIndex === 0 || tileIndex === undefined) continue;

            currentlyNeededChunks.add(tileIndex);

            if (!loadedChunkImages[tileIndex]) {
                const tileInfo = mapData.tileInfo[tileIndex];
                if (tileInfo && tileInfo.imagePath) {
                    const img = new Image();
                    img.src = tileInfo.imagePath;

                    img.onload = () => {
                        loadedChunkImages[tileIndex] = img;
                    };
                    img.onerror = () => {
                        console.error(`Error cargando chunk ${tileIndex}: ${tileInfo.imagePath}`);
                    };
                } else {
                    console.warn(`Información de tile ${tileIndex} no encontrada para carga de chunk.`);
                }
            }
        }
    }

    for (const loadedId in loadedChunkImages) {
        if (!currentlyNeededChunks.has(parseInt(loadedId))) {
            delete loadedChunkImages[loadedId];
        }
    }
}

function drawTile(context, globalTileId, destX, destY) {
    if (globalTileId === 0) return;

    const chunkImage = loadedChunkImages[globalTileId];

    if (chunkImage && chunkImage.complete) {
        context.drawImage(
            chunkImage,
            0, 0,
            tileSizeX, tileSizeY,
            destX, destY,
            tileSizeX, tileSizeY
        );
    } else {
        context.fillStyle = 'black';
        context.fillRect(destX, destY, tileSizeX, tileSizeY);
    }
}

export function drawMap(ctx) {
    if (!mapData) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, GAME_WIDTH_LOGICAL, GAME_HEIGHT_LOGICAL);
        return;
    }
    const layer = mapData.layers.find(l => l.type === 'tilelayer');
    if (!layer) {
        console.warn("drawMap: No se encontró la capa de tiles (tilelayer) en el mapa.");
        return;
    }

    ctx.clearRect(0, 0, GAME_WIDTH_LOGICAL, GAME_HEIGHT_LOGICAL);

    const cols = mapData.width;
    const rows = mapData.height;

    const startColRender = Math.max(0, Math.floor(cameraX / tileSizeX) - RENDER_PADDING_TILES);
    const endColRender = Math.min(cols, Math.ceil((cameraX + GAME_WIDTH_LOGICAL) / tileSizeX) + RENDER_PADDING_TILES);
    const startRowRender = Math.max(0, Math.floor(cameraY / tileSizeY) - RENDER_PADDING_TILES);
    const endRowRender = Math.min(rows, Math.ceil((cameraY + GAME_HEIGHT_LOGICAL) / tileSizeY) + RENDER_PADDING_TILES);

    for (let row = startRowRender; row < endRowRender; row++) {
        for (let col = startColRender; col < endColRender; col++) {
            const tileIndex = layer.data[row * cols + col];
            if (tileIndex === 0 || tileIndex === undefined) continue;

            const x = col * tileSizeX - cameraX;
            const y = row * tileSizeY - cameraY;

            drawTile(ctx, tileIndex, x, y);
        }
    }
    // ¡NUEVA SECCIÓN!: Dibujar los iconos animados de los teletransportadores
    // Solo dibuja si el sprite sheet se ha cargado correctamente
    if (teleporterSpriteSheet && teleporterSpriteSheet.complete) {
        for (const teleporterId in mapTeleporters) {
            const teleporter = mapTeleporters[teleporterId];

            // --- CÁLCULO PARA PRESERVAR EL ASPECTO DEL FOTOGRAMA ---
            // 1. Obtenemos la relación de aspecto del fotograma original (ancho / alto del fotograma)
            const aspectRatio = teleporterFrameWidth / teleporterFrameHeight;

            // 2. Definimos la altura deseada del icono dibujado.
            // Usaremos la altura del objeto de Tiled como referencia para el tamaño,
            // pero si la altura del frame original es muy pequeña, podríamos querer un mínimo.
           
           const targetDrawHeight = Math.max(teleporter.height, 100); // Ejemplo: Al menos 64px de alto

            // 3. Calculamos el ancho del icono dibujado, manteniendo el 'aspectRatio'
            const drawIconWidth = targetDrawHeight * aspectRatio;
            const drawIconHeight = targetDrawHeight; // La altura es la que definimos como objetivo

            // --- CÁLCULO PARA CENTRAR EL ICONO DENTRO DEL OBJETO DE TILED ---
            // Calculamos la posición X para que el icono animado esté centrado horizontalmente
            // sobre el objeto de teletransportador en Tiled.
            const drawX = (teleporter.x + teleporter.width / 2) - (drawIconWidth / 2) - cameraX;

            // Calculamos la posición Y para que la BASE del icono animado
            // se alinee con la BASE del objeto de teletransportador en Tiled.
            const drawY = (teleporter.y + teleporter.height - drawIconHeight) - cameraY;

            ctx.drawImage(
                teleporterSpriteSheet,                          // La imagen completa del sprite sheet
                teleporterCurrentFrame * teleporterFrameWidth,  // Fuente X: El inicio X del fotograma actual en el sprite sheet
                0,                                              // Fuente Y: Siempre 0 porque tus fotogramas están en la primera (y única) fila
                teleporterFrameWidth,                           // Fuente Ancho: El ancho del fotograma que queremos "recortar" del sprite sheet
                teleporterFrameHeight,                          // Fuente Alto: El alto del fotograma que queremos "recortar" del sprite sheet
                drawX,                                          // Destino X: La posición X en el canvas donde se dibujará el icono
                drawY,                                          // Destino Y: La posición Y en el canvas donde se dibujará el icono
                drawIconWidth,                                  // Destino Ancho: El ancho FINAL con el que se dibujará el icono en el canvas (¡mantiene el aspecto!)
                drawIconHeight                                  // Destino Alto: La altura FINAL con la que se dibujará el icono en el canvas (¡mantiene el aspecto!)
            );
        }
    } else {
        // console.warn("No se pudo dibujar el icono del teletransportador: sprite sheet no cargado o no completo.");
    }


     // ¡NUEVA SECCIÓN!: Dibujar las imágenes o cajas temporales de los puntos de interacción
    for (const interactionId in mapInteractions) {
        const interaction = mapInteractions[interactionId];
        
        // Calcula la posición en pantalla del objeto de interacción (ajustada por la cámara)
       const drawX = interaction.x - cameraX;
        const drawY = interaction.y - cameraY;
        const drawWidth = interaction.width;
        const drawHeight = interaction.height;

        // Solo dibuja si el punto no se ha activado si es 'once'
        if (!interaction.once || !interaction.hasBeenTriggered) {
            // Si tiene una ruta de imagen válida y la imagen está completa, dibújala
            // console.log(`[MAP - Draw] Interaction ${interaction.id}: imagePath='${interaction.imagePath}', shouldDrawImage: ${!!interaction.imagePath}, hasBeenTriggered: ${interaction.hasBeenTriggered}`); // <-- AÑADE ESTA LÍNEA

           if (interaction.imagePath && interaction.actionType !== 'collectItem') { // <--- ¡¡¡LÍNEA MODIFICADA!!!
            let interactionImage = loadedChunkImages[interaction.imagePath];
            if (!interactionImage) {
                interactionImage = new Image();
                interactionImage.src = interaction.imagePath;
                loadedChunkImages[interaction.imagePath] = interactionImage;
                if (!interactionImage.complete) continue; 
            }
                // Ajusta la Y para la esquina inferior, asumiendo que el objeto de Tiled es el área base
                const adjustedDrawY = (interaction.y + interaction.height - interactionImage.height) - cameraY; 

                ctx.drawImage(
                    interactionImage,
                    drawX,
                    adjustedDrawY,
                    interactionImage.width,
                    interactionImage.height
                );

                // 2. Draw the TEXT (ID) on top of the image
                    ctx.save(); // Save the current canvas state

                    // --- MODIFICATIONS FOR TEXT COLOR AND FONT ---
                    ctx.fillStyle = 'red'; // <--- ADJUST THIS: Example color (Gold). Use any CSS color (e.g., 'red', '#00FF00', 'rgba(255,255,255,0.8)')
                    ctx.font = 'bold 20px "Press Start 2P", Arial'; // <--- ADJUST THIS: Example font.
                                                                 // Format: 'style size family' (e.g., 'italic 24px Verdana')
                                                                 // For custom fonts, make sure they are loaded via CSS @font-face.
                                                                 // If not loaded, it will fall back to Arial.
                    
                    ctx.textAlign = 'center'; // Center the text horizontally on its calculated X position
                    ctx.textBaseline = 'middle'; // Center the text vertically on its calculated Y position

                    // Calculate text position to be centered on the image
                   const textX = drawX + interactionImage.width / 2; // Horizontal center of the drawn image
                   const textY = adjustedDrawY + interactionImage.height / 2; // Vertical center of the drawn image

                    ctx.fillText(interaction.id, textX, textY); // Dibuja el texto (ej., "Reaper", "01")

                     ctx.restore();// Restore the previous canvas state
            } else {
              /*   // ¡DIBUJA LA CAJA AMARILLA PROVISIONAL!
                // Usa un color y un grosor muy visibles
               // console.log(`[MAP - Draw] Drawing YELLOW BOX for ${interaction.id}`); // <-- AÑADE ESTA LÍNEA para confirmar que entra al else
                ctx.strokeStyle = 'yellow'; // Color del borde
                ctx.lineWidth = 4; // ¡Borde más grueso!
                ctx.strokeRect(drawX, drawY, drawWidth, drawHeight); // Dibuja el borde

                // Relleno semitransparente para que sea más visible
                ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Amarillo semitransparente
                ctx.fillRect(drawX, drawY, drawWidth, drawHeight); // Dibuja el relleno

                // Opcional: Dibuja el ID del objeto dentro de la caja para depuración
                ctx.fillStyle = 'black'; // Color del texto
                ctx.font = 'bold 16px Arial'; // Fuente del texto (más grande y negrita)
                ctx.textAlign = 'center'; // Alineación del texto
                ctx.textBaseline = 'middle'; // Línea base del texto
                ctx.fillText(interaction.id, drawX + drawWidth / 2, drawY + drawHeight / 2); // Dibuja el ID
                ctx.restore(); // <--- ¡AÑADE ESTO! Restaura el estado del contexto de dibujo*/
            }
        }
    }
}




export function getMapDimensions() {
    if (mapData) {
        return {
            widthPixels: mapData.width * tileSizeX,
            heightPixels: mapData.height * tileSizeY
        };
    }
    return { widthPixels: 0, heightPixels: 0 };
}

function processCollisionObjects(data) {
    collisionPolygons = []; // Limpiar por si se carga un nuevo mapa
    mapTeleporters = {};    // Limpiar también los teletransportadores
    mapInteractions = {};   // ¡IMPORTANTE! Limpiar también los puntos de interacción

    for (const layer of data.layers) {
        // Asegurarse de que solo procesamos capas de objetos
        if (layer.type === 'objectgroup') { 
            // Lógica para la capa de Colisiones
            if (layer.name === 'Colisiones') { 
                for (const obj of layer.objects) {
                    if (obj.polygon) {
                        const polyPoints = obj.polygon.map(p => ({
                            x: obj.x + p.x,
                            y: obj.y + p.y
                        }));
                        collisionPolygons.push(polyPoints);
                    } else if (obj.width && obj.height && !obj.ellipse) { // Rectángulos
                        const x1 = obj.x;
                        const y1 = obj.y;
                        const x2 = obj.x + obj.width;
                        const y2 = obj.y + obj.height;
                        collisionPolygons.push([
                            { x: x1, y: y1 },
                            { x: x2, y: y1 },
                            { x: x2, y: y2 },
                            { x: x1, y: y2 }
                        ]);
                    }
                }
            }
            // Lógica para la capa de Teleporters
            else if (layer.name === 'Teleporters') {
                for (const obj of layer.objects) {
                    const teleporterId = getTiledProperty(obj, 'id');
                    const targetTeleporterId = getTiledProperty(obj, 'targetId');

                    if (teleporterId && targetTeleporterId) {
                        const x = obj.x;
                        const y = obj.y;
                        const width = obj.width;
                        const height = obj.height;

                        mapTeleporters[teleporterId] = {
                            id: teleporterId,
                            targetId: targetTeleporterId,
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                            polygon: [
                                { x: x, y: y },
                                { x: x + width, y: y },
                                { x: x + width, y: y + height },
                                { x: x, y: y + height }
                            ]
                        };
                    } else {
                        console.warn(`Objeto teletransportador ${obj.name || obj.id} en la capa 'Teleporters' no tiene las propiedades 'id' o 'targetId' esperadas.`);
                    }
                }
            }
            // Lógica para la capa de Interacciones (¡Asegúrate que el nombre 'PuntosDeTexto' sea EXACTO!)
            else if (layer.name === 'PuntosDeTexto') {
                for (const obj of layer.objects) {
                    const interactionId = getTiledProperty(obj, 'id');
                    const interactionText = getTiledProperty(obj, 'text');
                    const interactionOnce = getTiledProperty(obj, 'once') || false;
                    const interactionImagePath = getTiledProperty(obj, 'imagePath'); 

                    if (interactionId && interactionText !== undefined) {
                        const x = obj.x;
                        const y = obj.y;
                        const width = obj.width;
                        const height = obj.height;

                        mapInteractions[interactionId] = {
                            id: interactionId,
                            text: interactionText,
                            once: interactionOnce,
                            hasBeenTriggered: false,
                            imagePath: interactionImagePath,
                            actionType: 'dialogue', // <-- ¡NUEVA PROPIEDAD!: Solo muestra un diálogo
                            x: x,       // <--- ¡AÑADE ESTAS LÍNEAS!
                            y: y,       // <--- ¡AÑADE ESTAS LÍNEAS!
                            width: width, // <--- ¡AÑADE ESTAS LÍNEAS!
                            height: height, // <--- ¡AÑADE ESTAS LÍNEAS!
                            polygon: [ 
                                { x: x, y: y }, { x: x + width, y: y },
                                { x: x + width, y: y + height }, { x: x, y: y + height }
                            ]
                        };
                    } else {
                        console.warn(`Objeto de interacción ${obj.name || obj.id} en la capa 'PuntosDeTexto' no tiene 'id' o 'text' definidos.`);
                    }
                }
            }
            // --- ¡NUEVA LÓGICA AQUÍ PARA LA CAPA 'Tarjetas'! ---
            else if (layer.name === 'Tarjetas') { // <-- ¡NOMBRE DE TU CAPA!
                for (const obj of layer.objects) {
                    const interactionId = getTiledProperty(obj, 'id');
                    const interactionText = getTiledProperty(obj, 'text');
                    const interactionOnce = getTiledProperty(obj, 'once') || false;
                    const interactionImagePath = getTiledProperty(obj, 'imagePath');
                    const itemToAdd = getTiledProperty(obj, 'itemToAdd'); // <-- ¡NUEVA PROPIEDAD!: Qué item añadir

                    if (interactionId && interactionText !== undefined && itemToAdd) { // Asegurarse de que tenga un item
                        const x = obj.x;
                        const y = obj.y;
                        const width = obj.width;
                        const height = obj.height;

                        mapInteractions[interactionId] = {
                            id: interactionId,
                            text: interactionText,
                            once: interactionOnce,
                            hasBeenTriggered: false,
                            imagePath: interactionImagePath,
                            actionType: 'collectItem', // <-- ¡NUEVA PROPIEDAD!: Muestra diálogo y luego añade item
                            itemToAdd: itemToAdd, // Guarda el nombre del item
                            x: x,       // <--- ¡AÑADE ESTAS LÍNEAS!
                            y: y,       // <--- ¡AÑADE ESTAS LÍNEAS!
                            width: width, // <--- ¡AÑADE ESTAS LÍNEAS!
                            height: height, // <--- ¡AÑADE ESTAS LÍNEAS!
                            polygon: [
                                { x: x, y: y }, { x: x + width, y: y },
                                { x: x + width, y: y + height }, { x: x, y: y + height }
                            ]
                        };
                    } else {
                        console.warn(`Objeto de interacción ${obj.name || obj.id} en la capa 'Tarjetas' no tiene 'id', 'text' o 'itemToAdd' definidos.`);
                    }
                
                  
                }
            }
        }
    }
}
// console.log("Teletransportadores procesados:", mapTeleporters); // Para depuración






export function getRelevantCollisionPolygons(cameraX, cameraY) {
    const relevantPolygons = [];
    const viewPortMinX = cameraX - tileSizeX * RENDER_PADDING_TILES;
    const viewPortMinY = cameraY - tileSizeY * RENDER_PADDING_TILES;
    const viewPortMaxX = cameraX + GAME_WIDTH_LOGICAL + tileSizeX * RENDER_PADDING_TILES;
    const viewPortMaxY = cameraY + GAME_HEIGHT_LOGICAL + tileSizeY * RENDER_PADDING_TILES;

    for (const poly of collisionPolygons) {
        let polyMinX = Infinity, polyMinY = Infinity;
        let polyMaxX = -Infinity, polyMaxY = -Infinity;

        for (const p of poly) {
            polyMinX = Math.min(polyMinX, p.x);
            polyMinY = Math.min(polyMinY, p.y);
            polyMaxX = Math.max(polyMaxX, p.x);
            polyMaxY = Math.max(polyMaxY, p.y);
        }

        if (polyMaxX > viewPortMinX && polyMinX < viewPortMaxX &&
            polyMaxY > viewPortMinY && polyMinY < viewPortMaxY) {
            relevantPolygons.push(poly);
        }
    }
    return relevantPolygons;
}

export function debugDrawCollisionPolygons(ctx) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    for (const poly of collisionPolygons) {
        ctx.beginPath();
        ctx.moveTo(poly[0].x - cameraX, poly[0].y - cameraY);
        for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i].x - cameraX, poly[i].y - cameraY);
        }
        ctx.closePath();
        ctx.stroke();
    }
}
/**
 * Actualiza el frame de animación del sprite sheet del teletransportador.
 * Se debe llamar en cada frame del gameLoop.
 * @param {number} deltaTime - Tiempo transcurrido desde el último frame en segundos.
 */
export function updateTeleporterAnimation(deltaTime) {
    // console.log(`[Teleporter Anim] DeltaTime: ${deltaTime.toFixed(4)}, Timer: ${teleporterFrameTimer.toFixed(4)}, Current Frame: ${teleporterCurrentFrame}`); // <--- AÑADE ESTA LÍNEA
    
    teleporterFrameTimer += deltaTime;
    if (teleporterFrameTimer >= TELEPORTER_ANIMATION_SPEED) {
        teleporterCurrentFrame = (teleporterCurrentFrame + 1) % TELEPORTER_NUM_FRAMES;
        teleporterFrameTimer = 0;
      // console.log(`[Teleporter Anim] --- FRAME CAMBIADO a: ${teleporterCurrentFrame} ---`); // <--- AÑADE ESTA LÍNEA
    }
}


// Asegúrate de que 'mapInteractions' esté declarado globalmente en map.js,
// por ejemplo: let mapInteractions = {}; // O es cargado por loadMap

/**
 * Marca un objeto de interacción como disparado para que no se active de nuevo.
 * Esta función es llamada desde game.js cuando un diálogo/interacción se cierra
 * y el objeto tiene la propiedad 'once: true'.
 * @param {string} objectId El ID único del objeto de interacción a marcar.
 */
export function markInteractionObjectAsTriggered(objectId) {
    // Comprueba si el objeto de interacción existe en nuestro mapa actual por su ID
    // Suponiendo que mapInteractions es un objeto donde las claves son los IDs de los objetos,
    // como lo vimos en la consola: {01: {…}, Reaper: {…}}
    if (mapInteractions[objectId]) {
        mapInteractions[objectId].hasBeenTriggered = true; // Marca la propiedad 'hasBeenTriggered' a true
        console.log(`map.js: Objeto de interacción '${objectId}' marcado como 'hasBeenTriggered = true'.`);
    } else {
        console.warn(`map.js: No se pudo encontrar el objeto de interacción con ID '${objectId}' para marcar como disparado.`);
    }
}