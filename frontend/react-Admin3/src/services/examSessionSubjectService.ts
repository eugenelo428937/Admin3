import config from "../config";
import { createCrudService } from "./createCrudService";

const examSessionSubjectService = createCrudService({
    apiUrl: `${(config as any).catalogUrl}/exam-session-subjects`,
    resourceName: "exam session subjects",
});

export default examSessionSubjectService;
