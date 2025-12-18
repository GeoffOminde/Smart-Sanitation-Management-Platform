export type UserRole = 'admin' | 'manager' | 'technician' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  joinDate?: string;
  lastLogin?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface Unit {
  id: string;
  serialNo: string;
  location: string;
  fillLevel: number;
  batteryLevel: number;
  status: 'active' | 'maintenance' | 'offline';
  lastSeen: string;
  coordinates: [number, number];
  lastMaintenance?: string;
  nextMaintenance?: string;
  model?: string;
  capacity?: number;
  installationDate?: string;
}

export interface Booking {
  id: string;
  customer: string;
  unit: string;
  date: string;
  duration: string;
  amount: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  link?: string;
}

export type StatusType = 'active' | 'maintenance' | 'offline';
