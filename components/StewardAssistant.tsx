"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function StewardAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    setError(null);
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/steward-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, role: "steward" }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.response && typeof data.response === "string") {
        setMessages([...newMessages, { role: "assistant" as const, content: data.response }]);
      } else if (data.error) {
        setMessages([...newMessages, { role: "assistant" as const, content: `⚠️ ${data.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant" as const, content: "⚠️ Unexpected empty response from AI." }]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant" as const, content: "⚠️ Error contacting the AI." },
      ]);
      setError("Failed to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Allow Shift+Enter for newline, Enter for send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-50 dark:bg-zinc-900">
      <div className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Steward Assistant</div>
      <div className="flex-1 overflow-y-auto border p-4 rounded-md bg-white dark:bg-zinc-800 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap p-3 rounded-lg max-w-max-w-[70%] ${
              msg.role === "user"
                ? "bg-blue-100 dark:bg-blue-900 self-end text-right"
                : "bg-gray-100 dark:bg-zinc-700 self-start text-left"
            }`}
          >
            <span className="text-sm text-zinc-600 dark:text-zinc-300 font-medium block mb-1">
              {msg.role === "user" ? "You" : "Assistant"}
            </span>
            {msg.content || <span className="text-zinc-400">(empty)</span>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a grievance..."
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </Button>
      </div>
      {error && <div className="text-center text-red-400 py-2">{error}</div>}
    </div>
  );
}
