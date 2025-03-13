// src/services/loggerService.js
const logLevels = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

const logger = {
    debug: (message, data = null) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, data || '');
        }
    },
    info: (message, data = null) => {
        console.info(`[INFO] ${message}`, data || '');
    },
    warning: (message, data = null) => {
        console.warn(`[WARNING] ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${message}`, error || '');
        // You could also send errors to an error tracking service like Sentry here
    }
};

export default logger;
