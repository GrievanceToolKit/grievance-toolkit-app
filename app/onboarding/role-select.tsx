"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ROLE_OPTIONS = [
	{
		key: 'steward',
		label: 'Steward',
		icon: '🛠',
		desc: 'Access to full grievance features',
		color: 'bg-blue-600 text-white',
	},
	{
		key: 'member',
		label: 'Member',
		icon: '👤',
		desc: 'Limited access, witness statements',
		color: 'bg-gray-500 text-white',
	},
	{
		key: 'admin',
		label: 'Admin',
		icon: '👑',
		desc: 'Superuser access',
		color: 'bg-yellow-500 text-white',
	},
];

export default function RoleSelect() {
	const { user } = useUser();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [selected, setSelected] = useState<string | null>(null);

	const handleSelect = async (role: string) => {
		setSelected(role);
		setError('');
		setSuccess('');
		setLoading(true);

		try {
			// ✅ Clerk: Update publicMetadata
			const updatedUser = await user?.update({ publicMetadata: { role } });
			console.log("✅ Clerk metadata updated:", updatedUser?.publicMetadata);

			// ✅ Supabase: Sync role
			await fetch('/api/sync-role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role }),
			});

			setSuccess('Role updated! Redirecting...');
			setTimeout(() => router.push('/dashboard'), 1000);
		} catch (e: any) {
			console.error("❌ Failed to update role:", e);
			setError('Failed to update role.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
			<div className="bg-white rounded shadow p-8 w-full max-w-md">
				<h2 className="text-2xl font-bold mb-2 text-center">Choose Your Role</h2>
				<p className="text-gray-600 mb-6 text-center">You’ll receive 5 free submissions. You can upgrade later.</p>

				<div className="flex flex-col gap-4">
					{ROLE_OPTIONS.map((role) => (
						<button
							key={role.key}
							className={`flex items-center gap-3 py-3 px-4 rounded-lg border font-semibold text-lg justify-between transition-all duration-150 ${
								selected === role.key ? role.color : 'bg-gray-100 text-gray-800'
							} ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
							onClick={() => handleSelect(role.key)}
							disabled={loading}
						>
							<span className="flex items-center gap-2">
								<span className="text-2xl">{role.icon}</span>
								{role.label}
							</span>
							<span className="text-sm font-normal text-gray-700 dark:text-gray-200">{role.desc}</span>
						</button>
					))}
				</div>

				{error && <div className="text-red-600 mt-4 text-center">{error}</div>}
				{success && <div className="text-green-600 mt-4 text-center">{success}</div>}
			</div>
		</div>
	);
}
