import config from "../config";
import { createCrudService } from "./createCrudService";

const productVariationService = createCrudService({
    apiUrl: `${(config as any).catalogUrl}/product-variations`,
    resourceName: "product variations",
});

export default productVariationService;
