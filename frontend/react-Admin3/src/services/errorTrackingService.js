// src/services/errorTrackingService.js
import * as Sentry from "@sentry/react";

export const initializeErrorTracking = () => {
    if (process.env.NODE_ENV === 'production') {
        Sentry.init({
            dsn: "your-sentry-dsn",
            environment: process.env.NODE_ENV
        });
    }
};
