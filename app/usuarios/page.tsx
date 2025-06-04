'use client'; // ✅ Must be line 1!

import { useState } from 'react';

const mockUsers = [
  { name: 'Alice', role: 'Admin', email: 'alice@example.com', status: 'Active' },
  { name: 'Bob', role: 'Steward', email: 'bob@example.com', status: 'Inactive' },
  { name: 'Charlie', role: 'Member', email: 'charlie@example.com', status: 'Active' },
];

export default function UsersPage() {
  const [filter, setFilter] = useState('All');

  const filteredUsers =
    filter === 'All' ? mockUsers : mockUsers.filter((u) => u.role === filter);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">👥 User Management</h1>

      <div className="mb-4 flex gap-4">
        {['All', 'Admin', 'Steward', 'Member'].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-4 py-2 rounded text-sm font-medium border ${
              filter === role
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      u.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}