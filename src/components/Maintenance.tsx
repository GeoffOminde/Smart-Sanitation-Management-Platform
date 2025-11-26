import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { Wrench, CheckCircle, Trash2, Calendar, AlertTriangle } from 'lucide-react';

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
                apiFetch('/api/units') // Assuming this endpoint exists or we need to add it/use existing
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Maintenance Schedule</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Wrench className="w-4 h-4 mr-2" /> Schedule Maintenance
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
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

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No maintenance logs found. Schedule one above.
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id}>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(log.scheduledDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.technicianId || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {!log.completedDate && (
                                            <button
                                                onClick={() => handleComplete(log.id)}
                                                className="text-green-600 hover:text-green-900 mr-3"
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
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Maintenance;
