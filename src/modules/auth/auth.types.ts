import { CompanyType, OtpChannel, OtpPurpose, PlanCode, RegistrationKind, UserRole } from "@prisma/client";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginWithVerifiedOtpInput = {
  email: string;
  password: string;
  otpChallengeId: string;
};

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  otpChallengeId: string;
};

export type RegistrationStartInput = {
  kind: RegistrationKind;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

export type VerifyRegistrationOtpInput = {
  draftId: string;
  code: string;
};

export type CompleteJobSeekerRegistrationInput = {
  draftId: string;
  countryCode: string;
  city: string;
  headline?: string;
  yearsExperience?: number;
  availability?: string;
  preferredRoutes?: string[];
};

export type CompleteCompanyRegistrationInput = {
  draftId: string;
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  address: string;
  countryCode: string;
  city: string;
  vatNumber?: string;
  website?: string;
  contactPhone?: string;
  companyEmail?: string;
  planCode: PlanCode;
};

export type SessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type ForgotPasswordInput = {
  email: string;
  ipAddress?: string;
  userAgent?: string;
};

export type ResetPasswordInput = {
  otpChallengeId: string;
  newPassword: string;
  ipAddress?: string;
  userAgent?: string;
};

export type ChangePasswordInput = {
  userId?: string;
  currentPassword: string;
  newPassword: string;
  currentSessionId?: string;
};

export type RequestOtpInput = {
  purpose: OtpPurpose;
  channel: OtpChannel;
  email?: string;
  phone?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type VerifyOtpInput = {
  challengeId: string;
  code: string;
};

export type ResendOtpInput = {
  challengeId: string;
};

export type ListSessionsInput = {
  userId?: string;
  currentSessionId?: string;
};

export type RevokeSessionInput = {
  userId?: string;
  sessionId: string;
};

