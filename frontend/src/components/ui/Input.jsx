import React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, type, icon, error, ...props }, ref) => {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-dark-600 dark:bg-dark-800 dark:text-gray-100 dark:placeholder:text-gray-500",
          icon && "pl-10",
          error && "border-red-500 focus:ring-red-500 dark:border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
});
Input.displayName = "Input";
