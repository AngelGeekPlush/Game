// js/constants.js

// Definir las dimensiones base para PC y móvil
const PC_GAME_WIDTH = 960;
const PC_GAME_HEIGHT = 540;

// Para móviles, podríamos optar por una orientación vertical o dimensiones más compactas.
const MOBILE_GAME_WIDTH = 480; // La mitad de ancho que PC
const MOBILE_GAME_HEIGHT = 854; // Altura para una relación de aspecto 9:16 (vertical)

// Función para detectar si es un dispositivo móvil (simplificado, puedes refinar)
function isMobileDevice() {
    // Una detección simple basada en el User Agent y/o la presencia de touch events.
    // Ten en cuenta que esto no es 100% infalible, pero es un buen punto de partida.
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    return isMobile || hasTouch;
}

// Exportar las dimensiones lógicas basadas en la detección
export const GAME_WIDTH_LOGICAL = isMobileDevice() ? MOBILE_GAME_WIDTH : PC_GAME_WIDTH;
export const GAME_HEIGHT_LOGICAL = isMobileDevice() ? MOBILE_GAME_HEIGHT : PC_GAME_HEIGHT;

export const tileSizeX = 1307;
export const tileSizeY = 1330;

// Rutas de los sprites del jugador
// ¡CONFIRMADO!: Rutas a la carpeta 'img' con los nombres correctos
export const PLAYER_SPRITE_PATHS = {
    down: './img/playerDown.webp',
    up: './img/playerUp.webp',
    left: './img/playerLeft.webp',
    right: './img/playerRight.webp',
};

export const BASE_PLAYER_SPEED = 200;
export const DIAGONAL_SPEED_FACTOR = 1 / Math.sqrt(2);
export const PLAYER_FRAME_INTERVAL = 8; // Tu constante original 'frameInterval'

export const CHUNK_LOAD_BUFFER_TILES = 1;
export const CHUNK_MANAGE_INTERVAL = 700;
export const RENDER_PADDING_TILES = 1;
