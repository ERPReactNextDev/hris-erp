export interface User {
  id: number;
  ReferenceID: string;
  _hidden?: boolean;  // UI-only: annotated by /api/employees
  UserId?: string;
  Firstname?: string;
  Lastname?: string;
  Email?: string;
  userName?: string;
  Password?: string;
  Role?: string;
  TargetQuota?: string;
  Department?: string;
  Location?: string;
  Company?: string;
  Manager?: string;
  TSM?: string;
  Status?: string;
  createdAt?: Date;
  LockUntil?: string;
  LoginAttempts?: number;
  updatedAt?: Date;
  ContactNumber?: string;
  profilePicture?: string;
  Position?: string;
  FingerprintKey?: string;
  ManagerName?: string;
  TSMName?: string;
  DeviceId?: string;
  Address?: string;
  AnotherNumber?: string;
  Birthday?: string;
  Gender?: string;
  OtherEmail?: string;
  Connection?: string;
  signatureImage?: string;
  LastLoginAt?: Date;
  SecondaryEmail?: string;
  pin?: string;
  registrationMethod?: string;
  twoFactorEnabled?: boolean;
  otp?: string;
  otpExpiry?: Date;
  permissions?: any;
  credentials?: any;
  faceDescriptors?: any;
  faceVerificationEnabled?: boolean;
  Directories?: any;
  spf_owner?: boolean;
  type_of_sales?: string;
  tempTwoFactorSecret?: string;
  twoFactorSecret?: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  created_at?: string;
}

export interface PayrollCutoff {
  id: string;
  label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  created_at?: string;
}

export interface TaskLog {
  id: number;
  ReferenceID: string;
  Email?: string;
  Type?: string;
  Status?: string;
  Remarks?: string;
  TSM?: string;
  SiteVisitAccount?: string;
  date_created?: Date | string;
  Location?: string;
  Latitude?: string;
  Longitude?: string;
  PhotoURL?: string;
  Fullname?: string;
  DisplayLocation?: string;
}
