import { Booking, BookingFilters } from '../types/booking';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Check if we're in development mode and should use mock data
const useMockData = import.meta.env.DEV;

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

  const response = await fetch(`${API_URL}/bookings`);
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

export const getBooking = async (id: string): Promise<Booking> => {
  if (useMockData) {
    const booking = mockBookings.find(b => b.id === id);
    if (!booking) throw new Error('Booking not found');
    return booking;
  }

  const response = await fetch(`${API_URL}/bookings/${id}`);
  if (!response.ok) throw new Error('Failed to fetch booking');
  return response.json();
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

  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });
  if (!response.ok) throw new Error('Failed to create booking');
  return response.json();
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

  const response = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update booking');
  return response.json();
};

export const deleteBooking = async (id: string): Promise<void> => {
  if (useMockData) {
    const index = mockBookings.findIndex(b => b.id === id);
    if (index !== -1) {
      mockBookings.splice(index, 1);
    }
    return;
  }

  const response = await fetch(`${API_URL}/bookings/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete booking');
};
