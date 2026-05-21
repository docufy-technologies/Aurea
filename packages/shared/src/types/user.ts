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
