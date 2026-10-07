import { Timestamp } from 'firebase/firestore';

export const PROFESSIONS = ['Advocate', 'Social Activist', 'Law Student'] as const;
export const CATEGORIES = ['SC', 'ST', 'OBC', 'General'] as const;
export const OTHER = 'Other';

export type ApplicationStatus = 'submitted' | 'reviewing' | 'accepted' | 'declined';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: 'Received',
  reviewing: 'Under review',
  accepted: 'Welcomed',
  declined: 'Not taken forward',
};

export interface ApplicationForm {
  name: string;
  currentCity: string;
  homeState: string;
  homeCity: string;
  profession: string;
  professionOther: string;
  education: string;
  caste: string;
  casteOther: string;
  linkedin: string;
  purpose: string;
  expertise: string;
  experience: string;
  contact: string;
  email: string;
  remarks: string;
}

export interface CvRef {
  cvPath: string;
  cvName: string;
}

export interface Application extends ApplicationForm, Partial<CvRef> {
  id: string;
  uid: string;
  status: ApplicationStatus;
  createdAt: Timestamp | null;
}

export interface Draft {
  form: Partial<ApplicationForm>;
  cv: CvRef | null;
  savedAt: number;
}

export interface Thread {
  id: string;
  name: string;
  email: string;
  lastMessage: string;
  lastFrom: 'user' | 'admin';
  lastAt: Timestamp | null;
  unreadForAdmin: boolean;
  unreadForUser: boolean;
}

export interface Message {
  id: string;
  from: 'user' | 'admin';
  text: string;
  at: Timestamp | null;
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export function toDate(t: Timestamp | null | undefined): Date | null {
  return t ? t.toDate() : null;
}
