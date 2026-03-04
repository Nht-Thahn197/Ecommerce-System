export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refresh_token: string;
}

export interface LogoutInput {
  refresh_token: string;
}
