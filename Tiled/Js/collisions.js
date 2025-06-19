// js/collisions.js

// Función auxiliar para calcular el producto escalar (dot product)
function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}

// Función auxiliar para normalizar un vector
function normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    if (length === 0) return { x: 0, y: 0 }; 
    return { x: v.x / length, y: v.y / length };
}

// Función auxiliar para obtener las aristas de un polígono
function getEdges(polygon) {
    const edges = [];
    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length]; 
        edges.push({ x: p2.x - p1.x, y: p2.y - p1.y });
    }
    return edges;
}

// Función auxiliar para obtener los ejes de proyección (normales a las aristas)
function getProjectionAxes(polygon) {
    const axes = [];
    const edges = getEdges(polygon);
    for (const edge of edges) {
        axes.push(normalize({ x: -edge.y, y: edge.x }));
    }
    return axes;
}

// Función auxiliar para proyectar un polígono sobre un eje
function projectPolygon(polygon, axis) {
    if (!polygon || polygon.length === 0 || !axis || (axis.x === 0 && axis.y === 0)) {
        return { min: Infinity, max: -Infinity }; 
    }

    let min = dotProduct(polygon[0], axis);
    let max = min;
    for (let i = 1; i < polygon.length; i++) {
        const p = polygon[i];
        const projection = dotProduct(p, axis);
        if (projection < min) {
            min = projection;
        } else if (projection > max) {
            max = projection;
        }
    }
    return { min, max };
}

/**
 * Función principal de detección de colisiones usando el Algoritmo de Separación de Ejes (SAT).
 * Retorna true si hay colisión entre polygonA y polygonB, false si no.
 * Ambos polígonos deben ser arrays de objetos { x: number, y: number }.
 */
export function checkCollision(polygonA, polygonB) {
    if (!polygonA || polygonA.length < 3 || !polygonB || polygonB.length < 3) {
        return false;
    }

    const axes = [...getProjectionAxes(polygonA), ...getProjectionAxes(polygonB)];

    for (const axis of axes) {
        if (axis.x === 0 && axis.y === 0) continue;

        const projectionA = projectPolygon(polygonA, axis);
        const projectionB = projectPolygon(polygonB, axis);

        if (projectionA.max < projectionB.min || projectionB.max < projectionA.min) {
            return false;
        }
    }
    return true;
}
