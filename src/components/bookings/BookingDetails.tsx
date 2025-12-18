import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, Clock, Calendar, Phone, Mail, User, Building, CreditCard } from 'lucide-react';
import { useBookings } from '../../contexts/BookingContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Booking } from '../../types/booking';
import BookingForm from './BookingForm';

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBooking, deleteBooking, updateBooking } = useBookings();
  const { formatCurrency } = useSettings();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getBooking(id);
        setBooking(data);
      } catch (err) {
        setError('Failed to load booking details');
        console.error('Error loading booking:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [id, getBooking]);

  const handleDelete = async () => {
    if (!id) return;

    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBooking(id);
      navigate('/dashboard', { state: { tab: 'bookings' } });
    } catch (err) {
      setError('Failed to delete booking');
      console.error('Error deleting booking:', err);
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: Booking['status']) => {
    if (!id || !booking) return;

    try {
      const updatedBooking = await updateBooking(id, { status: newStatus });
      setBooking(updatedBooking);
    } catch (err) {
      setError('Failed to update booking status');
      console.error('Error updating booking status:', err);
    }
  };

  const handleUpdateSuccess = (updatedBooking: Booking) => {
    setBooking(updatedBooking);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Booking not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested booking could not be found.</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/dashboard', { state: { tab: 'bookings' } })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="-ml-1 mr-2 h-5 w-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => setIsEditing(false)}
            className="mr-4 p-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Edit Booking</h2>
        </div>
        <BookingForm
          bookingId={booking.id}
          onSuccess={() => handleUpdateSuccess(booking)}
        />
      </div>
    );
  }

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'PPP');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusText = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      'in-progress': 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'
        }`}>
        {statusText[status as keyof typeof statusText] || status}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <button
            onClick={() => navigate('/dashboard', { state: { tab: 'bookings' } })}
            className="mr-4 p-1 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="-ml-0.5 mr-2 h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="-ml-0.5 mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Booking #{booking.id.substring(0, 8).toUpperCase()}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Created on {formatDate(booking.createdAt)}
              </p>
            </div>
            <div className="mt-2 sm:mt-0">
              {getStatusBadge(booking.status)}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            {/* Customer Information */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Customer Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="font-medium">{booking.customer.name}</span>
                </div>
                <div className="flex items-center mb-2">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  <a href={`mailto:${booking.customer.email}`} className="text-blue-600 hover:underline">
                    {booking.customer.email}
                  </a>
                </div>
                <div className="flex items-center mb-2">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <a href={`tel:${booking.customer.phone}`} className="text-gray-900">
                    {booking.customer.phone}
                  </a>
                </div>
                {booking.customer.organization && (
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900">{booking.customer.organization}</span>
                  </div>
                )}
              </dd>
            </div>

            {/* Booking Details */}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Booking Details</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center mb-2">
                  <Building className="h-5 w-5 text-gray-400 mr-2" />
                  <span>
                    <span className="font-medium">{booking.unit.name}</span>
                    <span className="text-gray-500 ml-2">({booking.unit.type})</span>
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span>
                    {formatDate(booking.dateRange.start)} to {formatDate(booking.dateRange.end)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span>
                    {Math.ceil(
                      (new Date(booking.dateRange.end).getTime() - new Date(booking.dateRange.start).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )} days
                  </span>
                </div>
              </dd>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Payment Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center mb-2">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                  <span>
                    {formatCurrency(booking.payment.amount)}
                    <span className="text-gray-500 ml-2">
                      ({booking.payment.status.charAt(0).toUpperCase() + booking.payment.status.slice(1)})
                    </span>
                  </span>
                </div>
                {booking.payment.method && (
                  <div className="text-gray-700 ml-7">
                    Paid via {booking.payment.method}
                    {booking.payment.transactionId && (
                      <span className="text-gray-500 ml-2">(Ref: {booking.payment.transactionId})</span>
                    )}
                  </div>
                )}
              </dd>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="bg-gray-50 p-3 rounded-md">
                    {booking.notes}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Status Actions */}
        <div className="px-4 py-4 bg-gray-50 sm:px-6">
          <div className="flex flex-wrap gap-2 justify-end">
            {booking.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusChange('confirmed')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CheckCircle className="-ml-0.5 mr-2 h-4 w-4" />
                  Confirm Booking
                </button>
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XCircle className="-ml-0.5 mr-2 h-4 w-4" />
                  Cancel Booking
                </button>
              </>
            )}

            {booking.status === 'confirmed' && (
              <button
                onClick={() => handleStatusChange('in-progress')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Clock className="-ml-0.5 mr-2 h-4 w-4" />
                Mark as In Progress
              </button>
            )}

            {booking.status === 'in-progress' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircle className="-ml-0.5 mr-2 h-4 w-4" />
                Mark as Completed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;
