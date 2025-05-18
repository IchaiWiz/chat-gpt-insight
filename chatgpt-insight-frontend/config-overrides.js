// config-overrides.js
const { override, fixBabelImports, addLessLoader } = require('customize-cra');

module.exports = override(
    fixBabelImports('import', {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: true, // Charge les fichiers Less
    }),
    addLessLoader({
        javascriptEnabled: true,
        modifyVars: {
            '@primary-color': '#1f1f1f', // Couleur principale sombre
            '@link-color': '#722ed1',
            '@font-family': 'Roboto, sans-serif',
            '@border-radius-base': '8px',
            // Variables de typographie ajoutées
            '@font-size-base': '16px',
            '@font-size-lg': '18px',
            '@font-size-sm': '14px',
            '@heading-color': '#ffffff',
            '@text-color': '#ffffff',
            // Variables pour le thème sombre
            '@background-color-base': '#141414',
            '@component-background': '#1f1f1f',
            '@border-color-base': '#434343'
        },
    })
);
