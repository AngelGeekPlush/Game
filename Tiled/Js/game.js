// js/game.js

// Importa todo lo necesario de los otros módulos
import {
    GAME_WIDTH_LOGICAL,
    GAME_HEIGHT_LOGICAL,
    CHUNK_MANAGE_INTERVAL,
    tileSizeX, 
    tileSizeY  
} from './constants.js';

import { initializeInput, updateInputScale, keysPressed, joystick, drawJoystick } from './input.js';
// ¡ACTUALIZADO!: Importar debugDrawPlayerCollider y setPlayerWorldPosition
import { loadPlayerSprites, updatePlayer, drawPlayer, playerWorldX, playerWorldY, frameWidth, frameHeight, setInitialPlayerWorldPosition, getPlayerPolygon, debugDrawPlayerCollider, setPlayerWorldPosition } from './player.js';
import { updateCamera, cameraX, cameraY } from './camera.js';
// Todas las importaciones de map.js en UNA sola línea
import { loadMap, manageVisibleChunks, drawMap, getMapDimensions, mapData, collisionPolygons, getRelevantCollisionPolygons, debugDrawCollisionPolygons, mapTeleporters, updateTeleporterAnimation, mapInteractions, markInteractionObjectAsTriggered } from './map.js'; // <--- ¡AÑADE markInteractionObjectAsTriggered AQUÍ!
import { checkCollision } from './collisions.js';

export const playerInventory = []; // <-- ¡NUEVA VARIABLE GLOBAL!: Array para guardar los items


// Variables globales del juego (las que tenías en el HTML, ahora en game.js)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let currentScale = 1;
// --- REFERENCIAS ACTUALIZADAS Y NUEVAS PARA LOS CUADROS DE DIÁLOGO ---
// Este es el cuadro de diálogo de ÍTEMS (usa el ID HTML original 'textBoxContainer')
const itemTextBoxContainer = document.getElementById('textBoxContainer');
const itemTextContent = document.getElementById('textContent');
const itemDismissPrompt = document.getElementById('dismissPrompt'); // El mensaje de "Presiona ENTER..."

// Estas son las NUEVAS referencias para el cuadro de diálogo GENERAL (usan los ID HTML nuevos)
const generalMessageBoxContainer = document.getElementById('generalMessageBoxContainer');
const generalMessageContent = document.getElementById('generalMessageContent'); // El div del texto principal
const generalDismissPrompt = document.getElementById('generalDismissPrompt'); // El mensaje de "Presiona ENTER..."

// --- Tus otras referencias existentes (asegúrate de que estas también estén) ---
const inventoryPanel = document.getElementById('inventoryPanel');
const inventoryList = document.getElementById('inventoryList');
const closeInventoryButton = document.getElementById('closeInventoryButton');
let lastTime = 0;
let deltaTime = 0;
let lastChunkManageTime = 0;
let gameLoopStarted = false;
const dialogueItemImage = document.getElementById('dialogueItemImage'); // La imagen dentro del diálogo de ítems

// ¡NUEVAS VARIABLES PARA EL TELETRANSPORTE!
let canTeleport = true; // Indica si el personaje puede teletransportarse
const TELEPORT_COOLDOWN_SECONDS = 5.0; // Tiempo de cooldown en segundos (ej: 0.5 segundos)
let currentTeleportCooldown = 0; // Contador regresivo del cooldown
// 
let currentDialogue = null; // Almacena el texto actual a mostrar
//const DIALOGUE_DISPLAY_TIME = 3.0; // Duración en segundos que el texto estará visible
//let dialogueTimer = 0; // Temporizador para el diálogo

let isDialogueActive = false; // Indica si un diálogo está actualmente visible
let lastDismissActionTime = 0; // Para controlar el cooldown de cierre y evitar cierres múltiples rápidos
const DISMISS_COOLDOWN_SECONDS = 0.3; // Pequeño cooldown para el cierre (0.2 segundos)
const DIALOGUE_DISMISS_KEY = 'Enter'; 
let activeInteractionObject = null;
let dialogueOpenTime = 0; // Tiempo en que el diálogo se abrió
let isGamePaused = false; // <-- ¡ASEGÚRATE DE QUE ESTA LÍNEA EXISTA!
let isInventoryOpen = false; // Esta también debería estar si no la tienes

