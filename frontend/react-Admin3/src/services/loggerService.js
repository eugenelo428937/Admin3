// src/services/loggerService.js
const logLevels = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
};

const loggerService = {
	debug: (message, data) => {
		if (!import.meta.env?.PROD) {
			console.log(`${logLevels.DEBUG} ${message}`, data || "");
		}
	},
	info: (message, data) => {
		if (!import.meta.env?.PROD) {
			console.info(`${logLevels.INFO} ${message}`, data || "");
		}
	},
	error: (message, data) => {
		console.error(`${logLevels.ERROR} ${message}`, data || "");
	},
};

export default loggerService;
