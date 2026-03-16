import config from "../config";
import httpService from "./httpService";

const CATALOG_API_URL = (config as any).catalogUrl || `${(config as any).apiBaseUrl}/catalog`;

const navigationService = {
    // ─── Get Navigation Data ─────────────────────────────────
    getNavigationData: async () => {
        try {
            const response = await httpService.get(
                `${CATALOG_API_URL}/navigation-data/`
            );
            const data = response.data;
            return {
                subjects: data.subjects || [],
                navbarProductGroups: data.navbar_product_groups?.results || [],
                distanceLearningData: data.distance_learning_dropdown?.results || [],
                tutorialData: data.tutorial_dropdown?.results || null,
            };
        } catch (error: any) {
            console.error("Error fetching navigation data:", error);
            throw {
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to fetch navigation data",
                status: error.response?.status || 0,
                data: error.response?.data || null,
            };
        }
    },
};

export default navigationService;
