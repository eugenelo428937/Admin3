// src/contexts/ConfigContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import httpService from "../services/httpService";

interface ConfigContextValue {
	isInternal: boolean;
	configLoaded: boolean;
	storefrontUrl: string;
}

interface ConfigProviderProps {
	children: ReactNode;
}

const ConfigContext = createContext<ConfigContextValue>({
	isInternal: false,
	configLoaded: false,
	storefrontUrl: "/",
});

// Build a storefront URL from a base URL + optional port.
// Skips the port when it matches the protocol default (80 for http, 443 for https).
// Falls back to "/" (same-origin) when the base URL is empty.
const buildStorefrontUrl = (url: string, port: string): string => {
	if (!url) return "/";
	if (!port) return url;

	const isHttps = url.startsWith("https://");
	const isHttp = url.startsWith("http://");
	const isDefaultPort =
		(isHttps && port === "443") || (isHttp && port === "80");

	return isDefaultPort ? url : `${url}:${port}`;
};

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
	const [isInternal, setIsInternal] = useState<boolean>(false);
	const [configLoaded, setConfigLoaded] = useState<boolean>(false);
	const [storefrontUrl, setStorefrontUrl] = useState<string>("/");

	useEffect(() => {
		httpService
			.get("/api/config/")
			.then((res: any) => {
				setIsInternal(res.data.internal === true);
				setStorefrontUrl(
					buildStorefrontUrl(
						res.data.storefront_url || "",
						res.data.storefront_port || ""
					)
				);
			})
			.catch(() => {
				// Default to non-internal if config endpoint is unavailable
				setIsInternal(false);
				setStorefrontUrl("/");
			})
			.finally(() => {
				setConfigLoaded(true);
			});
	}, []);

	return (
		<ConfigContext.Provider value={{ isInternal, configLoaded, storefrontUrl }}>
			{children}
		</ConfigContext.Provider>
	);
};

export const useConfig = (): ConfigContextValue => useContext(ConfigContext);

export default ConfigContext;
