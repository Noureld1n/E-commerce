import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AiOutlineArrowLeft, AiOutlineArrowRight } from 'react-icons/ai';

const HerroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  // Slideshow data with home-assets images
  const slides = [
    {
      id: 1,
      image: '/home-assets/1000064772.jpg',
      title: 'Voice-Powered Shopping',
      subtitle: 'Hands-Free Experience',
      description: 'Shop effortlessly with voice commands. Perfect for multitasking or when your hands are busy.',
      buttonText: 'Try Voice Shopping',
      buttonLink: '/products'
    },
    {
      id: 2,
      image: '/home-assets/1000064773.jpg',
      title: 'Accessibility First',
      subtitle: 'For Everyone',
      description: 'Designed for those who can\'t use their hands. Navigate, search, and purchase using only your voice.',
      buttonText: 'Learn More',
      buttonLink: '/products'
    },
    {
      id: 3,
      image: '/home-assets/1000064774.jpg',
      title: 'Work Faster & Smarter',
      subtitle: 'Voice Commands',
      description: 'Speed up your shopping experience. Say what you need and let our AI handle the rest.',
      buttonText: 'Start Shopping',
      buttonLink: '/products'
    },
    {
      id: 4,
      image: '/home-assets/1000064778.jpg',
      title: 'Inclusive Technology',
      subtitle: 'Empowering All Users',
      description: 'Breaking barriers with voice-controlled e-commerce. Shopping made accessible for every ability.',
      buttonText: 'Explore Features',
      buttonLink: '/products'
    },
    {
      id: 5,
      image: '/home-assets/1000064779.jpg',
      title: 'Say It, Find It, Buy It',
      subtitle: 'Voice Shopping Revolution',
      description: 'Simply speak your needs and discover products instantly. The future of accessible shopping is here.',
      buttonText: 'Voice Search Now',
      buttonLink: '/products'
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoplay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoplay, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="hero-slideshow-container">
      <div className="slideshow-wrapper">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide ${index === currentSlide ? 'active' : ''}`}            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url(${slide.image})`
            }}
          >
            <div className="slide-content">
              <div className="slide-text">
                <p className="slide-subtitle">{slide.subtitle}</p>
                <h1 className="slide-title">{slide.title}</h1>
                <p className="slide-description">{slide.description}</p>
                <Link href={slide.buttonLink}>
                  <button className="slide-button">{slide.buttonText}</button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        className="nav-arrow nav-arrow-left" 
        onClick={prevSlide}
        onMouseEnter={() => setIsAutoplay(false)}
        onMouseLeave={() => setIsAutoplay(true)}
      >
        <AiOutlineArrowLeft />
      </button>
      <button 
        className="nav-arrow nav-arrow-right" 
        onClick={nextSlide}
        onMouseEnter={() => setIsAutoplay(false)}
        onMouseLeave={() => setIsAutoplay(true)}
      >
        <AiOutlineArrowRight />
      </button>

      {/* Dots Indicator */}
      <div className="dots-container">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            onMouseEnter={() => setIsAutoplay(false)}
            onMouseLeave={() => setIsAutoplay(true)}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${((currentSlide + 1) / slides.length) * 100}%` 
          }}
        />
      </div>
    </div>
  );
};

export default HerroBanner;
