// src/contexts/ConfigContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import httpService from "../services/httpService";

const ConfigContext = createContext({ isInternal: false });

export const ConfigProvider = ({ children }) => {
	const [isInternal, setIsInternal] = useState(false);

	useEffect(() => {
		httpService
			.get("/api/config/")
			.then((res) => {
				setIsInternal(res.data.internal === true);
			})
			.catch(() => {
				// Default to non-internal if config endpoint is unavailable
				setIsInternal(false);
			});
	}, []);

	return (
		<ConfigContext.Provider value={{ isInternal }}>
			{children}
		</ConfigContext.Provider>
	);
};

export const useConfig = () => useContext(ConfigContext);

export default ConfigContext;