const itemDefinitions = {
    'Tarjeta Reaper': {
        name: 'Tarjeta Reaper',
        imagePath: './img/inventory_items/reaper_card_icon.webp', // <--- ¡VERIFICA ESTA RUTA!
        dialogueImagePath: './img/inventory_items/reaper_card_icon.webp',
       
    },
    'Llave Vieja': {
        name: 'Llave Vieja',
        imagePath: './img/inventory_items/old_key_icon.png', // <--- ¡VERIFICA ESTA RUTA!
        description: "Una llave oxidada que parece abrir algo antiguo."
    },
    // Añade más ítems aquí a medida que los crees en Tiled y les asignes 'itemToAdd'
};

function adjustCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const clientWidth = window.innerWidth;
    const clientHeight = window.innerHeight;

    currentScale = Math.min(clientWidth / GAME_WIDTH_LOGICAL, clientHeight / GAME_HEIGHT_LOGICAL);

    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;

    canvas.style.width = clientWidth + 'px';
    canvas.style.height = clientHeight + 'px';

    ctx.setTransform(currentScale * dpr, 0, 0, currentScale * dpr, 0, 0);

    // Actualiza la escala en el módulo de entrada para que el joystick se calcule correctamente
    updateInputScale(currentScale);
}

// Inicializa el canvas y añade el listener de redimensionamiento
adjustCanvas();
window.addEventListener('resize', adjustCanvas);

// Inicializa los listeners de input
initializeInput(canvas, currentScale); 

