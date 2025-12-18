import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Booking, BookingFilters, SortField, SortDirection } from '../types/booking';
import * as bookingService from '../services/bookingService';

interface BookingContextType {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  filters: BookingFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedBooking: Booking | null;
  fetchBookings: () => Promise<void>;
  getBooking: (id: string) => Promise<Booking>;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Booking>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<Booking>;
  deleteBooking: (id: string) => Promise<void>;
  setFilters: (filters: BookingFilters) => void;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setSelectedBooking: (booking: Booking | null) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({});
  const [sortField, setSortField] = useState<SortField>('dateRange.start');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookings(filters);
      
      // Apply sorting
      const sortedData = [...data].sort((a, b) => {
        const aValue = getNestedValue(a, sortField);
        const bValue = getNestedValue(b, sortField);
        
        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        const direction = sortDirection === 'asc' ? 1 : -1;
        return aValue > bValue ? direction : -direction;
      });
      
      setBookings(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, sortField, sortDirection]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getBooking = async (id: string): Promise<Booking> => {
    try {
      return await bookingService.getBooking(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch booking');
      throw err;
    }
  };

  const createBooking = async (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> => {
    try {
      const newBooking = await bookingService.createBooking(booking);
      await fetchBookings(); // Refresh the list
      return newBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
      throw err;
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>): Promise<Booking> => {
    try {
      const updatedBooking = await bookingService.updateBooking(id, updates);
      await fetchBookings(); // Refresh the list
      return updatedBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking');
      throw err;
    }
  };

  const deleteBooking = async (id: string): Promise<void> => {
    try {
      await bookingService.deleteBooking(id);
      await fetchBookings(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
      throw err;
    }
  };

  // Helper function to get nested object properties
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((o, p) => (o || {})[p], obj);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        loading,
        error,
        filters,
        sortField,
        sortDirection,
        selectedBooking,
        fetchBookings,
        getBooking,
        createBooking,
        updateBooking,
        deleteBooking,
        setFilters,
        setSortField,
        setSortDirection,
        setSelectedBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
};
