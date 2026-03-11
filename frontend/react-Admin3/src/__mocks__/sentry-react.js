// Mock for @sentry/react (not installed as dependency)
export const init = () => {};
export const captureException = () => {};
export const captureMessage = () => {};
export const setUser = () => {};
export const setTag = () => {};
export const withScope = (cb) => cb({ setExtra: () => {}, setLevel: () => {} });
export const Severity = { Error: 'error', Warning: 'warning', Info: 'info' };
export default { init, captureException, captureMessage, setUser, setTag, withScope, Severity };
