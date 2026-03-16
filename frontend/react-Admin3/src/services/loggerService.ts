const logLevels = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
} as const;

const loggerService = {
    debug: (message: string, data?: any) => {
        if (!import.meta.env?.PROD) {
            console.log(`${logLevels.DEBUG} ${message}`, data || "");
        }
    },
    info: (message: string, data?: any) => {
        if (!import.meta.env?.PROD) {
            console.info(`${logLevels.INFO} ${message}`, data || "");
        }
    },
    error: (message: string, data?: any) => {
        console.error(`${logLevels.ERROR} ${message}`, data || "");
    },
};

export default loggerService;
