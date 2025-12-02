import React, { useState } from 'react';
import { Wrench, CheckCircle, AlertTriangle, Clock, Plus, Trash2 } from 'lucide-react';

interface MaintenanceLog {
    id: string;
    unitId: string;
    unitSerial: string;
    description: string;
    status: 'scheduled' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    scheduledDate: string;
    completedDate?: string;
    technician?: string;
}

const Maintenance: React.FC = () => {
    const [logs, setLogs] = useState<MaintenanceLog[]>([
        { id: '1', unitId: 'u1', unitSerial: 'ST-001', description: 'Filter replacement', status: 'scheduled', priority: 'medium', scheduledDate: '2024-03-20', technician: 'John Kamau' },
        { id: '2', unitId: 'u3', unitSerial: 'ST-003', description: 'Battery check', status: 'completed', priority: 'low', scheduledDate: '2024-03-15', completedDate: '2024-03-15', technician: 'Mary Wanjiku' },
        { id: '3', unitId: 'u4', unitSerial: 'ST-004', description: 'Sensor calibration', status: 'in-progress', priority: 'high', scheduledDate: '2024-03-18', technician: 'Peter Ochieng' },
        { id: '4', unitId: 'u2', unitSerial: 'ST-002', description: 'Full service', status: 'scheduled', priority: 'high', scheduledDate: '2024-03-22' },
        { id: '5', unitId: 'u1', unitSerial: 'ST-001', description: 'Cleaning', status: 'completed', priority: 'low', scheduledDate: '2024-03-10', completedDate: '2024-03-10' },
    ]);

    const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'in-progress': return 'text-blue-600 bg-blue-100';
            case 'scheduled': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const filteredLogs = logs.filter(l => filter === 'all' || l.status === filter || (filter === 'scheduled' && l.status === 'in-progress'));

    const stats = {
        scheduled: logs.filter(l => l.status === 'scheduled').length,
        completed: logs.filter(l => l.status === 'completed').length,
        critical: logs.filter(l => l.priority === 'high' && l.status !== 'completed').length,
    };

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
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm font-medium">
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Task
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Wrench className="w-4 h-4 text-gray-400 mr-3" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{log.unitSerial}</div>
                                                <div className="text-xs text-gray-500">ID: {log.unitId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(log.priority)}`}>
                                            {log.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.status === 'completed' ? log.completedDate : log.scheduledDate}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.technician || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-red-600 hover:text-red-900" onClick={() => setLogs(logs.filter(l => l.id !== log.id))}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
