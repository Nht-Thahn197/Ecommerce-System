export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface LoginInput {
  identifier?: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface RefreshTokenInput {
  refresh_token: string;
}

export interface LogoutInput {
  refresh_token: string;
}
