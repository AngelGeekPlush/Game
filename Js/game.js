// Js/game.js

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
import { loadMap, manageVisibleChunks, drawMap, getMapDimensions, mapData, collisionPolygons, getRelevantCollisionPolygons, debugDrawCollisionPolygons, mapTeleporters, updateTeleporterAnimation, mapInteractions, markInteractionObjectAsTriggered,minimapLoadedTileImages  } from './map.js'; // <--- ¡AÑADE markInteractionObjectAsTriggered AQUÍ!
import { checkCollision } from './collisions.js';

export const playerInventory = []; // <-- ¡NUEVA VARIABLE GLOBAL!: Array para guardar los items


// Variables globales del juego (las que tenías en el HTML, ahora en game.js)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
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
const mobileInventoryButton = document.getElementById('mobileInventoryButton');
// --- NUEVAS REFERENCIAS PARA LA PANTALLA DE INICIO ---
const startScreen = document.getElementById('startScreen'); // Referencia al div de la pantalla de inicio completa
const startButton = document.getElementById('startButton'); // Referencia al botón "Iniciar Juego"
let cardInteractionIcon = new Image(); // <--- AÑADIDA: Declaramos un nuevo objeto Image para nuestro icono
cardInteractionIcon.onload = () => { // <--- AÑADIDA: Para confirmar carga exitosa
 //   console.log("Icono de interacción de tarjeta cargado exitosamente:", cardInteractionIcon.src);
};

cardInteractionIcon.src = './img/Tarjeta Sprite.webp'; // <--- AÑADIDA: Ruta a tu icono. ¡CAMBIA ESTA RUTA SI ES NECESARIO!
cardInteractionIcon.onerror = () => { // <--- AÑADIDA: Manejo de error si la imagen no carga
    console.error("Error al cargar la imagen del icono de interacción de tarjeta:", cardInteractionIcon.src);
    // Puedes usar un icono de fallback o simplemente no mostrar nada
    cardInteractionIcon.src = 'https://placehold.co/32x32/ff0000/ffffff?text=X'; // Placeholder de error
};


// ¡NUEVAS VARIABLES PARA LA ANIMACIÓN DEL SPRITE DE TARJETA!
const CARD_NUM_FRAMES = 4; // Tu spritesheet tiene 4 imágenes
const CARD_ANIMATION_SPEED = 0.15; // Tiempo en segundos por cada frame (ajusta para la velocidad)
let cardCurrentFrame = 0; // Frame actual que se está mostrando
let cardFrameTimer = 0; // Temporizador para el cambio de frame
const CARD_FRAME_WIDTH = 128; // Ancho de un solo frame (512 / 4)
const CARD_FRAME_HEIGHT = 128; // Alto de un solo frame (tu imagen es 128 de alto)
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
let dialoguePages = [];             // Almacena las diferentes "páginas" de texto del diálogo actual
let currentPageIndex = 0;           // Índice de la página de texto actual que se está mostrando
let isTyping = false;               // Bandera booleana que indica si el texto se está "escribiendo" (animando) en ese momento
let typingTimer = 0;                // Un contador para controlar el ritmo de la animación de escritura (en milisegundos)
let currentTypingIndex = 0;         // El índice del carácter actual que se está mostrando en la animación
const TYPING_SPEED_MS = 30;         // Define la velocidad de escritura (milisegundos por carácter). Puedes ajustar este valor.
const DIALOGUE_PAGE_DELIMITER = '_NEXT_'; // Un delimitador especial que usarás en tu texto de Tiled para indicar un salto de página.
                                        // Asegúrate de que este delimitador no aparezca de forma natural en tu texto.
