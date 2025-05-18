// src/utils/formatModelName.js
import i18next from 'i18next';

export const formatModelName = (model) => {
    const lowerCaseModel = model.toLowerCase();
    if (lowerCaseModel.includes('gizmo')) {
        return i18next.t('models.customGpt');
    }
    if (lowerCaseModel.includes('exception')) {
        return i18next.t('models.notFound');
    }
    return model;
};
