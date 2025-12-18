import { Booking, BookingFilters } from '../types/booking';
import { apiFetch } from '../lib/api';

// Mock data for development
const mockBookings: Booking[] = [
  {
    id: '1',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+254712345678',
      organization: 'Acme Corp'
    },
    unit: {
      id: 'unit-1',
      type: 'Standard Portable',
      name: 'UNIT-001'
    },
    dateRange: {
      start: new Date('2023-12-15'),
      end: new Date('2023-12-18')
    },
    status: 'confirmed',
    payment: {
      amount: 15000,
      currency: 'KES',
      status: 'paid',
      method: 'mpesa',
      transactionId: 'MPE12345678'
    },
    notes: 'Deliver before 9 AM',
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-11-01')
  },
  // Add more mock data as needed
];

// Check if we're in development mode and should use mock data
// Force false to use real backend API for now since Dashboard uses it too
const useMockData = false; // import.meta.env.DEV;

const mapBookingFromApi = (b: any): Booking => ({
  id: b.id,
  customer: {
    name: b.customer || 'Unknown',
    email: '',
    phone: '',
    organization: ''
  },
  unit: {
    id: b.unit || 'unit-0',
    name: b.unit || 'Unknown',
    type: 'Standard'
  },
  dateRange: {
    start: new Date(b.date || Date.now()),
    end: new Date(b.date || Date.now())
  },
  status: b.status,
  payment: {
    amount: b.amount || 0,
    currency: 'KES',
    status: b.paymentStatus || 'pending',
    method: 'mpesa',
    transactionId: ''
  },
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date()
});

export const getBookings = async (filters?: BookingFilters): Promise<Booking[]> => {
  if (useMockData) {
    // Simple filtering for mock data
    return mockBookings.filter(booking => {
      if (!filters) return true;

      if (filters.status?.length && !filters.status.includes(booking.status)) {
        return false;
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          booking.customer.name.toLowerCase().includes(query) ||
          booking.unit.name.toLowerCase().includes(query) ||
          booking.customer.phone.includes(query)
        );
      }

      return true;
    });
  }

  const response = await apiFetch('/api/bookings');
  if (!response.ok) throw new Error('Failed to fetch bookings');
  const data = await response.json();

  return data.map(mapBookingFromApi);
};

export const getBooking = async (id: string): Promise<Booking> => {
  if (useMockData) {
    const booking = mockBookings.find(b => b.id === id);
    if (!booking) throw new Error('Booking not found');
    return booking;
  }

  const response = await apiFetch(`/api/bookings/${id}`);
  if (!response.ok) throw new Error('Failed to fetch booking');
  const data = await response.json();
  return mapBookingFromApi(data);
};

export const createBooking = async (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> => {
  if (useMockData) {
    const newBooking = {
      ...booking,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockBookings.push(newBooking);
    return newBooking;
  }

  const response = await apiFetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!response.ok) throw new Error('Failed to create booking');
  const data = await response.json();
  return mapBookingFromApi(data);
};

export const updateBooking = async (id: string, updates: Partial<Booking>): Promise<Booking> => {
  if (useMockData) {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Booking not found');

    const updatedBooking = {
      ...mockBookings[index],
      ...updates,
      updatedAt: new Date()
    };

    mockBookings[index] = updatedBooking;
    return updatedBooking;
  }

  const response = await apiFetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update booking');
  const data = await response.json();
  return mapBookingFromApi(data);
};

export const deleteBooking = async (id: string): Promise<void> => {
  if (useMockData) {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index !== -1) {
      mockBookings.splice(index, 1);
    }
    return;
  }

  const response = await apiFetch(`/api/bookings/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete booking');
};
