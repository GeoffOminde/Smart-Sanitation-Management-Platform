export interface Booking {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    organization?: string;
  };
  unit: {
    id: string;
    type: string;
    name: string;
  };
  dateRange: {
    start: Date | string;
    end: Date | string;
  };
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  payment: {
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'refunded' | 'failed';
    method?: 'mpesa' | 'card' | 'bank';
    transactionId?: string;
  };
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UnitType {
  id: string;
  name: string;
  description: string;
  dailyRate: number;
  capacity: number;
  features: string[];
  imageUrl?: string;
}

export type SortField = 'customer.name' | 'dateRange.start' | 'status' | 'payment.amount';
export type SortDirection = 'asc' | 'desc';

export interface BookingFilters {
  status?: Booking['status'][];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  searchQuery?: string;
}
