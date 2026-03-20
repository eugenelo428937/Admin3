import config from "../config";
import { createCrudService } from "./createCrudService";
import type { ExamSession } from "../types/examSession";

// Use catalog API endpoint (legacy /api/exam-sessions/ was removed during catalog consolidation)
const examSessionService = createCrudService<ExamSession>({
    apiUrl: `${(config as any).catalogUrl}/exam-sessions`,
    resourceName: "Exam Sessions",
});

export default examSessionService;
