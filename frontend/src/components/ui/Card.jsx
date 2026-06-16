import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

export const Card = React.forwardRef(({ className, children, hover = false, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' } : {}}
      className={cn(
        "rounded-2xl border border-gray-100 bg-white text-gray-950 shadow-sm transition-all",
        "dark:border-dark-700 dark:bg-dark-800 dark:text-gray-50",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-bold leading-none tracking-tight", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";
