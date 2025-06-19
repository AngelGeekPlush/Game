// js/player.js

import { loadImage } from './utils.js';
import { PLAYER_SPRITE_PATHS, BASE_PLAYER_SPEED, DIAGONAL_SPEED_FACTOR, PLAYER_FRAME_INTERVAL, tileSizeX, tileSizeY } from './constants.js';
import { keysPressed, joystick } from './input.js';
import { cameraX, cameraY } from './camera.js'; 
// Variables globales para el jugador (¡IMPORTANTE: Usar 'let' para que puedan ser reasignadas!)
export let playerWorldX = 0;
export let playerWorldY = 0;
export let playerScreenX;
export let playerScreenY;

export let currentDirection = 'down';
export let frameWidth, frameHeight;
export let frameIndex = 0;
export let frameTimer = 0;

export const playerSprites = {};

export async function loadPlayerSprites() {
    const loadPromises = [];
    for (const name in PLAYER_SPRITE_PATHS) {
        loadPromises.push(loadImage(PLAYER_SPRITE_PATHS[name]).then(img => {
            playerSprites[name] = img;
        }));
    }
    await Promise.all(loadPromises);

    if (playerSprites.down && playerSprites.down.width && playerSprites.down.height) {
        frameWidth = playerSprites.down.width / 4;
        frameHeight = playerSprites.down.height;
    } else {
        console.error("playerSprites.down no se cargó correctamente o tiene dimensiones inválidas. Usando valores por defecto.");
        frameWidth = 48;
        frameHeight = 68;
    }
}

export function updatePlayer(deltaTime)  {
    let dx = 0;
    let dy = 0;
    let speed = BASE_PLAYER_SPEED * deltaTime;
    let moving = false;


   // console.log(`[Player.js] dx: ${dx}, dy: ${dy}, moving: ${moving}`); // <--- AÑADE ESTA LÍNEA AQUÍ
   // console.log(`[Player.js] playerWorldX: ${playerWorldX}, playerWorldY: ${playerWorldY}`); // <--- Y ESTA LÍNEA AQUÍ (para ver la posición antes del cálculo)


    let newPlayerWorldX = playerWorldX; // Declaración inicial
    let newPlayerWorldY = playerWorldY; // Declaración inicial

    if (joystick.active) {
        const deltaX = joystick.currentX - joystick.baseX;
        const deltaY = joystick.currentY - joystick.baseY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > 0) {
            dx = deltaX / distance;
            dy = deltaY / distance;
        }

        if (distance > joystick.radius) {
            joystick.currentX = joystick.baseX + dx * joystick.radius;
            joystick.currentY = joystick.baseY + dy * joystick.radius;
        }

        const force = Math.min(distance, joystick.radius) / joystick.radius;
        speed *= force;
        moving = force > 0.05;
    } else {
        if (keysPressed['ArrowUp'] || keysPressed['w']) { dy -= 1; moving = true; }
        if (keysPressed['ArrowDown'] || keysPressed['s']) { dy += 1; moving = true; }
        if (keysPressed['ArrowLeft'] || keysPressed['a']) { dx -= 1; moving = true; }
        if (keysPressed['ArrowRight'] || keysPressed['d']) { dx += 1; moving = true; }

        if (moving && dx !== 0 && dy !== 0) {
            speed *= DIAGONAL_SPEED_FACTOR;
        }
    }

    if (moving) {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx >= absDy) {
        if (dx < 0) {
            currentDirection = 'left';
        } else {
            currentDirection = 'right';
        }
    } else {
        if (dy < 0) {
            currentDirection = 'up';
        } else {
            currentDirection = 'down';
        }
    }

    frameTimer += deltaTime * 60;
    if (frameTimer >= PLAYER_FRAME_INTERVAL) {
        frameIndex = (frameIndex + 1) % 4;
        frameTimer = 0;
    }

    // ¡LA CORRECCIÓN CLAVE AQUÍ!: QUITAMOS EL 'let'
    newPlayerWorldX = playerWorldX + (dx * speed); // <--- ¡QUITA EL 'let' de aquí!
    newPlayerWorldY = playerWorldY + (dy * speed); // <--- ¡QUITA EL 'let' de aquí!

    // Los comentarios sobre clamping y asignación directa se mantienen como guías
    // (no son código ejecutable)
} else {
    frameIndex = 0;
    frameTimer = 0;
}

return { x: newPlayerWorldX, y: newPlayerWorldY };
}

export function drawPlayer(ctx) {
    const currentSprite = playerSprites[currentDirection];

    if (currentSprite && currentSprite.complete && frameWidth && frameHeight && playerScreenX !== undefined && playerScreenY !== undefined) {
        ctx.drawImage(
            currentSprite,
            frameWidth * frameIndex, 0,
            frameWidth, frameHeight,
            playerScreenX, playerScreenY,
            frameWidth, frameHeight
        );
    } else {
        console.warn("No se pudo dibujar el personaje. Estado:", {
            currentSprite: currentSprite ? 'Cargado' : 'No cargado',
            complete: currentSprite ? currentSprite.complete : 'N/A',
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            playerScreenX: playerScreenX,
            playerScreenY: playerScreenY
        });
        ctx.fillStyle = 'red';
        ctx.fillRect(playerScreenX, playerScreenY, frameWidth || 64, frameHeight || 64);
    }
}

