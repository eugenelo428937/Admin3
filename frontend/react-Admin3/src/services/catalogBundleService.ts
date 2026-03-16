import config from "../config";
import { createCrudService } from "./createCrudService";

const catalogBundleService = createCrudService({
    apiUrl: `${(config as any).catalogUrl}/product-bundles`,
    resourceName: "catalog bundles",
});

export default catalogBundleService;
