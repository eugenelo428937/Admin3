// src/contexts/ConfigContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import httpService from "../services/httpService";

const ConfigContext = createContext({ isInternal: false, configLoaded: false });

export const ConfigProvider = ({ children }) => {
	const [isInternal, setIsInternal] = useState(false);
	const [configLoaded, setConfigLoaded] = useState(false);

	useEffect(() => {
		httpService
			.get("/api/config/")
			.then((res) => {
				setIsInternal(res.data.internal === true);
			})
			.catch(() => {
				// Default to non-internal if config endpoint is unavailable
				setIsInternal(false);
			})
			.finally(() => {
				setConfigLoaded(true);
			});
	}, []);

	return (
		<ConfigContext.Provider value={{ isInternal, configLoaded }}>
			{children}
		</ConfigContext.Provider>
	);
};

export const useConfig = () => useContext(ConfigContext);

export default ConfigContext;
