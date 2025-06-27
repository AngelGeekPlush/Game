// js/camera.js

import { GAME_WIDTH_LOGICAL, GAME_HEIGHT_LOGICAL, tileSizeX, tileSizeY } from './constants.js';
// Importa las variables del jugador que necesita para calcular el centrado y la posición en pantalla
import { playerWorldX, playerWorldY, frameWidth, frameHeight, setPlayerScreenPosition } from './player.js';

export let cameraX = 0;
export let cameraY = 0;

export function updateCamera(mapData) {
    if (!mapData || !frameWidth || !frameHeight) {
        console.warn("updateCamera: Faltan mapData, frameWidth o frameHeight. Ignorando actualización de cámara.");
        return;
    }

    const mapWidth = mapData.width * tileSizeX;
    const mapHeight = mapData.height * tileSizeY;

    const offsetX_player_on_screen = 0;
    const offsetY_player_on_screen = 0;

    let targetCameraX = playerWorldX - (GAME_WIDTH_LOGICAL / 2) + (frameWidth / 2);
    let targetCameraY = playerWorldY - (GAME_HEIGHT_LOGICAL / 2) + (frameHeight / 2);

    cameraX = Math.max(0, Math.min(targetCameraX, mapWidth - GAME_WIDTH_LOGICAL));
    cameraY = Math.max(0, Math.min(targetCameraY, mapHeight - GAME_HEIGHT_LOGICAL));

    // Consoles comentados para rendimiento
    // console.log("--- updateCamera() Debug ---"); 
    // console.log(`Player World: (${playerWorldX}, ${playerWorldY})`); 
    // console.log(`Target Camera: (${targetCameraX}, ${targetCameraY})`); 
    // console.log(`Final Camera: (${cameraX}, ${cameraY})`); 
    // console.log(`Map Dimensions: (${mapWidth}, ${mapHeight})`); 
    // console.log(`Game Logical Dimensions: (${GAME_WIDTH_LOGICAL}, ${GAME_HEIGHT_LOGICAL})`); 


    let calculatedPlayerScreenX;
    let calculatedPlayerScreenY;

    if (mapWidth <= GAME_WIDTH_LOGICAL) {
        calculatedPlayerScreenX = playerWorldX + (GAME_WIDTH_LOGICAL - mapWidth) / 2 + offsetX_player_on_screen;
    } else {
        if (cameraX === 0) {
            calculatedPlayerScreenX = playerWorldX + offsetX_player_on_screen;
        }
        else if (cameraX === mapWidth - GAME_WIDTH_LOGICAL) {
            calculatedPlayerScreenX = GAME_WIDTH_LOGICAL - (mapWidth - playerWorldX) + offsetX_player_on_screen;
        }
        else {
            calculatedPlayerScreenX = (GAME_WIDTH_LOGICAL / 2) - (frameWidth / 2) + offsetX_player_on_screen;
        }
    }

    if (mapHeight <= GAME_HEIGHT_LOGICAL) {
        calculatedPlayerScreenY = playerWorldY + (GAME_HEIGHT_LOGICAL - mapHeight) / 2 + offsetY_player_on_screen;
    } else {
        if (cameraY === 0) {
            calculatedPlayerScreenY = playerWorldY + offsetY_player_on_screen;
        }
        else if (cameraY === mapHeight - GAME_HEIGHT_LOGICAL) {
            calculatedPlayerScreenY = GAME_HEIGHT_LOGICAL - (mapHeight - playerWorldY) + offsetY_player_on_screen;
        }
        else {
            calculatedPlayerScreenY = (GAME_HEIGHT_LOGICAL / 2) - (frameHeight / 2) + offsetY_player_on_screen;
        }
    }
    setPlayerScreenPosition(calculatedPlayerScreenX, calculatedPlayerScreenY);
    // console.log(`Player Screen Position: (${calculatedPlayerScreenX}, ${calculatedPlayerScreenY})`); // Comentado para evitar lag
}
