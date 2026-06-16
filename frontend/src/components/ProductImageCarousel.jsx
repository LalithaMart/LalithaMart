import { useState, useEffect } from 'react';

const ProductImageCarousel = ({ images, altText, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}>No Image</div>;
  }

  return (
    <img 
      src={images[currentIndex]?.startsWith('http') ? images[currentIndex] : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${images[currentIndex]}`} 
      alt={altText} 
      className={className} 
    />
  );
};

export default ProductImageCarousel;
