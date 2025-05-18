// src/utils/costCalculations.js

export const calculateImageTokens = (modelSlug, width, height) => {
    const tilesWide = Math.ceil(width / 512);
    const tilesHigh = Math.ceil(height / 512);
    const tilesTotal = tilesWide * tilesHigh;

    if (modelSlug === 'gpt-4o') {
        return 85 + (170 * tilesTotal);
    } else if (modelSlug === 'gpt-4o-mini') {
        return 2833 + (5667 * tilesTotal);
    } else {
        console.warn(`Modèle inconnu pour le calcul des tokens d'image: ${modelSlug}`);
        return 0;
    }
};