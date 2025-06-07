"use client";

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Message type
type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
	'What violations apply?',
	'Recommend a remedy',
	'Draft a Step 1 letter',
];

export default function StewardAssistantPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const chatBottomRef = useRef<HTMLDivElement>(null);

	async function sendMessage(content: string) {
		setError(null);
		if (!content.trim()) return;
		setLoading(true);
		const newMessages: Message[] = [...messages, { role: 'user', content }];
		setMessages(newMessages);
		setInput('');
		try {
			const res = await fetch('/api/steward-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: newMessages }),
			});
			if (!res.ok) throw new Error('API error');
			const data = await res.json();
			if (!data.reply) throw new Error('No response from assistant');
			setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
		} catch (e) {
			setError('Failed to get response. Please try again.');
		} finally {
			setLoading(false);
			setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
		}
	}

	function handleSuggestion(s: string) {
		if (!loading) sendMessage(s);
	}

	function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
		setInput(e.clipboardData.getData('text'));
	}

	return (
		<div className="flex flex-col h-[100dvh] bg-zinc-950 text-gray-100">
			<div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full">
				<h1 className="text-2xl font-bold mb-4">Steward AI Assistant</h1>
				<div className="flex flex-wrap gap-2 mb-4">
					{SUGGESTIONS.map(s => (
						<Button key={s} size="sm" variant="outline" onClick={() => handleSuggestion(s)} disabled={loading}>
							{s}
						</Button>
					))}
				</div>
				<div className="space-y-4">
					{messages.length === 0 && !loading && (
						<div className="text-zinc-400 text-center">Start a conversation or use a suggestion…</div>
					)}
					{messages.map((msg, i) => (
						<div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
							<div className={
								'inline-block px-4 py-2 rounded-lg max-w-[90vw] md:max-w-lg ' +
								(msg.role === 'user' ? 'bg-blue-700 text-white' : 'bg-zinc-800 text-gray-100')
							}>
								{msg.content || <span className="text-zinc-400">(empty)</span>}
							</div>
						</div>
					))}
					{loading && (
						<div className="text-left">
							<div className="inline-block px-4 py-2 rounded-lg bg-zinc-800 animate-pulse text-gray-400">Thinking…</div>
						</div>
					)}
					<div ref={chatBottomRef} />
				</div>
			</div>
			<form
				className="w-full max-w-2xl mx-auto flex gap-2 p-4 bg-zinc-900 border-t border-zinc-800"
				onSubmit={e => {
					e.preventDefault();
					if (input.trim() && !loading) sendMessage(input.trim());
				}}
			>
				<textarea
					className="flex-1 rounded bg-zinc-800 p-2 text-gray-100 resize-none min-h-[44px] max-h-40 focus:outline-none"
					value={input}
					onChange={e => setInput(e.target.value)}
					onPaste={handlePaste}
					placeholder="Type or paste a grievance scenario…"
					disabled={loading}
				/>
				<Button type="submit" disabled={loading || !input.trim()}>Send</Button>
			</form>
			{error && <div className="text-center text-red-400 py-2">{error}</div>}
		</div>
	);
}
