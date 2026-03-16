import * as Sentry from "@sentry/react";

export const initializeErrorTracking = () => {
    if (import.meta.env?.PROD) {
        Sentry.init({
            dsn: "your-sentry-dsn",
            environment: import.meta.env?.MODE,
        });
    }
};