function gameLoop(timestamp) {
   deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Actualiza la bandera de si el diálogo está activo
   

    // --- Lógica de Cierre de Diálogo (Manual) ---
    // Solo intenta cerrar si hay un diálogo activo Y no estamos en cooldown de cierre
    if (isDialogueActive) {
        const currentTime = timestamp / 1000; // Tiempo actual en segundos

       
        // Si el diálogo está activo, queremos PAUSAR el juego (movimiento del personaje, teletransporte)
        // Esto se logra encerrando la lógica de movimiento en un 'if (!isDialogueActive)'.
    }


    // ¡NUEVA SECCIÓN DE COOLDOWN PARA TELETRANSPORTE (Mantenemos si es necesario)!
    if (!canTeleport) {
        currentTeleportCooldown -= deltaTime;
        if (currentTeleportCooldown <= 0) {
            canTeleport = true;
            currentTeleportCooldown = 0;
        }
    }

    // --- Lógica de movimiento del jugador, teletransporte y colisiones ---
    // ¡ENVUELVE ESTA LÓGICA CON UN 'if (!isDialogueActive)'!
    if (!isDialogueActive) { // <--- ¡AÑADE ESTA CONDICIÓN PARA PAUSAR EL JUEGO DURANTE EL DIÁLOGO!
        const mapDimensions = getMapDimensions();
        let prevPlayerWorldX = playerWorldX;
        let prevPlayerWorldY = playerWorldY;

        const tentativePlayerPos = updatePlayer(deltaTime);
        setPlayerWorldPosition(tentativePlayerPos.x, tentativePlayerPos.y, mapDimensions.widthPixels, mapDimensions.heightPixels);

        let teleportedInThisFrame = false;

        if (canTeleport) {
            const playerPolygonForTeleport = getPlayerPolygon();
            const teleporterObjects = Object.values(mapTeleporters);
            for (const teleporter of teleporterObjects) {
                if (checkCollision(playerPolygonForTeleport, teleporter.polygon)) {
                    const destinationTeleporter = mapTeleporters[teleporter.targetId];
                    if (destinationTeleporter) {
                        const destX = destinationTeleporter.x + destinationTeleporter.width / 2;
                        const destY = destinationTeleporter.y + destinationTeleporter.height / 2;
                        setPlayerWorldPosition(
                            destX - (frameWidth || 0) / 2,
                            destY - (frameHeight || 0) / 2,
                            mapDimensions.widthPixels,
                            mapDimensions.heightPixels
                        );
                        canTeleport = false;
                        currentTeleportCooldown = TELEPORT_COOLDOWN_SECONDS;
                        teleportedInThisFrame = true;
                        break;
                    } else {
                        // console.warn(`¡El teletransportador de destino con ID ${teleporter.targetId} no fue encontrado!`);
                    }
                }
            }
        }

        // Obtén los polígonos de colisión cercanos de la capa de objetos
        if (!teleportedInThisFrame) {
            let collidedWithMap = false;
            const playerPolygonForMapCollision = getPlayerPolygon();
             const relevantCollisionPolys = getRelevantCollisionPolygons(cameraX, cameraY); // <--- ¡CORREGIDO!
            for (const mapPoly of relevantCollisionPolys) {
                if (checkCollision(playerPolygonForMapCollision, mapPoly)) {
                    collidedWithMap = true;
                    break;
                }
            }
            if (collidedWithMap) {
                setPlayerWorldPosition(prevPlayerWorldX, prevPlayerWorldY, mapDimensions.widthPixels, mapDimensions.heightPixels);
            }
        }
        // Lógica de interacciones (solo si no hay diálogo activo y no se ha teletransportado)
if (!isDialogueActive && !isGamePaused) {
        const playerPolygonForInteraction = getPlayerPolygon();
        for (const interactionId in mapInteractions) {
            const interaction = mapInteractions[interactionId];
            if (!interaction.once || !interaction.hasBeenTriggered) {
                if (checkCollision(playerPolygonForInteraction, interaction.polygon)) {
                    // ¡CLAVE!: Decide qué cuadro de diálogo mostrar según el actionType
                    if (interaction.actionType === 'collectItem') {
                        showItemDialogue(interaction.text, interaction); // Muestra el cuadro de ÍTEMS
                    } else if (interaction.actionType === 'dialogue') {
                        showGeneralDialogue(interaction.text, interaction); // Muestra el cuadro GENERAL
                    }
                    // Si hay otros actionType, puedes añadir más 'else if' aquí.
                    break; // Solo activa una interacción a la vez
            }
        }
    }}
} // <--- ¡CIERRE DE LA NUEVA CONDICIÓN!

// Esta línea debe ir DESPUÉS de la lógica del jugador y ANTES de drawMap.
    updateTeleporterAnimation(deltaTime); // <--- ¡AÑADE ESTA LÍNEA AQUÍ!

    // Actualizar cámara (siempre se actualiza, incluso con diálogo, para que los elementos de UI se dibujen correctamente)
    updateCamera(mapData);

    // Gestionar chunks del mapa (siempre se actualiza)
    if (timestamp - lastChunkManageTime > CHUNK_MANAGE_INTERVAL) {
        manageVisibleChunks();
        lastChunkManageTime = timestamp;
    }

    // --- Dibujo (Siempre se dibuja) ---
    drawMap(ctx);
    drawPlayer(ctx);
    drawJoystick(ctx);

    // Dibujar los polígonos de colisión para depuración
    debugDrawCollisionPolygons(ctx);
    debugDrawPlayerCollider(ctx);

    // ¡SECCIÓN MODIFICADA!: Dibujar el Cuadro de Texto de Diálogo Estilo RPG
 
    
    // ¡DESCOMENTADAS!: Dibujar los polígonos de colisión para depuración
    debugDrawCollisionPolygons(ctx); 
    debugDrawPlayerCollider(ctx); // Asegúrate de que esta función exista y esté exportada en player.js

    requestAnimationFrame(gameLoop);

    

}

function startGameLoop() {
    if (!gameLoopStarted) {
        gameLoopStarted = true;
        requestAnimationFrame(gameLoop);
    }
}

