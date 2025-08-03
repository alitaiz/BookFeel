
import React, { useState, useEffect } from 'react';

interface CarouselProps {
  images: string[];
  onImageClick?: (imageUrl: string) => void;
}

export const Carousel: React.FC<CarouselProps> = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minSwipeDistance = 50;

  // This useEffect handles the auto-advancing timer.
  // It resets whenever the currentIndex changes, which happens on both auto and manual navigation.
  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearTimeout(timer); // Cleanup the timer on component unmount or when currentIndex changes
  }, [currentIndex, images.length]);


  if (!images || images.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handleImageClick = () => {
    if (onImageClick) {
      onImageClick(images[currentIndex]);
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touch end position
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }

    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div 
        className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-lg h-96 bg-slate-100"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {/* Images are absolutely positioned and will be contained within the parent */}
      {images.map((image, index) => (
        <img
          key={index}
          src={image}
          alt={`Memorial slide ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } ${onImageClick ? 'cursor-pointer' : ''}`}
          aria-hidden={index !== currentIndex}
          onClick={handleImageClick}
        />
      ))}
      
      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button 
            onClick={goToPrevious} 
            className="absolute top-1/2 left-2 z-10 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous image"
          >
            &#10094;
          </button>
          <button 
            onClick={goToNext} 
            className="absolute top-1/2 right-2 z-10 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next image"
          >
            &#10095;
          </button>
        </>
      )}
    </div>
  );
};
