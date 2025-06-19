// js/input.js

// Importar currentScale para los cálculos del joystick
let _currentScale = 1; 
let _canvas = null; 

export function initializeInput(canvasRef, currentScaleRef) {
    _canvas = canvasRef;
    _currentScale = currentScaleRef; 

    // Eventos táctiles
    _canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
       // console.log('[Input.js] Touchstart detectado!');
        const touch = e.touches[0];
        const canvasRect = _canvas.getBoundingClientRect();

        joystick.active = true;
        joystick.startX = (touch.clientX - canvasRect.left) / _currentScale;
        joystick.startY = (touch.clientY - canvasRect.top) / _currentScale;
        joystick.currentX = joystick.startX;
        joystick.currentY = joystick.startY;

        joystick.baseX = joystick.startX;
        joystick.baseY = joystick.startY;
       // console.log(`[Input.js] Joystick activo: <span class="math-inline">\{joystick\.active\}, Start\: \(</span>{joystick.startX}, ${joystick.startY})`); // <--- AÑADE ESTA LÍNEA
    }, { passive: false });

    _canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystick.active) return;
// console.log('[Input.js] Touchmove detectado!'); // <--- AÑADE ESTA LÍNEA
        const touch = e.touches[0];
        const canvasRect = _canvas.getBoundingClientRect();
        joystick.currentX = (touch.clientX - canvasRect.left) / _currentScale;
        joystick.currentY = (touch.clientY - canvasRect.top) / _currentScale;
       // console.log(`[Input.js] Joystick Current: (${joystick.currentX}, ${joystick.currentY})`); // <--- AÑADE ESTA LÍNEA
    }, { passive: false });

    _canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
       // console.log('[Input.js] Touchend detectado!'); // <--- AÑADE ESTA LÍNEA
        joystick.active = false;
        keysPressed = {};
    });

    _canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
       // console.log('[Input.js] Touchcancel detectado!'); // <--- AÑADE ESTA LÍNEA
        joystick.active = false;
        keysPressed = {};
    });

    // Eventos de teclado globales
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
            e.preventDefault();
        }
        keysPressed[e.key] = true;
       // console.log(`[Input.js] Keydown detectado: ${e.key}, keysPressed:`, keysPressed); // <--- AÑADE ESTA LÍNEA
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key] = false;
       //  console.log(`[Input.js] Keyup detectado: ${e.key}, keysPressed:`, keysPressed); // <--- AÑADE ESTA LÍNEA
    });
}

// Función para actualizar la escala (llamada desde game.js cuando cambia)
export function updateInputScale(newScale) {
    _currentScale = newScale;
}

export let keysPressed = {};

export let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    baseX: 0,
    baseY: 0,
    radius: 75,
    knobRadius: 40
};

export function drawJoystick(ctx) {
    if (joystick.active) {
        ctx.beginPath();
        ctx.arc(joystick.baseX, joystick.baseY, joystick.radius, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(joystick.currentX, joystick.currentY, joystick.knobRadius, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
    }
}
