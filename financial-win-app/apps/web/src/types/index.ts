export type Theme = 'light' | 'dark';

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface Metric {
  label: string;
  value: string;
  trend: number; // percentage
  status: 'up' | 'down' | 'neutral';
}

export interface Client {
  id: string;
  name: string;
  sector: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  avatarInitials: string;
}

export type ViewState = 
  | 'dashboard' 
  | 'upload-invoice' 
  | 'tickets'
  | 'subscriptions'
  | 'billing' 
  | 'clients' 
  | 'suppliers' 
  | 'documents'
  | 'records'
  | 'ai-extraction';

export interface NavSubItem {
  label: string;
  action: string;
  icon?: string;
  subItems?: NavSubItem[];
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon: string;
  subItems?: NavSubItem[];
}
