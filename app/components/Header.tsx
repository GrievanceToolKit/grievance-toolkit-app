import React from "react";
import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
  return (
    <header className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <h1 className="text-2xl font-semibold">GrievanceToolkit</h1>
      <div className="flex items-center gap-4">
        <DarkModeToggle />
        <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