// Funciones para setear las posiciones de pantalla del jugador (llamadas desde camera.js)
export function setPlayerScreenPosition(x, y) {
    playerScreenX = x;
    playerScreenY = y;
}

// Función para setear la posición inicial del jugador (llamada desde game.js)
export function setInitialPlayerWorldPosition(x, y, mapWidthPixels, mapHeightPixels) {
    playerWorldX = Math.max(0, Math.min(x, mapWidthPixels - (frameWidth || 0)));
    playerWorldY = Math.max(0, Math.min(y, mapHeightPixels - (frameHeight || 0)));
}

// Función para obtener el polígono del jugador para colisiones
export function getPlayerPolygon() {
    const visualWidth = frameWidth || 64;  // Ancho original del frame
    const visualHeight = frameHeight || 64; // Alto original del frame

    // --- Ajusta el tamaño de la caja de colisión aquí ---
    const colliderWidth = visualWidth * 0.7;  // Por ejemplo, 70% del ancho visual
    const colliderHeight = visualHeight * 0.3; // Por ejemplo, 60% del alto visual (para no incluir la cabeza)

    // --- Ajusta la posición de la caja de colisión en relación al sprite ---
    // Esto moverá la caja hacia abajo, para que no colisione la cabeza
    const offsetX = (visualWidth - colliderWidth) / 2; // Centrar horizontalmente si cambias el ancho
    const offsetY = visualHeight * 0.65;  // Empujar hacia abajo, por ejemplo, 40% del alto visual

    // Calcula las coordenadas del polígono de colisión
    const colliderWorldX = playerWorldX + offsetX;
    const colliderWorldY = playerWorldY + offsetY;

    return [
        { x: colliderWorldX, y: colliderWorldY },
        { x: colliderWorldX + colliderWidth, y: colliderWorldY },
        { x: colliderWorldX + colliderWidth, y: colliderWorldY + colliderHeight },
        { x: colliderWorldX, y: colliderWorldY + colliderHeight }
    ];
}

// ¡NUEVA FUNCIÓN!: Exportar la función de depuración para el colisionador del jugador
export function debugDrawPlayerCollider(ctx) {
    const playerPoly = getPlayerPolygon(); // Obtiene el polígono con las dimensiones y offsets del colisionador

    if (!playerPoly || playerPoly.length < 3) {
        console.warn("[PlayerColliderDebug] Player polygon is invalid or too small.");
        return; 
    }

    // Calcula las dimensiones y la posición de la caja delimitadora del polígono de colisión
    // para dibujarla correctamente.
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of playerPoly) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    const colliderDrawX = minX - cameraX;
    const colliderDrawY = minY - cameraY;
    const colliderDrawWidth = maxX - minX;
    const colliderDrawHeight = maxY - minY;

    // Configurar el estilo
    ctx.strokeStyle = 'lime'; 
    ctx.lineWidth = 2;

    // Dibuja un rectángulo con esquinas redondeadas usando las dimensiones calculadas del colisionador
    const cornerRadius = 8; // Puedes ajustar este valor para más o menos redondeo

    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(colliderDrawX, colliderDrawY, colliderDrawWidth, colliderDrawHeight, cornerRadius);
    } else {
        // Fallback para navegadores antiguos
        ctx.rect(colliderDrawX, colliderDrawY, colliderDrawWidth, colliderDrawHeight);
        console.warn("ctx.roundRect no soportado, dibujando colisionador rectangular.");
    }
    ctx.stroke();
}

/**
 * Establece la posición mundial del jugador (se llama al inicio y para teletransportes/colisiones).
 * Aplica clamping a los límites del mapa.
 * @param {number} x - Posición X deseada en el mundo.
 * @param {number} number} y - Posición Y deseada en el mundo.
 * @param {number} mapWidthPixels - Ancho total del mapa en píxeles.
 * @param {number} mapHeightPixels - Alto total del mapa en píxeles.
 */
export function setPlayerWorldPosition(x, y, mapWidthPixels, mapHeightPixels) {
    // ¡CORRECCIÓN DE SINTAXIS EN EL LOG!
   // console.log(`[setPlayerWorldPosition] Received: X=<span class="math-inline">\{x\}, Y\=</span>{y}. Map: W=<span class="math-inline">\{mapWidthPixels\}, H\=</span>{mapHeightPixels}`); 

    if (mapWidthPixels !== undefined && mapHeightPixels !== undefined && frameWidth !== undefined && frameHeight !== undefined) {
        playerWorldX = Math.max(0, Math.min(x, mapWidthPixels - (frameWidth || 0)));
        playerWorldY = Math.max(0, Math.min(y, mapHeightPixels - (frameHeight || 0)));
    } else {
        playerWorldX = x;
        playerWorldY = y;
    }
    // ¡CORRECCIÓN DE SINTAXIS EN EL LOG!
   // console.log(`[setPlayerWorldPosition] Set playerWorldX=<span class="math-inline">\{playerWorldX\}, playerWorldY\=</span>{playerWorldY} (after clamping)`);
}