// src/contexts/ConfigContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import httpService from "../services/httpService";

interface ConfigContextValue {
	isInternal: boolean;
	configLoaded: boolean;
}

interface ConfigProviderProps {
	children: ReactNode;
}

const ConfigContext = createContext<ConfigContextValue>({ isInternal: false, configLoaded: false });

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
	const [isInternal, setIsInternal] = useState<boolean>(false);
	const [configLoaded, setConfigLoaded] = useState<boolean>(false);

	useEffect(() => {
		httpService
			.get("/api/config/")
			.then((res: any) => {
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

export const useConfig = (): ConfigContextValue => useContext(ConfigContext);

export default ConfigContext;
