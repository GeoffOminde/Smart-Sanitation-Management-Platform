import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle, AlertTriangle, Clock, Plus, Trash2, Calendar } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface MaintenanceLog {
    id: string;
    unitId: string;
    unit: { serialNo: string; location: string };
    type: string;
    description: string;
    scheduledDate: string;
    completedDate?: string;
    technicianId?: string;
}

interface Unit {
    id: string;
    serialNo: string;
    location: string;
}

const Maintenance = () => {
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

    // Form state
    const [unitId, setUnitId] = useState('');
    const [type, setType] = useState('Routine');
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [technicianId, setTechnicianId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsResp, unitsResp] = await Promise.all([
                apiFetch('/api/maintenance'),
                apiFetch('/api/units')
            ]);

            if (logsResp.ok) {
                const data = await logsResp.json();
                setLogs(Array.isArray(data) ? data : []);
            }

            if (unitsResp.ok) {
                const data = await unitsResp.json();
                setUnits(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch maintenance data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resp = await apiFetch('/api/maintenance', {
                method: 'POST',
                data: { unitId, type, description, scheduledDate, technicianId }
            });

            if (resp.ok) {
                setShowForm(false);
                resetForm();
                fetchData();
            } else {
                alert('Failed to schedule maintenance');
            }
        } catch (err) {
            console.error(err);
            alert('Error scheduling maintenance');
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this maintenance as completed?')) return;
        try {
            const resp = await apiFetch(`/api/maintenance/${id}/complete`, { method: 'PUT' });
            if (resp.ok) fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this maintenance log?')) return;
        try {
            const resp = await apiFetch(`/api/maintenance/${id}`, { method: 'DELETE' });
            if (resp.ok) fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setUnitId('');
        setType('Routine');
        setDescription('');
        setScheduledDate('');
        setTechnicianId('');
    };

    // Calculate stats
    const stats = {
        scheduled: logs.filter(log => !log.completedDate).length,
        completed: logs.filter(log => log.completedDate).length,
        critical: logs.filter(log => log.type === 'Emergency' && !log.completedDate).length
    };

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        if (filter === 'scheduled') return !log.completedDate;
        if (filter === 'completed') return !!log.completedDate;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Maintenance Overview</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-yellow-50 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-yellow-800 mb-1">Scheduled</h4>
                                <p className="text-2xl font-bold text-yellow-900">{stats.scheduled}</p>
                                <p className="text-xs text-yellow-700">Jobs pending</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-green-800 mb-1">Completed</h4>
                                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                                <p className="text-xs text-green-700">This month</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-red-800 mb-1">Critical</h4>
                                <p className="text-2xl font-bold text-red-900">{stats.critical}</p>
                                <p className="text-xs text-red-700">Needs attention</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Schedule New Maintenance</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select
                                className="w-full border rounded-md px-3 py-2"
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                required
                            >
                                <option value="">Select Unit</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.serialNo} - {u.location}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                className="w-full border rounded-md px-3 py-2"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="Routine">Routine Check</option>
                                <option value="Repair">Repair</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Emergency">Emergency</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className="w-full border rounded-md px-3 py-2"
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe the issue or task..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                            <input
                                type="date"
                                className="w-full border rounded-md px-3 py-2"
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Technician ID (Optional)</label>
                            <input
                                type="text"
                                className="w-full border rounded-md px-3 py-2"
                                value={technicianId}
                                onChange={e => setTechnicianId(e.target.value)}
                                placeholder="e.g. TECH-001"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Schedule
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Logs List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold text-gray-900">Maintenance Logs</h3>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filter === 'scheduled' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setFilter('scheduled')}
                            >
                                Active
                            </button>
                            <button
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filter === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setFilter('completed')}
                            >
                                History
                            </button>
                        </div>
                    </div>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Task
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No maintenance logs found. Schedule one above.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.completedDate ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <Calendar className="w-3 h-3 mr-1" /> Scheduled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{log.unit?.serialNo || 'Unknown'}</div>
                                            <div className="text-sm text-gray-500">{log.unit?.location}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{log.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.scheduledDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.technicianId || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {!log.completedDate && (
                                                    <button
                                                        onClick={() => handleComplete(log.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Mark as Complete"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
