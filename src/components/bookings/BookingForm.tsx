import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format, addDays } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useBookings } from '../../contexts/BookingContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';

// Form validation schema
const bookingSchema = yup.object().shape({
  customerName: yup.string().required('Customer name is required'),
  customerEmail: yup.string().email('Invalid email').required('Email is required'),
  customerPhone: yup.string().required('Phone number is required'),
  organization: yup.string(),
  unitId: yup.string().required('Please select a unit'),
  startDate: yup.date().required('Start date is required'),
  endDate: yup
    .date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date'),
  notes: yup.string(),
  status: yup.string().required('Status is required'),
  payment: yup.object({
    amount: yup.number().required('Amount is required').positive('Amount must be positive'),
    currency: yup.string().required('Currency is required'),
    method: yup.string().required('Payment method is required'),
  }),
});

// Mock units data - replace with actual API call
const mockUnits = [
  { id: 'unit-1', name: 'UNIT-001', type: 'Standard Portable', dailyRate: 5000 },
  { id: 'unit-2', name: 'UNIT-002', type: 'Deluxe Portable', dailyRate: 7500 },
  { id: 'unit-3', name: 'UNIT-003', type: 'Wheelchair Accessible', dailyRate: 8500 },
];

interface BookingFormProps {
  bookingId?: string;
  onSuccess?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ bookingId, onSuccess }) => {
  const navigate = useNavigate();
  const { createBooking, updateBooking, getBooking } = useBookings();
  const { settings } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState(mockUnits);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const currencySymbols: Record<string, string> = {
    'KES': 'KES',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
  };
  const currencySymbol = currencySymbols[settings.currency] || 'KES';

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(bookingSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      organization: '',
      unitId: '',
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      notes: '',
      status: 'confirmed',
      payment: {
        amount: 0,
        currency: settings.currency,
        method: 'mpesa',
      },
    },
  });

  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchUnitId = watch('unitId');

  // Update currency when settings change
  useEffect(() => {
    setValue('payment.currency', settings.currency);
  }, [settings.currency, setValue]);

  // Calculate duration and update amount when dates or unit changes
  useEffect(() => {
    if (watchStartDate && watchEndDate && watchUnitId) {
      const days = Math.ceil(
        (new Date(watchEndDate).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const unit = units.find(u => u.id === watchUnitId);
      if (unit) {
        setSelectedUnit(unit);
        setValue('payment.amount', days * unit.dailyRate);
      }
    }
  }, [watchStartDate, watchEndDate, watchUnitId, units, setValue]);

  // Load booking data if in edit mode
  useEffect(() => {
    const loadBooking = async () => {
      if (bookingId) {
        try {
          const booking = await getBooking(bookingId);
          if (booking) {
            reset({
              ...booking,
              startDate: new Date(booking.dateRange.start),
              endDate: new Date(booking.dateRange.end),
            });
            setSelectedUnit(booking.unit);
          }
        } catch (err) {
          setError('Failed to load booking data');
          console.error(err);
        }
      }
    };

    loadBooking();
  }, [bookingId, getBooking, reset]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const bookingData = {
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
          organization: data.organization,
        },
        unit: {
          id: data.unitId,
          name: selectedUnit?.name || '',
          type: selectedUnit?.type || '',
        },
        dateRange: {
          start: data.startDate,
          end: data.endDate,
        },
        status: data.status,
        payment: {
          amount: data.payment.amount,
          currency: data.payment.currency,
          method: data.payment.method,
          status: 'pending',
        },
        notes: data.notes,
      };

      if (bookingId) {
        await updateBooking(bookingId, bookingData);
      } else {
        await createBooking(bookingData);
      }

      onSuccess ? onSuccess() : navigate('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the booking');
      console.error('Error saving booking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {bookingId ? 'Edit Booking' : 'New Booking'}
          </h3>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Customer Information */}
            <div className="sm:col-span-6 border-b border-gray-200 pb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h4>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <Controller
                    name="customerName"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        id="customerName"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.customerName ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      />
                    )}
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <Controller
                    name="customerEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="email"
                        id="customerEmail"
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.customerEmail ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      />
                    )}
                  />
                  {errors.customerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <Controller
                    name="customerPhone"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="tel"
                        id="customerPhone"
                        className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.customerPhone ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      />
                    )}
                  />
                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                    Organization
                  </label>
                  <Controller
                    name="organization"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        id="organization"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="sm:col-span-6 border-b border-gray-200 pb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Booking Details</h4>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="unitId" className="block text-sm font-medium text-gray-700">
                    Unit *
                  </label>
                  <Controller
                    name="unitId"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="unitId"
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.unitId ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      >
                        <option value="">Select a unit</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} - {unit.type}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.unitId && (
                    <p className="mt-1 text-sm text-red-600">{errors.unitId.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <select
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.status ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                  />
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date)}
                        className="w-full"
                        slotProps={{
                          textField: {
                            error: !!errors.startDate,
                            helperText: errors.startDate?.message,
                            className: 'w-full',
                          },
                        }}
                      />
                    )}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">
                    End Date *
                  </label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={(date) => field.onChange(date)}
                        minDate={watchStartDate}
                        className="w-full"
                        slotProps={{
                          textField: {
                            error: !!errors.endDate,
                            helperText: errors.endDate?.message,
                            className: 'w-full',
                          },
                        }}
                      />
                    )}
                  />
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        id="notes"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        {...field}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="sm:col-span-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h4>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount ({selectedUnit?.dailyRate ? `${selectedUnit.dailyRate} x ${Math.ceil((new Date(watchEndDate).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24))} days` : 'N/A'})
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
                    </div>
                    <Controller
                      name="payment.amount"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          className={`block w-full pl-12 pr-12 sm:text-sm rounded-md ${errors.payment?.amount ? 'border-red-300' : 'border-gray-300'
                            }`}
                          {...field}
                          disabled={!selectedUnit}
                        />
                      )}
                    />
                  </div>
                  {errors.payment?.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment.amount.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <Controller
                    name="payment.method"
                    control={control}
                    render={({ field }) => (
                      <select
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors.payment?.method ? 'border-red-300' : 'border-gray-300'
                          }`}
                        {...field}
                      >
                        <option value="mpesa">M-Pesa</option>
                        <option value="card">Credit Card</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                    )}
                  />
                  {errors.payment?.method && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment.method.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {bookingId ? 'Updating...' : 'Creating...'}
                </>
              ) : bookingId ? (
                'Update Booking'
              ) : (
                'Create Booking'
              )}
            </button>
          </div>
        </form>
      </div>
    </LocalizationProvider>
  );
};

export default BookingForm;