function handleDismissClick(event) {
    const currentTime = performance.now() / 1000;
    console.log("handleDismissClick: Clic/Toque detectado. isDialogueActive:", isDialogueActive, "Cooldown activo (desde último dismiss):", (currentTime - lastDismissActionTime <= DISMISS_COOLDOWN_SECONDS), "Cooldown activo (desde apertura):", (currentTime - dialogueOpenTime <= DISMISS_COOLDOWN_SECONDS)); 
    
    // ¡¡¡CORRECCIÓN CLAVE!!!: Cierra si el diálogo está activo Y ha pasado el cooldown desde que se abrió
    // Y ha pasado el cooldown desde el último intento de dismiss (para evitar spam de cierres)
    if (isDialogueActive && 
        (currentTime - dialogueOpenTime > DISMISS_COOLDOWN_SECONDS) && // Debe haber pasado un tiempo mínimo desde que se abrió
        (currentTime - lastDismissActionTime > DISMISS_COOLDOWN_SECONDS) // Y desde el último intento de cierre
    ) {
        console.log("handleDismissClick: Condición de cierre CUMPLIDA. Cerrando diálogo.");
        hideTextBox();
        lastDismissActionTime = currentTime; // Reinicia el tiempo de la última acción de cierre
        event.preventDefault(); 
    }
}

// Lógica de inicialización del juego (la parte de tu HTML original)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Carga los sprites del jugador
        await loadPlayerSprites();

        // Carga el mapa del juego
        const loadedMapData = await loadMap('Mapa_angelgeek_base.json'); // Asegúrate que esta ruta sea correcta

        // Establece la posición inicial del jugador
        const initialPlayerWorldX = 2450;
        const initialPlayerWorldY = 1500;
        const mapDimensions = getMapDimensions();
        setInitialPlayerWorldPosition(initialPlayerWorldX, initialPlayerWorldY, mapDimensions.widthPixels, mapDimensions.heightPixels);

        // Actualiza la cámara y gestiona los chunks del mapa
        updateCamera(loadedMapData);
        manageVisibleChunks();

        // --- MANEJO DE EVENTOS DE CIERRE DE DIÁLOGOS ---
        // Los listeners de clic/toque deben ir en los CONTENEDORES de los diálogos, no en el document.
        
        // 1. Configurar los mensajes de "Presiona ENTER o toca para continuar"
        // Aseguramos que estos mensajes aparezcan correctamente al inicio en ambos diálogos.
        // Esto es porque ya no lo tienen fijo en el HTML sino que se inyecta por JS si es necesario.
        if (itemDismissPrompt) {
            itemDismissPrompt.innerHTML = '.';
        }
        if (generalDismissPrompt) {
            generalDismissPrompt.innerHTML = '.';
        }

        // 2. Añadir listeners de clic/toque a los contenedores de los diálogos
        // Listener para el cuadro de diálogo de ÍTEMS
        if (itemTextBoxContainer) {
            itemTextBoxContainer.addEventListener('mousedown', handleDismissClick); 
            itemTextBoxContainer.addEventListener('touchstart', handleDismissClick);
        }

        // --- ¡NUEVO!: Listeners para el cuadro de diálogo GENERAL ---
        if (generalMessageBoxContainer) {
            generalMessageBoxContainer.addEventListener('mousedown', handleDismissClick);
            generalMessageBoxContainer.addEventListener('touchstart', handleDismissClick);
        }

        // 3. Listener de teclado para la tecla "Enter" (para ambos diálogos)
        // Este se queda en 'document' porque es para toda la ventana.
        document.addEventListener('keydown', handleDismissKey); 

        // --- MANEJO DEL INVENTARIO ---
        const INVENTORY_TOGGLE_KEY = 'i'; // Tecla para abrir/cerrar inventario
        document.addEventListener('keydown', (event) => {
            // Solo si la tecla 'i' es presionada y no hay un diálogo activo
            if (event.key.toLowerCase() === INVENTORY_TOGGLE_KEY && !isDialogueActive) {
                if (inventoryPanel.style.display === 'flex') {
                    // Si el inventario está abierto, ciérralo
                    inventoryPanel.style.display = 'none';
                    canvas.style.pointerEvents = 'auto'; // Re-habilita interacción con el juego
                    isInventoryOpen = false; // Actualiza el estado
                } else {
                    // Si el inventario está cerrado, ábrelo
                    updateInventoryUI(); // Actualiza el contenido del inventario antes de mostrarlo
                    inventoryPanel.style.display = 'flex';
                    canvas.style.pointerEvents = 'none'; // Deshabilita interacción con el juego
                    isInventoryOpen = true; // Actualiza el estado
                }
            }
        });

        // Listener para el botón de cerrar en el panel del inventario
        if (closeInventoryButton) {
            closeInventoryButton.addEventListener('click', () => {
                inventoryPanel.style.display = 'none';
                canvas.style.pointerEvents = 'auto';
                isInventoryOpen = false; // Actualiza el estado
            });
        }

        // Opcional pero recomendado para evitar clicks/toques no deseados en el inventario:
        if (inventoryPanel) {
            inventoryPanel.addEventListener('touchstart', (e) => e.stopPropagation());
            inventoryPanel.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        // Actualiza la interfaz del inventario al inicio para mostrar "Inventario vacío."
        updateInventoryUI();

        // Inicia el bucle principal del juego
        startGameLoop();

    } catch (error) {
        console.error("Fallo crítico al iniciar el juego:", error);
    }
});

