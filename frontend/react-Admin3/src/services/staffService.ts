import config from "../config";
import { createCrudService } from "./createCrudService";

const staffService = createCrudService({
    apiUrl: `${(config as any).userUrl}/staff`,
    resourceName: "staff",
});

export default staffService;
