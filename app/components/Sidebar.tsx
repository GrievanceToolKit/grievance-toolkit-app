"use client";
import React from "react";
import Link from "next/link";
import {
  HomeIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog8ToothIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  return (
    <div className="flex flex-col gap-2">
      {/* Avatar/counter UI at the top of the sidebar */}
      {/* <div className="h-20 w-20 rounded-full bg-gray-300 text-white flex items-center justify-center text-lg font-bold shadow-lg mb-4">
        0
      </div> */}
      {/* <UserButton afterSignOutUrl="/" /> */}
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <HomeIcon className="h-5 w-5" />
        Dashboard
      </Link>
      <Link
        href="/reportes"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <ChartBarIcon className="h-5 w-5" />
        Reports
      </Link>
      <Link
        href="/usuarios"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <UserGroupIcon className="h-5 w-5" />
        Users
      </Link>
      <Link
        href="/configuracion"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <Cog8ToothIcon className="h-5 w-5" />
        Configuration
      </Link>
      <Link
        href="/dashboard/history"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <BookOpenIcon className="h-5 w-5" />
        Grievance History
      </Link>
      <Link
        href="/dashboard/assistant"
        className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-left"
      >
        <span className="text-lg">👨‍⚖️</span>
        Steward’s Assistant
      </Link>
    </div>
  );
}
