import React from "react";

type HelpTooltipProps = {
  label: string;
  description: string;
};

const HelpTooltip: React.FC<HelpTooltipProps> = ({ label, description }) => (
  <div className="group relative inline-block cursor-help">
    <span className="text-sm font-medium underline decoration-dotted">
      {label}
    </span>
    <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-md z-10 w-64 top-full left-0 mt-1">
      {description}
    </div>
  </div>
);

export default HelpTooltip;