/**
 * Muestra el cuadro de diálogo ESPECÍFICO DE ÍTEMS con texto y la imagen del ítem.
 * Esta función usa el 'textBoxContainer' original.
 * @param {string} text El texto principal a mostrar (generalmente del Tiled).
 * @param {object | null} interactionObject El objeto de interacción que activó el diálogo.
 */
export function showItemDialogue(text, interactionObject = null) { // <--- ¡NOMBRE DE LA FUNCIÓN CAMBIADO!
    // Si ya hay un diálogo activo, no hacemos nada para evitar superposiciones.
    if (isDialogueActive) return;

    // --- CLAVE: Aseguramos que el cuadro de diálogo GENERAL esté oculto ---
    // Si el cuadro general estuviera visible por alguna razón, lo escondemos.
    generalMessageBoxContainer.style.display = 'none';
    generalMessageBoxContainer.style.pointerEvents = 'none'; // También deshabilita interacciones con él.

    // 1. Oculta la imagen del diálogo de ítems y limpia su fuente por defecto al inicio.
    // Esto asegura que cada vez que se abre el diálogo, la imagen empiece oculta y limpia.
    dialogueItemImage.style.display = 'none';
    dialogueItemImage.src = '';

    // 2. Establece el texto principal en el contenedor de texto del ítem.
    itemTextContent.innerHTML = text;

    // 3. Muestra el mensaje para cerrar el diálogo (el "Presiona ENTER...").
    // Aseguramos que siempre esté visible en el diálogo de ítems.
    itemDismissPrompt.style.display = 'block';

    // 4. Lógica CONDICIONAL: Solo muestra la imagen y la descripción extra si la interacción
    // es de tipo 'collectItem' y tiene un ítem asociado.
    if (interactionObject && interactionObject.actionType === 'collectItem' && interactionObject.itemToAdd) {
        // Busca la definición completa del ítem en tu objeto 'itemDefinitions'.
        const itemData = itemDefinitions[interactionObject.itemToAdd];

        if (itemData) {
            let imageSource = ''; // Variable temporal para guardar la ruta de la imagen.

            // --- CLAVE: Priorizamos la ruta de la imagen directamente desde Tiled (interactionObject.imagePath) ---
            // Esto es importante porque tu consola mostró que la ruta grande venía de Tiled.
            if (interactionObject.imagePath) {
                imageSource = interactionObject.imagePath;
            } else if (itemData.dialogueImagePath) {
                // Si Tiled no tiene una ruta, usamos la que pueda estar definida en 'itemDefinitions'.
                imageSource = itemData.dialogueImagePath;
            }

            if (imageSource) { // Si hemos encontrado una ruta de imagen válida...
                dialogueItemImage.src = imageSource; // Asigna la ruta a la imagen HTML.
                dialogueItemImage.style.display = 'block'; // Hace visible la imagen.
                dialogueItemImage.alt = itemData.name; // Texto alternativo para accesibilidad.
                
                // Registro en consola para depuración: Confirma qué imagen intenta cargar.
                console.log("showItemDialogue: Intentando cargar imagen:", imageSource, "Display:", dialogueItemImage.style.display);
                
                // Manejo de errores si la imagen no se carga (muestra un placeholder).
                dialogueItemImage.onerror = () => {
                    console.error(`showItemDialogue: Error al cargar la imagen: ${imageSource}. Verifica la ruta del archivo.`);
                    // Muestra un placeholder rojo si la imagen falla.
                    dialogueItemImage.src = `https://placehold.co/80x80/FF0000/FFFFFF?text=ERROR`;
                };
            }

            // Si el ítem tiene una descripción en 'itemDefinitions', la añade al texto principal.
            // Si no quieres que la descripción aparezca en el diálogo, puedes eliminar este 'if'.
            let fullText = text; // El texto inicial que viene de Tiled.
            if (itemData.description) {
                fullText += "<br><br>" + itemData.description;
            }
            itemTextContent.innerHTML = fullText; // Actualiza el contenido de texto con la descripción añadida.
        } else {
            console.warn(`showItemDialogue: Item '${interactionObject.itemToAdd}' no encontrado en itemDefinitions.`);
        }
    }

    // 5. Muestra el contenedor del cuadro de diálogo de ÍTEMS y ajusta el estado del juego.
    itemTextBoxContainer.style.display = 'flex'; // Hace visible el contenedor (con Flexbox).
    itemTextBoxContainer.style.pointerEvents = 'auto'; // Habilita la interacción (clics/toques) en este cuadro.
    
    // Registro en consola para depuración: Confirma que el cuadro de ítems se está mostrando.
    console.log("showItemDialogue: Mostrando itemTextBoxContainer. display:", itemTextBoxContainer.style.display);

    // Deshabilita la interacción con el canvas principal del juego mientras el diálogo está abierto.
    const canvas = document.getElementById('gameCanvas'); // Aseguramos que 'canvas' sea accesible.
    if (canvas) canvas.style.pointerEvents = 'none';

    // Pausa el juego y activa la bandera de diálogo.
    isGamePaused = true;
    isDialogueActive = true;
    activeInteractionObject = interactionObject; // Guarda el objeto de interacción actual.
    dialogueOpenTime = performance.now() / 1000; // Registra el tiempo de apertura del diálogo.
}

