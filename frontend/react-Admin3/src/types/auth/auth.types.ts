// Auth type definitions — fields match Django REST Framework API responses (snake_case)

// ─── Login / Authentication ──────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MachineLoginCredentials {
  machine_token: string;
}

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  refresh?: string;
  user: AuthUser;
}

export interface AuthResult {
  status: 'success' | 'error';
  message: string;
  user?: AuthUser;
  code?: number;
}

// ─── Registration ────────────────────────────────────────────────

export interface RegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  title?: string;
  mobile_phone?: string;
  home_phone?: string;
  [key: string]: any; // Additional profile fields from wizard
}

export interface RegistrationResult {
  status: 'success' | 'error';
  message: string;
  user?: AuthUser;
  code?: number;
}

// ─── Password Reset ──────────────────────────────────────────────

export interface PasswordResetRequestResult {
  status: 'success' | 'error';
  message: string;
  expiry_hours?: number;
}

export interface PasswordResetConfirmResult {
  status: 'success' | 'error';
  message: string;
}

// ─── Account Activation ──────────────────────────────────────────

export interface ActivationResult {
  status: 'success' | 'error' | 'info';
  message: string;
}

// ─── Email Verification ──────────────────────────────────────────

export interface EmailVerificationData {
  uid: string;
  token: string;
  new_email: string;
}

export interface EmailVerificationResult {
  status: 'success' | 'error';
  message: string;
}

// ─── Token ───────────────────────────────────────────────────────

export interface TokenRefreshResult {
  token: string;
  [key: string]: any;
}

// ─── Auth Context ────────────────────────────────────────────────

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (userData: RegistrationData) => Promise<RegistrationResult>;
  logout: (options?: { redirect?: boolean }) => Promise<void>;
  isSuperuser: boolean;
  isApprentice: boolean;
  isStudyPlus: boolean;
}
