export interface RegisterInput {
  email: string;
  password?: string;
  fullName: string;
  mobile: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  identifier: string; // email or mobile
  password?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: UserDto;
  accessToken: string;
  expiresIn: number;
}
