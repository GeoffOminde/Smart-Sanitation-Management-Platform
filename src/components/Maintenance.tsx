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

    // Add Unit State
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newSerial, setNewSerial] = useState('');
    const [newLocation, setNewLocation] = useState('');

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resp = await apiFetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serialNo: newSerial,
                    location: newLocation,
                    fillLevel: 0,
                    batteryLevel: 100,
                    status: 'active',
                    coordinates: [-1.2921, 36.8219]
                })
            });
            if (resp.ok) {
                setShowAddUnit(false);
                setNewSerial('');
                setNewLocation('');
                fetchData();
                alert('Unit added successfully!');
            } else {
                alert('Failed to add unit');
            }
        } catch { alert('Error adding unit'); }
    };

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-orange-100 font-medium text-sm uppercase tracking-wide">Scheduled</p>
                                <h3 className="text-4xl font-extrabold mt-1">{stats.scheduled}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-orange-100 font-medium">Jobs pending execution</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-emerald-100 font-medium text-sm uppercase tracking-wide">Completed</p>
                                <h3 className="text-4xl font-extrabold mt-1">{stats.completed}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-emerald-100 font-medium">Successfully resolved</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-rose-100 font-medium text-sm uppercase tracking-wide">Critical</p>
                                <h3 className="text-4xl font-extrabold mt-1">{stats.critical}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <AlertTriangle className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-rose-100 font-medium">Require immediate attention</p>
                    </div>
                </div>
            </div>

            {/* Schedule Form */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-xl font-bold text-gray-900">Schedule New Maintenance</h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-gray-700">Target Unit</label>
                                <button
                                    type="button"
                                    onClick={() => setShowAddUnit(true)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
                                >
                                    <Plus className="w-3 h-3" /> New Unit
                                </button>
                            </div>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 transition-all"
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                                required
                            >
                                <option value="">Select Unit...</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.serialNo} - {u.location}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Maintenance Type</label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 transition-all"
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 transition-all"
                                rows={3}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Describe the issue or task details..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduled Date</label>
                            <input
                                type="date"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 transition-all"
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Technician ID</label>
                            <input
                                type="text"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 transition-all"
                                value={technicianId}
                                onChange={e => setTechnicianId(e.target.value)}
                                placeholder="e.g. TECH-001"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform active:scale-95"
                            >
                                Schedule Maintenance
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Logs List Used as Table */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Maintenance Logs</h3>
                            <p className="text-xs text-gray-500">History and active tasks</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            {['all', 'scheduled', 'completed'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <button
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black flex items-center text-sm font-medium shadow-lg shadow-gray-900/20 transition-all"
                            onClick={() => setShowForm(!showForm)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Task
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Details</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                                            Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No maintenance logs found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.completedDate ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    <CheckCircle className="w-3 h-3 mr-1.5" /> Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                    <Calendar className="w-3 h-3 mr-1.5" /> Scheduled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{log.unit?.serialNo || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{log.unit?.location}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${log.type === 'Emergency' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                            {new Date(log.scheduledDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.technicianId ? (
                                                <span className="flex items-center gap-1">
                                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {log.technicianId.charAt(0)}
                                                    </div>
                                                    {log.technicianId}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!log.completedDate && (
                                                    <button
                                                        onClick={() => handleComplete(log.id)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Mark as Complete"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            {/* Add Unit Modal */}
            {showAddUnit && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Unit</h3>
                        <form onSubmit={handleAddUnit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newSerial}
                                    onChange={e => setNewSerial(e.target.value)}
                                    placeholder="e.g. ST-005"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location / Area</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newLocation}
                                    onChange={e => setNewLocation(e.target.value)}
                                    placeholder="e.g. Market St."
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUnit(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                                >
                                    Add Unit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