/**
 * Muestra el cuadro de diálogo GENERAL (solo texto centrado).
 * Esta función usa el 'generalMessageBoxContainer'.
 * @param {string} text El texto a mostrar.
 * @param {object | null} interactionObject El objeto de interacción que activó el diálogo.
 */
export function showGeneralDialogue(text, interactionObject = null) {
    // Si ya hay un diálogo activo (ya sea de ítem o general), no hacemos nada.
    if (isDialogueActive) return;

    // --- CLAVE: Aseguramos que el cuadro de diálogo de ÍTEMS esté oculto ---
    // Si el cuadro de ítems estuviera visible por alguna razón, lo escondemos.
    itemTextBoxContainer.style.display = 'none';
    itemTextBoxContainer.style.pointerEvents = 'none'; // También deshabilita interacciones con él.

    // 1. Establece el texto principal en el contenedor de texto general.
    generalMessageContent.innerHTML = text;

    // 2. Muestra el mensaje para cerrar el diálogo (el "Presiona ENTER...").
    // Aseguramos que siempre esté visible en el diálogo general.
    generalDismissPrompt.style.display = 'block';

    // 3. Muestra el contenedor del cuadro de diálogo GENERAL y ajusta el estado del juego.
    generalMessageBoxContainer.style.display = 'flex'; // Lo hace visible (con Flexbox).
    generalMessageBoxContainer.style.pointerEvents = 'auto'; // Habilita la interacción (clics/toques) en este cuadro.

    // Registro en consola para depuración: Confirma que el cuadro general se está mostrando.
    console.log("showGeneralDialogue: Mostrando generalMessageBoxContainer. display:", generalMessageBoxContainer.style.display);

    // Deshabilita la interacción con el canvas principal del juego mientras el diálogo está abierto.
    const canvas = document.getElementById('gameCanvas'); // Aseguramos que 'canvas' sea accesible.
    if (canvas) canvas.style.pointerEvents = 'none';

    // Pausa el juego y activa la bandera de diálogo.
    isGamePaused = true;
    isDialogueActive = true;
    activeInteractionObject = interactionObject; // Guarda el objeto de interacción actual.
    dialogueOpenTime = performance.now() / 1000; // Registra el tiempo de apertura del diálogo.
}



