import config from "../config";
import { createCrudService } from "./createCrudService";

const recommendationService = createCrudService({
    apiUrl: `${(config as any).catalogUrl}/recommendations`,
    resourceName: "recommendations",
});

export default recommendationService;