const backgroundMusic = new Audio('./Audio/map.mp3'); // URL de ejemplo
backgroundMusic.volume = 0.3; // Volumen bajo para que no opaque otros sonidos
backgroundMusic.loop = true; // Hace que la música se repita continuamente
const loadingScreen = document.getElementById('loadingScreen');
const instructionsPanel = document.getElementById('instructionsPanel'); // NUEVO: Referencia al panel de instrucciones
const itemDefinitions = {
    'Tarjeta Reaper': {
        name: 'Tarjeta Reaper',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Reaper_S.webp', // <--- ¡VERIFICA ESTA RUTA!
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Reaper_S.webp',
       
    },
   'Tarjeta ReaperJr': { // <--- ¡LA CLAVE DEBE COINCIDIR EXACTAMENTE CON "itemToAdd" DE TILED!
        name: 'Tarjeta Reaper Jr.', // Nombre que se mostrará en el inventario y diálogo
        // imagePath es la ruta para el ICONO en el INVENTARIO.
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta ReaperJr_S.webp', // <-- ¡VERIFICA ESTA RUTA DE ICONO PARA INVENTARIO!
        // dialogueImagePath es la ruta para la IMAGEN GRANDE en el DIÁLOGO DE ÍTEMS.
        // La que proporcionaste en Tiled: "Tarjetas/Sweet Nightmare/Tarjeta ReaperJr_S.webp"
        // Asegúrate que esta ruta sea correcta desde la raíz de tu proyecto.
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta ReaperJr_S.webp', // <-- ¡VERIFICA ESTA RUTA DE IMAGEN PARA EL DIÁLOGO!
        
    },

       'Tarjeta Bianca': {
        name: 'Tarjeta Bianca',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Bianca_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Bianca_S.webp',
    },
    'Tarjeta Angelo': {
        name: 'Tarjeta Angelo',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Angelo_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Angelo_S.webp',
    },
    'Tarjeta Brujita': {
        name: 'Tarjeta Brujita',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Brujita_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Brujita_S.webp',
    },
    'Tarjeta Marco': {
        name: 'Tarjeta Marco',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Marco_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Marco_S.webp',
    },
    'Tarjeta Hugo': {
        name: 'Tarjeta Hugo',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Hugo_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Hugo_S.webp',
    },
    'Tarjeta Colmillo': {
        name: 'Tarjeta Colmillo',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Colmillo_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Colmillo_S.webp',
    },
    'Tarjeta Hoku Koko': {
        name: 'Tarjeta Hoku Koko',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Hoku Koko_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Hoku Koko_S.webp',
    },
    'Tarjeta Spook': {
        name: 'Tarjeta Spook',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Spook_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Spook_S.webp',
    },
    'Tarjeta Frankie': {
        name: 'Tarjeta Frankie',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Frankie_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Frankie_S.webp',
    },
    'Tarjeta Samhain': {
        name: 'Tarjeta Samhain',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Samhain_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Samhain_S.webp',
    },
    'Tarjeta Joaquin': {
        name: 'Tarjeta Joaquin',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Joaquin_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Joaquin_S.webp',
    },
    'Tarjeta Conde-nadito': {
        name: 'Tarjeta Conde-nadito',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Condenadito_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Condenadito_S.webp',
    },
    'Tarjeta Conde-nado': {
        name: 'Tarjeta Conde-nado',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta Condenado_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta Condenado_S.webp',
    },
    'Tarjeta Chamuco': {
        name: 'Tarjeta Chamuco',
        imagePath: './Tarjetas/Sweet Nightmare/Tarjeta El Chamuco_S.webp',
        dialogueImagePath: './Tarjetas/Sweet Nightmare/Tarjeta El Chamuco_S.webp',
    },
    'Tarjeta Lola': {
        name: 'Tarjeta Lola',
        imagePath: './Tarjetas/Comidin/Tarjeta Lola_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Lola_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)" // Se mantiene la descripción proporcionada
    },
    'Tarjeta Sandwich': {
        name: 'Tarjeta Sandwich',
        imagePath: './Tarjetas/Comidin/Tarjeta Sandwich_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Sandwich_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Ryan': {
        name: 'Tarjeta Ryan',
        imagePath: './Tarjetas/Comidin/Tarjeta Ryan_S.webp', // Asegúrate de que esta ruta sea correcta
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Ryan_S.webp', // Asegúrate de que esta ruta sea correcta
        text: "Ryan la piña es cool como ninguna otra, siente una gran atracción hacia la pizza pero es incapaz de decirlo_NEXT_ya que para muchos no es natural, le encanta el surf y odia los chistes de piñas coladas"
    },
    'Tarjeta HotDog': {
        name: 'Tarjeta HotDog',
        imagePath: './Tarjetas/Comidin/Tarjeta HotDog_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta HotDog_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Jean': {
        name: 'Tarjeta Jean',
        imagePath: './Tarjetas/Comidin/Tarjeta Jean_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Jean_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta BigMike': {
        name: 'Tarjeta BigMike',
        imagePath: './Tarjetas/Comidin/Tarjeta BigMike_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta BigMike_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta BernardoNancy': {
        name: 'Tarjeta BernardoNancy',
        imagePath: './Tarjetas/Comidin/Tarjeta BernardoNancy_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta BernardoNancy_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Zanahoria': {
        name: 'Tarjeta Zanahoria',
        imagePath: './Tarjetas/Comidin/Tarjeta Zanahoria_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Zanahoria_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Aguacate': {
        name: 'Tarjeta Aguacate',
        imagePath: './Tarjetas/Comidin/Tarjeta Aguacate_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Aguacate_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Margarita': {
        name: 'Tarjeta Margarita',
        imagePath: './Tarjetas/Comidin/Tarjeta Margarita_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Margarita_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Jack': {
        name: 'Tarjeta Jack',
        imagePath: './Tarjetas/Comidin/Tarjeta Jack_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Jack_S.webp',
        text: "Jack era un trozo de pizza que fue olvidado por accidente en la caja, día a día se fue dañando y perdiendo la conciencia hasta volverse un zombie_NEXT_ahora va dañando al resto de las comidas en venganza por ser olvidado."
    },
    'Tarjeta Chocolatina': {
        name: 'Tarjeta Chocolatina',
        imagePath: './Tarjetas/Comidin/Tarjeta Chocolatina_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Chocolatina_S.webp',
        text: "En algún lugar de Villa Comidín, unos increíbles y exquisitos granos de cacao, conocidos por ser demasiado secos y amargos pero grandes exploradores, emprendieron uno de sus viajes._NEXT_ Durante su travesía, se encontraron con Lola, una dulce y tierna caja de leche. Juntos descubrieron que podían crear algo suave y delicioso_NEXT_ ¡Choco! Una gran chocolatina con una cubierta brillante destinada a conquistar los paladares más golosos y atraerlos con su irresistible aroma."
    },
    'Tarjeta Carne Manga': { // Fíjate en el espacio en el nombre si así lo tienes en Tiled
        name: 'Tarjeta Carne Manga',
        imagePath: './Tarjetas/Comidin/Tarjeta CarneManga_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta CarneManga_S.webp',
        text: "En un mercado muy peculiar de villa comidin, había una carne manga tan tierna que era famosa por su jugosidad y su peculiaridad_NEXT_ ¡se podía sacar el hueso con carita feliz! Los chefs del lugar siempre contaban la leyenda de cómo esa carne había sido bendecida por una vieja bruja del bosque_NEXT_quien le había otorgado esa cualidad especial para traer alegría a quienes la preparaban y la disfrutaban.Cada día_NEXT_los clientes del mercado se maravillaban al ver cómo los chefs expertos en esta carne realizaban el ritual de extraer el hueso con sonrisa, asegurando que la carne fuera perfecta para la preparación._NEXT_ Era un espectáculo que no solo alimentaba los estómagos, sino también el espíritu de quienes lo presenciaban. _NEXT_ Así, la carne manga con su hueso de carita feliz se convirtió en la estrella indiscutible del mercado, uniendo a la gente en torno a su deliciosa y encantadora singularidad."
    },
    'Tarjeta Chocofresa': {
        name: 'Tarjeta Chocofresa',
        imagePath: './Tarjetas/Comidin/Tarjeta Chocofresa_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Chocofresa_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Yemin-Eggtor': {
        name: 'Tarjeta Yemin-Eggtor',
        imagePath: './Tarjetas/Comidin/Tarjeta Yemin-Eggtor_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Yemin-Eggtor_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Cafesito': {
        name: 'Tarjeta Cafesito',
        imagePath: './Tarjetas/Comidin/Tarjeta Cafesito_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Cafesito_S.webp',
        text: "Historia en construcción , disculpa las molestias (٥̲̅_̅٥̲̅)"
    },
    'Tarjeta Sandy': {
        name: 'Tarjeta Sandy',
        imagePath: './Tarjetas/Comidin/Tarjeta Sandy_S.webp',
        dialogueImagePath: './Tarjetas/Comidin/Tarjeta Sandy_S.webp',
        text: "Sandy la sandia es una de las hijas de la gran sandia, ella siempre vive alegre y le encanta comer Hamburguesas."
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

   
 // --- NUEVO: Actualiza el texto con efecto de máquina de escribir si está activo ---
    if (isTyping) { // <--- AÑADIDA: Solo llama a typeText() si el texto se está animando
        typeText(deltaTime); // <--- AÑADIDA: Llama a la función de animación de escritura
    }
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
             
             if (mapData && Object.keys(mapInteractions).length > 0) { // <--- AÑADE ESTA LÍNEA (la que no tenías)
                const playerPolygonForInteraction = getPlayerPolygon();
                for (const interactionId in mapInteractions) {
                    const interaction = mapInteractions[interactionId];

                    // Si el objeto de interacción tiene la propiedad 'once' y ya fue disparado, lo saltamos.
                    if (interaction.once && interaction.hasBeenTriggered) {
                        continue; // Pasa a la siguiente interacción si ya ha sido activada y es de un solo uso
                    }

                    // Comprueba la colisión del jugador con el área de interacción
                    if (checkCollision(playerPolygonForInteraction, interaction.polygon)) {
                        // Una vez que una interacción es detectada, mostramos el diálogo adecuado.
                        if (interaction.actionType === 'collectItem') {
                            showItemDialogue(interaction.text, interaction);
                        } else if (interaction.actionType === 'dialogue') {
                            showGeneralDialogue(interaction.text, interaction);
                        }
                        // ¡CLAVE!: Después de activar UNA interacción, salimos del bucle 'for'.
                        // Esto es CRUCIAL para evitar que múltiples interacciones se disparen en el mismo fotograma.
                        break; // Solo activa una interacción a la vez
            }
        }
    }
    
 } // <--- ¡CIERRE DE LA NUEVA CONDICIÓN!

 // Esta línea debe ir DESPUÉS de la lógica del jugador y ANTES de drawMap.
    updateTeleporterAnimation(deltaTime); // <--- ¡AÑADE ESTA LÍNEA AQUÍ!
   updateCardAnimation(deltaTime); 
    // Actualizar cámara (siempre se actualiza, incluso con diálogo, para que los elementos de UI se dibujen correctamente)
    updateCamera(mapData);

    // Gestionar chunks del mapa (siempre se actualiza)
    if (timestamp - lastChunkManageTime > CHUNK_MANAGE_INTERVAL) {
        manageVisibleChunks();
        lastChunkManageTime = timestamp;
    }

    // --- Dibujo (Siempre se dibuja) ---
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar canvas
    drawMap(ctx);
    drawPlayer(ctx);
    drawJoystick(ctx);

      drawMinimap(playerWorldX, playerWorldY);
// --- NUEVO: Dibujar iconos para puntos de interacción de tarjetas O UN RECTÁNGULO DE DEPURACIÓN ---
// ESTA ES LA CONDICIÓN CLAVE PARA EL DIBUJO DE ICONOS: SOLO DIBUJA SI EL MAPA Y LAS INTERACCIONES YA ESTÁN CARGADOS.
if (mapData && Object.keys(mapInteractions).length > 0) { // <--- ¡¡¡AÑADE ESTA LÍNEA CRÍTICA AQUÍ!!!
    // ¡¡¡NUEVO LOG CRÍTICO AQUÍ!!! Muestra el estado real de mapInteractions
   // console.log("DEBUG GAME.JS: Estado de mapInteractions justo antes de dibujar:", JSON.parse(JSON.stringify(mapInteractions)));

    for (const interactionId in mapInteractions) {
        const interaction = mapInteractions[interactionId];

        // MÁS LOGS DE DEPURACIÓN para ver qué 'interaction' está procesando
       // console.log(`DEBUG GAME.JS: Procesando icono para interactionId: ${interactionId}. Propiedades: x=${interaction.x}, y=${interaction.y}, actionType=${interaction.actionType}, hasBeenTriggered=${interaction.hasBeenTriggered}`);

        // Solo dibujamos el icono/rectángulo si:
        // 1. La acción es 'collectItem' (es una tarjeta)
        // 2. NO ha sido disparada aún (si es 'once' y hasBeenTriggered es false)
        // 3. Las coordenadas x e y son números válidos (¡CRÍTICO para evitar NaN!)
        if (interaction.actionType === 'collectItem' && 
            (!interaction.once || !interaction.hasBeenTriggered) &&
            typeof interaction.x === 'number' && !isNaN(interaction.x) &&
            typeof interaction.y === 'number' && !isNaN(interaction.y)
        ) {
            // Calculamos la posición del icono/rectángulo en la pantalla, relativa a la cámara
            const drawX = interaction.x - cameraX;
            const drawY = interaction.y - cameraY;

            // Definimos el tamaño deseado para el icono/rectángulo.
            // Usaremos el width/height del objeto de Tiled si son válidos, si no, un tamaño por defecto.
            const iconWidth = interaction.width > 0 ? interaction.width : 32;
            const iconHeight = interaction.height > 0 ? interaction.height : 32;

            // PRIMERO: Dibuja un rectángulo de depuración para VER el área del objeto.
            ctx.save(); // Guarda el estado actual del contexto del canvas
            
            ctx.restore(); // Restaura el estado previo del contexto
            
           if (cardInteractionIcon.complete && cardInteractionIcon.naturalWidth > 0) {
    ctx.drawImage(
        cardInteractionIcon, // La imagen del spritesheet
        cardCurrentFrame * CARD_FRAME_WIDTH, // sourceX: X del frame actual en el spritesheet
        0, // sourceY: Y del frame (siempre 0 porque es una sola fila)
        CARD_FRAME_WIDTH, // sourceWidth: Ancho del frame a recortar
        CARD_FRAME_HEIGHT, // sourceHeight: Alto del frame a recortar
        drawX, // destX: Posición X en el canvas
        drawY, // destY: Posición Y en el canvas
        iconWidth, // destWidth: Ancho final para dibujar en el canvas (lo que ya calculaste)
        iconHeight // destHeight: Alto final para dibujar en el canvas (lo que ya calculaste)
    );
} else {
    console.warn("Icono de interacción de tarjeta no cargado o inválido (dentro del bucle de dibujo).", cardInteractionIcon.src);
}
        }
    }
}
    // Dibujar los polígonos de colisión para depuración
    //debugDrawCollisionPolygons(ctx);
   // debugDrawPlayerCollider(ctx);

    // ¡SECCIÓN MODIFICADA!: Dibujar el Cuadro de Texto de Diálogo Estilo RPG
 // --- Dibujo ---



// --- NUEVO: Dibujar iconos para puntos de interacción de tarjetas ---

    
    // ¡DESCOMENTADAS!: Dibujar los polígonos de colisión para depuración
  //  debugDrawCollisionPolygons(ctx); 
  //  debugDrawPlayerCollider(ctx); // Asegúrate de que esta función exista y esté exportada en player.js

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
    // --- NUEVO: Si el texto se está escribiendo, lo completa instantáneamente ---
    if (isTyping) {
        completeTypingInstantly(); // Llama a la función para terminar la escritura de golpe
        return; // Detiene la ejecución aquí. No avanzar la página aún, solo completar la escritura.
    }
    // ¡¡¡CORRECCIÓN CLAVE!!!: Cierra si el diálogo está activo Y ha pasado el cooldown desde que se abrió
    // Y ha pasado el cooldown desde el último intento de dismiss (para evitar spam de cierres)
    if (isDialogueActive && 
        (currentTime - dialogueOpenTime > DISMISS_COOLDOWN_SECONDS) && // Debe haber pasado un tiempo mínimo desde que se abrió
        (currentTime - lastDismissActionTime > DISMISS_COOLDOWN_SECONDS) // Y desde el último intento de cierre
    ) {
        console.log("handleDismissClick: Condición de cierre CUMPLIDA. Cerrando diálogo.");
        advanceDialoguePage(); // <--- ¡CAMBIA 'hideTextBox();' POR ESTO!
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

if (mobileInventoryButton) {
    mobileInventoryButton.addEventListener('click', toggleInventory); // Para clic normal
    mobileInventoryButton.addEventListener('touchstart', (e) => { // Para toque en pantalla táctil
        e.preventDefault(); // Previene el comportamiento por defecto (ej. scroll)
        toggleInventory();
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
       // startGameLoop();

if (startButton) {
    // Función común para manejar el inicio del juego
    const handleStartGame = () => {
        // --- ¡CAMBIO CLAVE AQUÍ! ---
        // Añade la clase que oculta el botón de forma instantánea y forzada
        startButton.classList.add('start-button-clicked'); 
        // --- FIN DEL CAMBIO CLAVE ---

        if (startScreen) {
            startScreen.classList.add('hidden'); // Inicia la transición de opacidad y visibilidad

            // Muestra la pantalla de carga inmediatamente después de ocultar la pantalla de inicio
            if (loadingScreen) {
                loadingScreen.classList.remove('hidden');
            }

            // Llama a la función que cargará los recursos y luego iniciará el juego
            loadGameResources(); 

        } else {
            // Si startScreen no existe, muestra la pantalla de carga y carga los recursos directamente
            if (loadingScreen) {
                loadingScreen.classList.remove('hidden');
            }
            loadGameResources();
        }


    };

    startButton.addEventListener('click', handleStartGame);

    startButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Evita el comportamiento por defecto del navegador para toques
        handleStartGame();
    });
} else {
    console.error("El botón de inicio (startButton) no fue encontrado. El juego no se iniciará con un clic.");
    // Si quieres que el juego inicie automáticamente si el botón no se encuentra (para depuración)
    // startGameLoop();
}


    } catch (error) {
        console.error("Fallo crítico al iniciar el juego:", error);
    }
});

/**
 * Inicia el efecto de máquina de escribir para la página de diálogo actual.
 * @param {HTMLElement} targetElement El elemento HTML donde se mostrará el texto (itemTextContent o generalMessageContent).
 * @param {HTMLElement} dismissPromptElement El elemento HTML del prompt de "continuar".
 * @param {string} text La página de texto a animar.
 */
function startTypingEffect(targetElement, dismissPromptElement, text) {
    isTyping = true; // Establece la bandera a true para indicar que la animación está activa
    currentTypingIndex = 0; // Reinicia el índice de caracteres a 0
    typingTimer = 0; // Reinicia el temporizador de escritura
    targetElement.innerHTML = ''; // Limpia el contenido del elemento antes de empezar a escribir
    
    // Detiene la animación del prompt y lo oculta mientras el texto se está escribiendo
    dismissPromptElement.style.animation = 'none'; 
    dismissPromptElement.style.opacity = '0'; 

    // Se guarda la página actual en una variable temporal accesible desde typeText
    // Esto es útil porque typeText se llama desde gameLoop y no recibe argumentos directamente.
    targetElement.dataset.currentPageText = text; 
    targetElement.dataset.targetElementId = targetElement.id; // Guarda el ID para saber qué elemento actualizar
}

/**
 * Función que se ejecuta en cada fotograma del gameLoop para animar el texto.
 * Añade caracteres al texto visible uno por uno, creando el efecto de escritura.
 * @param {number} deltaTime Tiempo transcurrido desde el último fotograma en segundos.
 */
function typeText(deltaTime) {
    if (!isTyping) return; // Si no hay animación activa, no hacemos nada

    typingTimer += deltaTime * 1000; // Acumula el tiempo transcurrido en milisegundos

    let targetElement;
    let dismissPromptElement;
    let currentPageText;

    // Determina qué diálogo está activo para actualizar el contenido y el prompt
    // Se basa en el estilo 'display' de los contenedores principales del diálogo
    if (itemTextBoxContainer.style.display === 'flex') {
        targetElement = itemTextContent;
        dismissPromptElement = itemDismissPrompt;
    } else if (generalMessageBoxContainer.style.display === 'flex') {
        targetElement = generalMessageContent;
        dismissPromptElement = generalDismissPrompt;
    } else {
        isTyping = false; // Si ninguno está visible, detenemos la escritura
        return;
    }

    // Obtiene el texto de la página actual que fue guardado en startTypingEffect
    currentPageText = targetElement.dataset.currentPageText;

    if (!currentPageText) { // Si por alguna razón no hay texto, detenemos la escritura
        isTyping = false;
        return;
    }

    // Calcula cuántos caracteres deberían haberse añadido dado el tiempo transcurrido y la velocidad de escritura
    const charactersToAdd = Math.floor(typingTimer / TYPING_SPEED_MS);

    // Si el número de caracteres a añadir es mayor que el que ya hemos añadido
    if (charactersToAdd > currentTypingIndex) {
        // Calcula cuántos caracteres adicionales se deben mostrar en este fotograma
        const remainingChars = currentPageText.length - currentTypingIndex;
        const charsThisFrame = Math.min(charactersToAdd - currentTypingIndex, remainingChars);

        if (charsThisFrame > 0) {
            // Añade los nuevos caracteres al HTML del elemento de destino
            targetElement.innerHTML += currentPageText.substring(currentTypingIndex, currentTypingIndex + charsThisFrame);
            currentTypingIndex += charsThisFrame; // Actualiza el índice de caracteres ya mostrados
        }

        // Si todos los caracteres de la página actual se han mostrado
        if (currentTypingIndex >= currentPageText.length) {
            isTyping = false; // La animación ha terminado
            typingTimer = 0; // Reinicia el temporizador
            // Reactiva la animación del prompt y lo hace visible
            dismissPromptElement.style.animation = 'pulse 1.5s infinite alternate'; 
            dismissPromptElement.style.opacity = '1'; 
        }
    }
}



/**
 * Avanza a la siguiente página de diálogo o cierra el diálogo si no hay más páginas.
 * Esta función es llamada cuando el jugador "descarta" la página actual (clic/tecla).
 */
function advanceDialoguePage() {
    currentPageIndex++; // Incrementa el índice para ir a la siguiente página

    if (currentPageIndex < dialoguePages.length) {
        // Si hay más páginas, inicia el efecto de escritura para la siguiente.
        // Primero, determina qué cuadro de diálogo está actualmente visible para actualizarlo.
        const activeDialogContainer = itemTextBoxContainer.style.display === 'flex' ? itemTextBoxContainer : generalMessageBoxContainer;
        const activeTextContent = itemTextBoxContainer.style.display === 'flex' ? itemTextContent : generalMessageContent;
        const activeDismissPrompt = itemTextBoxContainer.style.display === 'flex' ? itemDismissPrompt : generalDismissPrompt;
        
        // Inicia el efecto de escritura con el texto de la nueva página.
        startTypingEffect(activeTextContent, activeDismissPrompt, dialoguePages[currentPageIndex]);
    } else {
        // Si no hay más páginas, significa que hemos llegado al final del diálogo.
        // Cierra completamente el cuadro de diálogo.
        hideTextBox();
    }
}

/**
 * Completa instantáneamente la escritura del texto actual de la página.
 * Esta función se llama cuando el jugador intenta "avanzar" mientras el texto aún se está escribiendo.
 */
function completeTypingInstantly() {
    let targetElement;
    let dismissPromptElement;

    // Determina qué cuadro de diálogo está activo para actualizar su contenido y prompt.
    if (itemTextBoxContainer.style.display === 'flex') {
        targetElement = itemTextContent;
        dismissPromptElement = itemDismissPrompt;
    } else if (generalMessageBoxContainer.style.display === 'flex') {
        targetElement = generalMessageContent;
        dismissPromptElement = generalDismissPrompt;
    } else {
        return; // No hay diálogo activo para completar, salimos.
    }

    // Muestra todo el texto de la página actual de golpe, sin animación.
    targetElement.innerHTML = targetElement.dataset.currentPageText; 
    // Actualiza el índice de escritura al final del texto.
    currentTypingIndex = targetElement.dataset.currentPageText.length;
    // Desactiva la bandera de escritura, ya que el texto está completo.
    isTyping = false;
    typingTimer = 0; // Reinicia el temporizador de escritura.

    // Reactiva la animación del prompt y asegura que esté visible, ya que la escritura terminó.
    dismissPromptElement.style.animation = 'pulse 1.5s infinite alternate'; 
    dismissPromptElement.style.opacity = '1'; 
}



/**
 * Muestra el cuadro de diálogo ESPECÍFICO DE ÍTEMS con texto y la imagen del ítem.
 * Esta función usa el 'textBoxContainer' original.
 * @param {string} text El texto principal a mostrar (generalmente del Tiled).
 * @param {object | null} interactionObject El objeto de interacción que activó el diálogo.
 */



export function showItemDialogue(text, interactionObject = null) { // <--- ¡NOMBRE DE LA FUNCIÓN CAMBIADO!
    // Si ya hay un diálogo activo, no hacemos nada para evitar superposiciones.
    if (isDialogueActive) return;

    // --- NUEVO: Reinicia y prepara el estado del diálogo ---
    dialoguePages = text.split(DIALOGUE_PAGE_DELIMITER); // <--- MODIFICADO: Divide el texto de Tiled en páginas
    currentPageIndex = 0;                               // <--- NUEVA: Reinicia el índice de página
    isDialogueActive = true;                            // <--- ASEGURADO: La bandera de diálogo activo
    isGamePaused = true;                                // <--- ASEGURADO: Pausa el juego
    activeInteractionObject = interactionObject;
    dialogueOpenTime = performance.now() / 1000;


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
             
           
            // --- NUEVO/MODIFICADO: Usa la descripción del itemDefinition o el texto de Tiled para la primera página ---
            const fullTextForFirstPage = itemData.description ? itemData.description : dialoguePages[0];
            dialoguePages[0] = fullTextForFirstPage; // <--- MODIFICADO: Sobrescribe la primera página con la descripción
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
    // --- NUEVO: Inicia el efecto de escritura para la primera página ---
    startTypingEffect(itemTextContent, itemDismissPrompt, dialoguePages[currentPageIndex]); // <--- NUEVA LÍNEA
    console.log("Diálogo de ítem mostrado. Páginas:", dialoguePages);

    if (canvas) canvas.style.pointerEvents = 'none';
    if (mobileInventoryButton) { // <-- ¡NUEVA LÍNEA!
        mobileInventoryButton.style.display = 'none'; // <-- ¡NUEVA LÍNEA!
    }
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
    
    // --- NUEVO: Reinicia y prepara el estado del diálogo ---
    dialoguePages = text.split(DIALOGUE_PAGE_DELIMITER); // <--- MODIFICADO: Divide el texto de Tiled en páginas
    currentPageIndex = 0;                               // <--- NUEVA: Reinicia el índice de página
    isDialogueActive = true;                            // <--- ASEGURADO: La bandera de diálogo activo
    isGamePaused = true;                                // <--- ASEGURADO: Pausa el juego
    activeInteractionObject = interactionObject;
    dialogueOpenTime = performance.now() / 1000;
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
    // --- NUEVO: Inicia el efecto de escritura para la primera página ---
    startTypingEffect(generalMessageContent, generalDismissPrompt, dialoguePages[currentPageIndex]); // <--- NUEVA LÍNEA
    console.log("Mensaje general mostrado. Páginas:", dialoguePages);
    if (canvas) canvas.style.pointerEvents = 'none';
     if (mobileInventoryButton) { // <-- ¡NUEVA LÍNEA!
        mobileInventoryButton.style.display = 'none'; // <-- ¡NUEVA LÍNEA!
    }
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

    // --- NUEVO: Detiene cualquier animación de escritura que esté en curso ---
    isTyping = false;        // <--- AÑADIDA: Detiene la bandera de escritura
    currentTypingIndex = 0;  // <--- AÑADIDA: Reinicia el índice de caracteres
    typingTimer = 0;         // <--- AÑADIDA: Reinicia el temporizador de escritura

    // --- CLAVE: Oculta AMBOS contenedores de diálogo al cerrar ---
    // Esto asegura que no quede ningún cuadro de diálogo visible por error.
    itemTextBoxContainer.style.display = 'none'; // Oculta el contenedor de diálogo de ítems.
    itemTextBoxContainer.style.pointerEvents = 'none'; // Deshabilita interacciones con él.

    generalMessageBoxContainer.style.display = 'none'; // Oculta el contenedor de diálogo general.
    generalMessageBoxContainer.style.pointerEvents = 'none'; // Deshabilita interacciones con él.
    
    // Re-habilita la interacción con el canvas del juego SOLO si el inventario NO está abierto.
    // Esto evita que puedas mover al jugador si el inventario sigue en pantalla.
 const canvas = document.getElementById('gameCanvas');
    if (canvas && !isInventoryOpen) {
      canvas.style.pointerEvents = 'auto'; // Re-habilita interacción con el juego.
      // MUESTRA el botón de inventario móvil (si está en un dispositivo móvil)
      if (mobileInventoryButton) { // <-- ¡NUEVA LÍNEA!
          // Necesitas una forma de saber si está en móvil para mostrarlo solo ahí.
          // Una forma simple es que el CSS ya lo maneje, entonces solo tienes que setear display='flex'.
          mobileInventoryButton.style.display = 'flex'; // <-- ¡NUEVA LÍNEA!
      }
    } else if (canvas && isInventoryOpen) { // Si el inventario SÍ está abierto, el canvas debe permanecer deshabilitado.
        canvas.style.pointerEvents = 'none';
        // Y el botón de inventario móvil debe permanecer oculto (ya que el inventario está abierto)
        if (mobileInventoryButton) { // <-- ¡NUEVA LÍNEA!
             mobileInventoryButton.style.display = 'none'; // <-- ¡NUEVA LÍNEA!
        }
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
    // --- NUEVO: Reinicia las variables de paginación del diálogo ---
    dialoguePages = [];      // <--- AÑADIDA: Limpia el array de páginas del diálogo
    currentPageIndex = 0;    // <--- AÑADIDA: Reinicia el índice de la página actual

}


function handleDismissKey(event) {
    const currentTime = performance.now() / 1000;
    //console.log("handleDismissKey: Tecla presionada.", event.key, "isDialogueActive:", isDialogueActive, "Cooldown activo (desde último dismiss):", (currentTime - lastDismissActionTime <= DISMISS_COOLDOWN_SECONDS), "Cooldown activo (desde apertura):", (currentTime - dialogueOpenTime <= DISMISS_COOLDOWN_SECONDS)); 
    if (event.key === DIALOGUE_DISMISS_KEY) { // <--- Asegura que solo funcione con la tecla configurada (Enter)
        // --- NUEVO: Si el texto se está escribiendo, lo completa instantáneamente ---
        if (isTyping) {
            completeTypingInstantly(); // Llama a la función para terminar la escritura de golpe
            return; // Detiene la ejecución aquí. No avanzar la página aún, solo completar la escritura.
        }}
    // ¡¡¡MODIFICACIÓN CRUCIAL AQUÍ!!!: Solo procede si la tecla es DIALOGUE_DISMISS_KEY
    if (event.key === DIALOGUE_DISMISS_KEY && // <--- ¡AÑADE ESTA CONDICIÓN!
        isDialogueActive && 
        (currentTime - dialogueOpenTime > DISMISS_COOLDOWN_SECONDS) && 
        (currentTime - lastDismissActionTime > DISMISS_COOLDOWN_SECONDS) 
    ) {
      //  console.log("handleDismissKey: Condición de cierre CUMPLIDA. Cerrando diálogo.");
         advanceDialoguePage(); // <--- ¡CAMBIA 'hideTextBox();' POR ESTO!
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

function toggleInventory() {
    // Si el inventario está abierto, ciérralo
    if (inventoryPanel.style.display === 'flex') {
        inventoryPanel.style.display = 'none';
        // Re-habilita la interacción con el juego SOLO si NO hay un diálogo activo
        if (!isDialogueActive) { // <--- CLAVE: Solo re-habilitar si no hay diálogo
            canvas.style.pointerEvents = 'auto';
        }
        isInventoryOpen = false; // Actualiza el estado
        console.log("Inventario oculto.");
    } else {
        // Si el inventario está cerrado, ábrelo
        // Oculta cualquier diálogo antes de mostrar el inventario
        hideTextBox(); 
        
        updateInventoryUI();
        inventoryPanel.style.display = 'flex';
        canvas.style.pointerEvents = 'none';
        isInventoryOpen = true;
        console.log("Inventario mostrado.");
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

/**
 * Actualiza el frame de animación del sprite de la tarjeta.
 * Se debe llamar en cada frame del gameLoop.
 * @param {number} deltaTime - Tiempo transcurrido desde el último frame en segundos.
 */
function updateCardAnimation(deltaTime) {
    cardFrameTimer += deltaTime;
    if (cardFrameTimer >= CARD_ANIMATION_SPEED) {
        cardCurrentFrame = (cardCurrentFrame + 1) % CARD_NUM_FRAMES;
        cardFrameTimer = 0;
    }
}

function drawMinimap(playerX, playerY) {
    // Limpia todo el canvas del minimapa en cada frame
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // --- Comprobación inicial: Asegurarse de que los datos del mapa estén cargados ---
    // Si mapData (o sus partes esenciales) no está disponible, dibuja un fondo simple y sale.
    if (!mapData || !mapData.layers || mapData.layers.length === 0 || !mapData.tilesets || mapData.tilesets.length === 0) {
        // Dibuja un fondo gris si el mapa aún no se ha cargado
        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        // Dibuja el borde blanco
        minimapCtx.strokeStyle = 'white';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
        return; // Sale de la función, no hay mapa para dibujar todavía
    }

    // --- Cálculos de escala y posición para el minimapa ---
    // Calcula las dimensiones totales del mapa en píxeles
    const mapWidthPixels = mapData.width * mapData.tilewidth;
    const mapHeightPixels = mapData.height * mapData.tileheight;

    // Calcula una escala para que el mapa completo quepa dentro del minimapa.
    // El '0.8' es un factor para dejar un pequeño margen y que no ocupe el 100% exacto del cuadro.
    // Puedes ajustar este valor (ej. a 1.0 para llenar más, o 0.5 para hacerlo más pequeño).
    const minimapMapScale = Math.min(
        minimapCanvas.width / mapWidthPixels,
        minimapCanvas.height / mapHeightPixels
    ) ;

    // Calcula el desfase (offset) para centrar el mapa escalado dentro del minimapa
    const offsetX = (minimapCanvas.width - (mapWidthPixels * minimapMapScale)) / 2;
    const offsetY = (minimapCanvas.height - (mapHeightPixels * minimapMapScale)) / 2;

    // --- Dibujo de la capa "Capa de patrones 1" en el minimapa ---
    mapData.layers.forEach(layer => {
        // SOLO dibuja la capa si es de tipo 'tilelayer', es visible,
        // Y SU NOMBRE ES EXACTAMENTE 'Capa de patrones 1'.
        if (layer.type === 'tilelayer' && layer.visible && layer.name === 'Capa de patrones 1') {
            // Itera sobre cada tile en esta capa específica
            for (let y = 0; y < layer.height; y++) {
                for (let x = 0; x < layer.width; x++) {
                    const tileId = layer.data[y * layer.width + x];
                    if (tileId > 0) { // Si el ID del tile es válido (no es un tile vacío)
                        let tileset = null;
                        // Encuentra el tileset correcto al que pertenece este tileId
                        for (let i = mapData.tilesets.length - 1; i >= 0; i--) {
                            if (tileId >= mapData.tilesets[i].firstgid) {
                                tileset = mapData.tilesets[i];
                                break;
                            }
                        }

                        if (tileset) {
                            // Calcula las coordenadas del tile dentro de su tileset,
                            // aunque para "Collection of Images" se usa 0,0 directamente.
                            const localTileId = tileId - tileset.firstgid;
                            const cols = tileset.columns || 1; // Asume 1 columna si es una colección de imágenes
                            const sx = (localTileId % cols) * tileset.tilewidth;
                            const sy = Math.floor(localTileId / cols) * tileset.tileheight;

                            // Obtiene la imagen del tile desde la caché precargada del minimapa.
                            // Esto es clave para las "Collection of Images".
                            const tileImage = minimapLoadedTileImages[tileId];

                            // Solo dibuja si la imagen se cargó correctamente y es válida
                            if (tileImage && tileImage.complete && tileImage.naturalWidth > 0) {
                                minimapCtx.drawImage(
                                    tileImage,           // La imagen ya cargada del tile individual
                                    0, 0,                // sx, sy: Siempre 0,0 porque 'tileImage' ya es solo ese tile
                                    tileset.tilewidth,   // sWidth: Ancho original del tile en su fuente
                                    tileset.tileheight,  // sHeight: Alto original del tile en su fuente
                                    // Coordenadas de destino en el minimapa, escaladas y centradas
                                    offsetX + x * (tileset.tilewidth * minimapMapScale),
                                    offsetY + y * (tileset.tileheight * minimapMapScale),
                                    // Dimensiones de destino en el minimapa
                                    tileset.tilewidth * minimapMapScale,
                                    tileset.tileheight * minimapMapScale
                                );
                            } else {
                                // Este warning aparecerá si alguna imagen de la capa base no se cargó.
                                // Si esto ocurre, la ruta en map.js (prepareTileData) sigue siendo el problema.
                                // console.warn(`[MINIMAP DEBUG] NO se pudo dibujar tile ${tileId}. Imagen no cargada o inválida.`);
                            }
                        }
                    }
                }
            }
        }
    });

    // --- Dibujo de la representación del jugador en el minimapa ---
    // Establece el color para el punto del jugador (rojo)
    minimapCtx.fillStyle = 'red';
    // Dibuja un pequeño rectángulo que representa al jugador, escalado y posicionado
    minimapCtx.fillRect(
        offsetX + playerX * minimapMapScale, // Posición X del jugador escalada en el minimapa
        offsetY + playerY * minimapMapScale, // Posición Y del jugador escalada en el minimapa
        5, // Tamaño del "punto" del jugador (ancho)
        5  // Tamaño del "punto" del jugador (alto)
    );

    // --- Dibujo del borde del minimapa ---
    // Establece el estilo para el borde (blanco, grosor 1px)
    minimapCtx.strokeStyle = 'white';
    minimapCtx.lineWidth = 1;
    // Dibuja el rectángulo del borde alrededor de todo el minimapa
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
}
async function loadGameResources() {
    console.log("[GAME LOAD] Iniciando carga de recursos del juego...");
    try {
        // 1. Cargar el JSON del mapa (usando la ruta que ya corregimos)
        // Esto es CRÍTICO para que el juego no se rompa al iniciar
        const mapData = await fetch('./Mapa_angelgeek_base.json').then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for map JSON`);
            }
            return response.json();
        });
        console.log("[GAME LOAD] Mapa JSON cargado:", mapData.name);

        // 2. Aquí puedes añadir la carga de OTROS recursos críticos que tu juego necesite
        // ANTES de que startGameLoop() comience.
        // Por ejemplo, si tienes imágenes de tilesets o sprites que no se cargan automáticamente
        // con el mapa, o que tu startGameLoop() espera que estén listos.
        // Puedes usar Promise.all para cargar varios recursos en paralelo:
        /*
        const [playerSprite, enemySprite] = await Promise.all([
            loadImage('./img/player_sprite.png'), // Asume que tienes una función loadImage
            loadImage('./img/enemy_sprite.png')
        ]);
        console.log("[GAME LOAD] Sprites cargados.");
        */

        // SIMULACIÓN DE TIEMPO DE CARGA (ELIMINA ESTA LÍNEA EN PRODUCCIÓN)
        // Esto es solo para que puedas ver la pantalla de carga por un momento.
        // Cuando tus recursos reales tarden en cargar, esta línea no será necesaria.
        await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos

        console.log("[GAME LOAD] Todos los recursos críticos cargados. Iniciando juego.");

        // 3. Ocultar la pantalla de carga
        if (loadingScreen) {
            loadingScreen.classList.add('hidden'); // Aplica la clase 'hidden' para ocultarla
        }

        // 4. Iniciar el juego principal y la música
        // ¡IMPORTANTE! Aquí es donde llamas a tus funciones que realmente inician el juego.
        startGameLoop(); // Llama a tu función principal de inicio del juego
       
        backgroundMusic.play().catch(e => console.warn("La música de fondo no pudo iniciarse automáticamente al cargar el juego.", e));
if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-hidden');
}



    } catch (error) {
        console.error("[GAME LOAD ERROR] Error al cargar recursos:", error);
        // Si hay un error, puedes mostrar un mensaje en la pantalla de carga
        if (loadingScreen) {
            loadingScreen.querySelector('.loading-content p').textContent = "Error al cargar. Recarga la página.";
            loadingScreen.querySelector('.spinner').style.display = 'none'; // Oculta el spinner
        }
    }
}

// Si no tienes una función `loadImage` para cargar imágenes, aquí tienes una básica:
/*
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}
*/