/**
 * Oculta cualquier cuadro de diálogo activo (de ítems o general) y reanuda el juego.
 */
export function hideTextBox() {
    // --- CLAVE: Oculta AMBOS contenedores de diálogo al cerrar ---
    // Esto asegura que no quede ningún cuadro de diálogo visible por error.
    itemTextBoxContainer.style.display = 'none'; // Oculta el contenedor de diálogo de ítems.
    itemTextBoxContainer.style.pointerEvents = 'none'; // Deshabilita interacciones con él.

    generalMessageBoxContainer.style.display = 'none'; // Oculta el contenedor de diálogo general.
    generalMessageBoxContainer.style.pointerEvents = 'none'; // Deshabilita interacciones con él.
    
    // Re-habilita la interacción con el canvas del juego SOLO si el inventario NO está abierto.
    // Esto evita que puedas mover al jugador si el inventario sigue en pantalla.
    const canvas = document.getElementById('gameCanvas'); // Aseguramos que 'canvas' sea accesible.
    if (canvas && !isInventoryOpen) { // Condición importante: ¡solo si el inventario no está abierto!
      canvas.style.pointerEvents = 'auto'; // Re-habilita interacción con el juego.
    }

    // Reinicia las banderas de estado del juego.
    isGamePaused = false;
    isDialogueActive = false;
    
    // --- CLAVE: Limpia el texto y las imágenes de AMBOS diálogos SIEMPRE al cerrar ---
    // Esto es importante para que el contenido de un diálogo no aparezca en el siguiente.
    itemTextContent.innerHTML = ''; // Limpia el texto del diálogo de ítems.
    dialogueItemImage.src = ''; // Limpia la URL de la imagen del ítem.
    dialogueItemImage.style.display = 'none'; // Oculta la imagen del ítem.
    
    generalMessageContent.innerHTML = ''; // Limpia el texto del diálogo general.

    // Lógica para procesar la interacción activa (ej. añadir ítem, marcar como disparado).
    // Esto solo se ejecuta si había un objeto de interacción asociado al diálogo que se cerró.
    if (activeInteractionObject) {
        // Registro en consola para depuración: Muestra el objeto de interacción que se está procesando.
        console.log("hideTextBox: activeInteractionObject al momento de procesar cierre:", activeInteractionObject);
        
        // Si la interacción era para recoger un ítem, lo añade al inventario.
        if (activeInteractionObject.actionType === 'collectItem' && activeInteractionObject.itemToAdd) {
            addItemToInventory(activeInteractionObject.itemToAdd);
            console.log(`Ítem '${activeInteractionObject.itemToAdd}' recogido.`);
        }
        
        // Si la interacción debe dispararse una sola vez ('once: true'), la marca como disparada.
        if (activeInteractionObject.once) {
            markInteractionObjectAsTriggered(activeInteractionObject.id); // Llama a la función de map.js.
            console.log(`Interacción '${activeInteractionObject.id}' marcada como disparada.`);
        }
        
        // Limpia el objeto de interacción activa para el siguiente ciclo.
        activeInteractionObject = null;
    }
}


