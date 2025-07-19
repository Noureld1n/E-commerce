import React from 'react';
import Link from 'next/link';
import { AiOutlineInstagram, AiFillFacebook, AiFillTwitterCircle, AiOutlineMail, AiOutlinePhone, AiOutlineInfoCircle } from 'react-icons/ai';

const FooterBanner = () => {
  return (
    <footer className='main-footer'>
      <div className='footer-content'>
        <div className='footer-section'>
          <div className='footer-logo'>
            <img src="/icon/1000064780-removebg-preview.png" alt="Voi Shop Logo" className='footer-logo-icon' />
            <h3>Voi Shop</h3>
          </div>          <p className='footer-description'>
            Voice-first ecommerce platform making shopping accessible and effortless for everyone.
          </p>
          <div className='social-icons'>
            <a href="https://facebook.com/voishop" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook">
              <AiFillFacebook />
            </a>
            <a href="https://twitter.com/voishop" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Twitter">
              <AiFillTwitterCircle />
            </a>
            <a href="https://instagram.com/voishop" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram">
              <AiOutlineInstagram />
            </a>
          </div>
        </div>

        <div className='footer-section'>
          <h4>Quick Links</h4>
          <ul className='footer-links'>
            <li><Link href="/products">All Products</Link></li>
            <li><Link href="/categories">Categories</Link></li>
            <li><Link href="/voice-search">Voice Search</Link></li>
            <li><Link href="/deals">Special Deals</Link></li>
            <li><Link href="/account">My Account</Link></li>
          </ul>
        </div>

        <div className='footer-section'>
          <h4>Voice Features</h4>
          <ul className='footer-links'>
            <li><Link href="/voice-commands">Voice Commands List</Link></li>
            <li><Link href="/voice-tutorial">Interactive Tutorial</Link></li>
            <li><Link href="/voice-settings">Voice Settings</Link></li>
            <li><Link href="/voice-faqs">Voice Shopping FAQs</Link></li>
            <li><Link href="/accessibility">Accessibility Guide</Link></li>
          </ul>
        </div>

        <div className='footer-section'>
          <h4>Customer Support</h4>
          <div className='contact-info'>
            <div className='contact-item'>
              <AiOutlineMail />
              <span>help@voishop.com</span>
            </div>
            <div className='contact-item'>
              <AiOutlinePhone />
              <span>1-800-VOI-SHOP (24/7)</span>
            </div>
            <div className='contact-item'>
              <AiOutlineInfoCircle />
              <span>Voice Support Available</span>
            </div>
          </div>          <p className='accessibility-note'>
            <strong>Accessibility:</strong> Making online shopping accessible to everyone 
            through our voice-first approach.
          </p>
        </div>
      </div>
      <div className='footer-bottom'>
        <div className='footer-bottom-content'>
          <p>&copy; 2025 Voi Shop. All rights reserved.</p>
          <div className='footer-bottom-links'>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/voice-policy">Voice Data Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterBanner;
