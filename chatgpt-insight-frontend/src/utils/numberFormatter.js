// src/utils/numberFormatter.js

export const formatNumber = (num) => {
    if (num >= 1000000 || num <= -1000000) {
        return (num / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
    } else if (num >= 1000 || num <= -1000) {
        return (num / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'K';
    } else {
        return num.toLocaleString();
    }
};