function handleDismissKey(event) {
    const currentTime = performance.now() / 1000;
    //console.log("handleDismissKey: Tecla presionada.", event.key, "isDialogueActive:", isDialogueActive, "Cooldown activo (desde último dismiss):", (currentTime - lastDismissActionTime <= DISMISS_COOLDOWN_SECONDS), "Cooldown activo (desde apertura):", (currentTime - dialogueOpenTime <= DISMISS_COOLDOWN_SECONDS)); 
    
    // ¡¡¡MODIFICACIÓN CRUCIAL AQUÍ!!!: Solo procede si la tecla es DIALOGUE_DISMISS_KEY
    if (event.key === DIALOGUE_DISMISS_KEY && // <--- ¡AÑADE ESTA CONDICIÓN!
        isDialogueActive && 
        (currentTime - dialogueOpenTime > DISMISS_COOLDOWN_SECONDS) && 
        (currentTime - lastDismissActionTime > DISMISS_COOLDOWN_SECONDS) 
    ) {
      //  console.log("handleDismissKey: Condición de cierre CUMPLIDA. Cerrando diálogo.");
        hideTextBox();
        lastDismissActionTime = currentTime; 
        event.preventDefault(); 
    }
}
/**
 * Añade un item al inventario del jugador.
 * @param {string} itemName El nombre exacto del ítem (debe coincidir con una clave en itemDefinitions).
 */
export function addItemToInventory(itemName) {
    const itemData = itemDefinitions[itemName]; // Busca la definición del ítem usando el nombre

    if (itemData) {
        // Comprueba si el ítem ya está en el inventario para evitar duplicados,
        // basándose en el nombre del ítem. Si quieres cantidades, la lógica sería diferente.
        if (!playerInventory.some(item => item.name === itemData.name)) {
            playerInventory.push(itemData); // Añade el objeto completo del ítem al inventario
            console.log(`¡Item '${itemName}' añadido al inventario! Inventario actual:`, playerInventory);
            updateInventoryUI(); // <-- ¡LLAMADA CLAVE!: Actualiza la interfaz del inventario
        } else {
            console.log(`El item '${itemName}' ya está en el inventario.`);
        }
    } else {
        // Este es el warning que estabas viendo. Indica que 'itemName' (lo que vino de Tiled)
        // no tiene una entrada coincidente en 'itemDefinitions'.
        console.warn(`Intento de añadir item '${itemName}' no definido en itemDefinitions. Asegúrate de que el 'itemToAdd' de Tiled coincide con una clave en itemDefinitions.`);
    }
}
function updateInventoryUI() {
    // Asegúrate de que inventoryList está referenciado globalmente (const inventoryList = document.getElementById('inventoryList');)
    const inventoryList = document.getElementById('inventoryList'); 
    if (!inventoryList) {
        console.error("updateInventoryUI: El elemento #inventoryList no fue encontrado.");
        return;
    }

    inventoryList.innerHTML = ''; // Limpia la lista actual para reconstruirla

    if (playerInventory.length === 0) {
        const noItemsMessage = document.createElement('li');
        noItemsMessage.className = 'inventory-item';
        noItemsMessage.textContent = 'Inventario vacío.';
        inventoryList.appendChild(noItemsMessage);
    } else {
        playerInventory.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'inventory-item';

            // Si el ítem tiene una ruta de imagen, crea la etiqueta <img>
            if (item.imagePath) {
                const itemImage = document.createElement('img');
                itemImage.src = item.imagePath;
                itemImage.alt = item.name; // Texto alternativo para accesibilidad
                itemImage.className = 'inventory-item-icon'; // Para aplicar estilos CSS
                itemImage.onerror = () => { // Manejo de error si la imagen no carga
                    itemImage.src = `https://placehold.co/32x32/cccccc/333333?text=N/A`;
                    console.warn(`No se pudo cargar la imagen para el ítem '${item.name}' en la ruta: ${item.imagePath}`);
                };
                listItem.appendChild(itemImage);
            }
            
            // Crea el texto del nombre del ítem
            const itemText = document.createElement('span');
            itemText.textContent = item.name;
            listItem.appendChild(itemText);
            
            inventoryList.appendChild(listItem);
        });
    }
}