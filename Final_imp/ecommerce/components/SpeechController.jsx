import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../context/StateContext';
import toast from 'react-hot-toast';

// Helper functions for speech processing - Optimized for performance
const removeDuplicateWords = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  const words = text.split(' ');
  const result = [];
  let prevWord = '';
  
  // Single pass to remove consecutive duplicates
  for (let i = 0; i < words.length; i++) {
    const currentWord = words[i].toLowerCase();
    if (currentWord !== prevWord) {
      result.push(words[i]);
      prevWord = currentWord;
    }
  }
  
  // Optimized phrase repetition removal
  return removePhaseRepetitions(result.join(' '));
};

// Optimized phrase repetition removal
const removePhaseRepetitions = (text) => {
  if (!text || text.length < 10) return text; // Skip short texts
  
  // Use regex for better performance on longer phrases
  const cleanedText = text.replace(/(\b\w+(?:\s+\w+){1,3}\b)\s+\1/gi, '$1');
  return removeStutteredPhrases(cleanedText);
};

// Helper to escape special characters for regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Remove stuttered phrases with optimized regex patterns
const removeStutteredPhrases = (text) => {
  if (!text) return '';
  if (text.length < 20) return text; // Not enough text to find meaningful stutters
  
  // Common stutter patterns - exact repetitions within short distances
  let result = text
    // Remove word-level stutters (e.g., "I I want" -> "I want")
    .replace(/\b(\w+)\s+\1\b/gi, '$1')
    // Remove phrase stutters (2-3 words repeated)
    .replace(/\b(\w+\s+\w+)\s+\1\b/gi, '$1')
    .replace(/\b(\w+\s+\w+\s+\w+)\s+\1\b/gi, '$1')
    // Remove partial overlapping stutters (e.g., "I want I want to" -> "I want to")
    .replace(/\b(\w+)\s+(\w+)\s+\1\s+\2/gi, '$1 $2')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  return result;
};



// Simple Levenshtein distance implementation for string similarity
const levenshteinDistance = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the dp matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
};

// Check if new text is just repeating what's already in existing text
const isJustRepetition = (existingText, newText) => {
  if (!existingText || !newText) return false;
  
  // Convert to lowercase for comparison
  const existingLower = existingText.toLowerCase().trim();
  const newLower = newText.toLowerCase().trim();
  
  // Check for exact matches or containment
  if (existingLower === newLower || 
      existingLower.endsWith(newLower) || 
      existingLower.includes(` ${newLower} `)) {
    return true;
  }
  
  // Check for partial phrase repetition
  const existingWords = existingLower.split(' ');
  const newWords = newLower.split(' ');
  
  // If new text is short, require higher match threshold
  const minWordsToMatch = Math.min(3, Math.floor(newWords.length * 0.7));
  
  // Check for significant overlap at the end of existing text
  if (existingWords.length >= minWordsToMatch && newWords.length >= minWordsToMatch) {
    // Check if the end of existing text contains start of new text
    for (let matchLength = minWordsToMatch; matchLength <= Math.min(existingWords.length, newWords.length); matchLength++) {
      const existingEnd = existingWords.slice(existingWords.length - matchLength).join(' ');
      const newStart = newWords.slice(0, matchLength).join(' ');
      
      if (existingEnd === newStart) {
        return true;
      }
      
      // Also check if there's significant similarity (allowing for some variation)
      if (matchLength >= 3) {
        const similarity = calculateStringSimilarity(existingEnd, newStart);
        if (similarity > 0.75) { // 75% similarity threshold
          return true;
        }
      }
    }
  }
  
  // Check if new text would create a stutter if appended
  const combinedText = `${existingLower} ${newLower}`;
  const cleanedCombined = removeStutteredPhrases(combinedText);
  
  // If cleaning would significantly shorten the text, it's likely a repetition
  if (cleanedCombined.length < combinedText.length * 0.85) {
    return true;
  }
  
  return false;
};

// Calculate similarity ratio between two strings
const calculateStringSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength > 0 ? 1 - (distance / maxLength) : 1;
};

const SpeechController = () => {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const scrollIntervalRef = useRef(null);  const lastProcessedCommandRef = useRef({ command: '', time: 0 });
  const lastTranscriptRef = useRef('');
  const commandTimeoutRef = useRef(null);  const phraseBufferRef = useRef(''); // NEW: Buffer to collect speech fragments
  const itemCommandProcessingRef = useRef(false); // NEW: Flag to prevent multiple item commands
  const [reviewVoiceState, setReviewVoiceState] = useState({
    active: false,
    step: 'initial', // initial, rating, title, text, recommendation
    currentInput: '',
    reviewData: {
      rating: 0,
      title: '',
      reviewText: '',
      recommended: true
    }  });
  const { setShowCart, setVoiceCommandCategory, setShowAddReview, setVoiceReviewData } = useStateContext(); // Added review-related context
  
  const handleVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase().trim();

    if (!lowerCommand) {
      return;
    }
    
    console.log('Processing voice command:', lowerCommand);    // PRIORITY 1: Identify repeatable commands that should never be blocked by duplicate prevention
    const isRepeatableCommand = lowerCommand.includes('stop') || 
                               lowerCommand.includes('scroll up') || 
                               lowerCommand.includes('scroll down') ||
                               lowerCommand.includes('top') || 
                               lowerCommand.includes('bottom');    // PRIORITY 2: Check for duplicate commands (but allow repeatable commands through)
    if (!isRepeatableCommand && lowerCommand === lastProcessedCommandRef.current.command) {
      console.log('[SpeechController] Ignoring duplicate command:', lowerCommand);
      return;
    }    // PRIORITY 2.5: Special protection for critical action commands that should never duplicate
    const isActionCommand = lowerCommand === 'add all' || 
                           lowerCommand.startsWith('remove ') ||
                           lowerCommand === 'check out' ||
                           lowerCommand === 'make order';
    
    if (isActionCommand) {
      // Extra protection - check if this command was processed very recently
      const now = Date.now();
      const lastCommandTime = lastProcessedCommandRef.current.time || 0;
      
      if (lowerCommand === lastProcessedCommandRef.current.command && (now - lastCommandTime) < 3000) {
        console.log('[SpeechController] Blocking recent duplicate action command:', lowerCommand);
        return;
      }
      
      // Update the last command tracking
      lastProcessedCommandRef.current = { command: lowerCommand, time: now };
    }// PRIORITY 3: Handle stop commands immediately
    if (lowerCommand.includes('stop')) {
      // Ensure scroll is stopped completely
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      console.log('[SpeechController] Stop command executed - scrolling stopped');
      return; // Early return to prevent further processing
    }

    // PRIORITY 4: Clear scroll interval for any non-stop command
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }    if (lowerCommand.includes('scroll down')) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, 20); // Increased from 15 to 20 pixels for faster scroll
      }, 60); // Decreased from 80 to 60ms interval for faster scroll
    } else if (lowerCommand.includes('scroll up')) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -20); // Increased from -15 to -20 pixels for faster scroll
      }, 60); // Decreased from 80 to 60ms interval for faster scroll
    } else if (lowerCommand.includes('top') || lowerCommand.includes('go to top')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (lowerCommand.includes('bottom') || lowerCommand.includes('go to bottom')) {      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });    } else if (lowerCommand.includes('shopping')) {
      setShowCart(true);
    } else if (lowerCommand.includes('close')) { 
      // First, close the cart if it's open
      setShowCart(false);
      console.log('[SpeechController] Voice command to close menu/cart - cart closed');
      
      // Next, specifically target the user dropdown menu in the navbar
      const userDropdown = document.querySelector('.user-dropdown');
      
      // If the dropdown is visible, close it
      if (userDropdown) {
        console.log('[SpeechController] Found open user dropdown menu in navbar, closing it');
        
        // Find and click the user menu trigger button to properly toggle the dropdown
        const userMenuTrigger = document.querySelector('.user-menu-trigger');
        if (userMenuTrigger) {
          userMenuTrigger.click();
          console.log('[SpeechController] Clicked user menu trigger to close dropdown');
        } else {
          // Fallback if trigger button not found - click the body to close dropdown
          console.log('[SpeechController] User menu trigger not found, using fallback');
          document.body.click();
        }
      } else {
        console.log('[SpeechController] No open dropdown menu found in navbar');
      }
    } else if (lowerCommand.includes('check out')) {
      console.log('[SpeechController] Voice command for checkout');
      // Find and click the checkout button
      const checkoutButton = document.querySelector('.checkout-btn');
      if (checkoutButton) {
        checkoutButton.click();
      } else {
        console.log('[SpeechController] Checkout button not found - cart may be empty or closed');
      }} else if (lowerCommand.includes('make order') || lowerCommand.includes('place order')) {
      console.log('[SpeechController] Voice command for placing order');
      // Find and click the place order button (typically on checkout page)
      
      // Strategy 1: Try CSS modules pattern (for checkout page with styles['place-order-btn'])
      let placeOrderButton = document.querySelector('button[class*="place-order-btn"]');
      
      // Strategy 2: Try common CSS class patterns
      if (!placeOrderButton) {
        placeOrderButton = document.querySelector(
          'button[class*="place-order"], button[class*="submit-order"], button[class*="complete-order"], ' +
          'input[type="submit"][value*="Place"], button[type="submit"]'
        );
      }
      
      // Strategy 3: Search by text content (most reliable)
      if (!placeOrderButton) {
        placeOrderButton = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(btn => {
          const text = (btn.textContent || btn.value || '').toLowerCase();
          return text.includes('place order') || 
                 text.includes('placing order') ||
                 text.includes('submit order') ||
                 text.includes('complete order') ||
                 text.includes('confirm order') ||
                 text.includes('finalize order');
        });
      }
      
      if (placeOrderButton) {
        console.log('[SpeechController] Found place order button:', placeOrderButton);
        console.log('[SpeechController] Button text:', placeOrderButton.textContent);
        console.log('[SpeechController] Button classes:', placeOrderButton.className);
        placeOrderButton.click();
      } else {
        console.log('[SpeechController] Place order button not found - may not be on checkout page or cart is empty');
        // Debug: Log all buttons on the page for troubleshooting
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        console.log('[SpeechController] Available buttons on page:', allButtons.map(btn => ({
          text: btn.textContent || btn.value,
          classes: btn.className        })));
      }
    } else if (lowerCommand.includes('view all orders') || lowerCommand.includes('show all orders')) {
      console.log('[SpeechController] Voice command for viewing all orders');
      // Find and click the "View All Orders" button or navigate to orders page
      const viewOrdersButton = Array.from(document.querySelectorAll('button, a')).find(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('view all orders') || 
               text.includes('show all orders') ||
               text.includes('all orders');
      });
        if (viewOrdersButton) {
        console.log('[SpeechController] Found view all orders button:', viewOrdersButton);
        viewOrdersButton.click();
      } else {
        // If button not found, navigate directly to orders page
        console.log('[SpeechController] View all orders button not found, navigating to /orders');
        router.push('/orders');
      }    } else if (lowerCommand.includes('cancel order')) {
      console.log('[SpeechController] Voice command for canceling order');
      // Find and click the cancel order button (only available for pending orders)
      
      // Strategy 1: Try to find by exact text match
      let cancelButton = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = (btn.textContent || '').toLowerCase().trim();
        return text === 'cancel order' || text === 'cancelling...';
      });
      
      // Strategy 2: Try to find by text that includes "cancel order"
      if (!cancelButton) {
        cancelButton = Array.from(document.querySelectorAll('button')).find(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return text.includes('cancel order') && !text.includes('cancel review');
        });
      }
      
      // Strategy 3: Try to find by CSS class patterns
      if (!cancelButton) {
        cancelButton = document.querySelector('button[class*="cancel"], button[class*="Cancel"]');
        // Verify it's actually a cancel order button
        if (cancelButton) {
          const text = (cancelButton.textContent || '').toLowerCase();
          if (!text.includes('cancel') || text.includes('review')) {
            cancelButton = null; // Not the right button
          }
        }
      }
      
      if (cancelButton && !cancelButton.disabled) {
        console.log('[SpeechController] Found cancel order button:', cancelButton);
        console.log('[SpeechController] Button text:', cancelButton.textContent);
        cancelButton.click();
      } else if (cancelButton && cancelButton.disabled) {
        console.log('[SpeechController] Cancel order button found but disabled - order may not be cancellable');
      } else {
        console.log('[SpeechController] Cancel order button not found - may not be on order detail page or order is not cancellable');
        // Debug: Log all buttons for troubleshooting
        const allButtons = Array.from(document.querySelectorAll('button'));
        console.log('[SpeechController] Available buttons:', allButtons.map(btn => ({
          text: btn.textContent,
          classes: btn.className,
          disabled: btn.disabled
        })));
      }
    } else if (lowerCommand.startsWith('cancel ')) {
      // Handle indexed cancel commands: "cancel [number]" for order history page
      let orderNumberStr = lowerCommand.substring(7).trim(); // "cancel " is 7 chars
      console.log(`[SpeechController] Heard cancel order string: ${orderNumberStr}`);

      const numberWords = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15'
      };
      const orderNumber = numberWords[orderNumberStr.toLowerCase()] || orderNumberStr;
      const orderIndex = parseInt(orderNumber, 10) - 1; // Convert to 0-based index

      if (isNaN(orderIndex) || orderIndex < 0) {
        console.log(`[SpeechController] Invalid order number for cancel: ${orderNumberStr}`);
        return;
      }

      console.log(`[SpeechController] Attempting to cancel order at index: ${orderIndex} (user said number ${orderNumber})`);
      
      // Check if we're on the orders page
      const currentPath = window.location.pathname;
      if (currentPath === '/orders') {
        // Find the cancel button for the specific order by index
        const orderCards = document.querySelectorAll('[class*="orderCard"]');
        if (orderCards && orderCards.length > orderIndex) {
          const targetOrderCard = orderCards[orderIndex];
          const cancelButton = targetOrderCard.querySelector('button[class*="cancelOrderBtn"]');
          
          if (cancelButton && !cancelButton.disabled) {
            console.log('[SpeechController] Found cancel button for order:', cancelButton);
            cancelButton.click();
          } else if (cancelButton && cancelButton.disabled) {
            console.log(`[SpeechController] Cancel button for order ${orderNumber} found but disabled - order may not be cancellable`);
          } else {
            console.log(`[SpeechController] Cancel button for order ${orderNumber} not found - order may not be cancellable`);
          }
        } else {
          console.log(`[SpeechController] Order number ${orderNumber} (index ${orderIndex}) not found. Found ${orderCards ? orderCards.length : 0} order cards.`);
        }
      } else {
        console.log(`[SpeechController] Cancel command with number requires being on the orders page. Current path: ${currentPath}`);
      }    } else if (lowerCommand.startsWith('view ')) {
      // Handle indexed view commands: "view [number]" for order history page
      let orderNumberStr = lowerCommand.substring(5).trim(); // "view " is 5 chars
      console.log(`[SpeechController] Heard view order string: ${orderNumberStr}`);

      const numberWords = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15'
      };
      const orderNumber = numberWords[orderNumberStr.toLowerCase()] || orderNumberStr;
      const orderIndex = parseInt(orderNumber, 10) - 1; // Convert to 0-based index

      if (isNaN(orderIndex) || orderIndex < 0) {
        console.log(`[SpeechController] Invalid order number for view: ${orderNumberStr}`);
        return;
      }

      console.log(`[SpeechController] Attempting to view order at index: ${orderIndex} (user said number ${orderNumber})`);
      
      // Check if we're on the orders page
      const currentPath = window.location.pathname;
      console.log(`[SpeechController] Current path: ${currentPath}`);
      
      if (currentPath === '/orders') {
        // Try multiple selectors to find order cards - debug version
        let orderCards;
        
        // First try with CSS modules class pattern
        orderCards = document.querySelectorAll('[class*="orderCard"]');
        console.log(`[SpeechController] Found ${orderCards.length} order cards with [class*="orderCard"]`);
        
        // If not found, try with generic class patterns
        if (orderCards.length === 0) {
          orderCards = document.querySelectorAll('.orderCard, [class*="order-card"], [class*="order_card"]');
          console.log(`[SpeechController] Found ${orderCards.length} order cards with alternate selectors`);
        }
          // If still not found, try finding any divs that might contain order information
        if (orderCards.length === 0) {
          const allDivs = document.querySelectorAll('div');
          const orderDivs = Array.from(allDivs).filter(div => {
            const text = div.textContent || '';
            return text.includes('Order #') && div.querySelector('a');
          });
          orderCards = orderDivs;
          console.log(`[SpeechController] Found ${orderCards.length} order cards with text-based search`);
        }
        
        // Debug: list all classes on the page to help identify the correct selector
        if (orderCards.length === 0) {
          const allDivs = document.querySelectorAll('div');
          console.log('[SpeechController] Debugging - All div classes on page:');
          Array.from(allDivs).slice(0, 20).forEach((div, i) => {
            if (div.className) {
              console.log(`  Div ${i}: ${div.className}`);
            }
          });
        }
        
        if (orderCards && orderCards.length > orderIndex) {
          const targetOrderCard = orderCards[orderIndex];
          console.log(`[SpeechController] Target order card found:`, targetOrderCard);
          console.log(`[SpeechController] Target order card classes:`, targetOrderCard.className);
            // Try multiple selectors for the view button
          let viewButton = targetOrderCard.querySelector('button[class*="viewOrderBtn"]');
          
          if (!viewButton) {
            viewButton = targetOrderCard.querySelector('button[class*="view-order"], button[class*="view_order"], a[href*="/order/"]');
            console.log(`[SpeechController] Alternate view button search result:`, viewButton);
          }
          
          if (!viewButton) {
            // Try finding by text content
            const allElements = targetOrderCard.querySelectorAll('a, button');
            viewButton = Array.from(allElements).find(element => {
              const text = (element.textContent || '').toLowerCase();
              return text.includes('view') && (text.includes('detail') || text.includes('order'));
            });
            console.log(`[SpeechController] Text-based view button search result:`, viewButton);
          }
          
          if (viewButton) {
            console.log('[SpeechController] Found view button for order:', viewButton);
            console.log('[SpeechController] View button href:', viewButton.href);
            console.log('[SpeechController] View button classes:', viewButton.className);
            viewButton.click();
          } else {
            console.log(`[SpeechController] View button for order ${orderNumber} not found in card`);
            // Debug: show all links/buttons in the card
            const allInteractiveElements = targetOrderCard.querySelectorAll('a, button');
            console.log(`[SpeechController] All interactive elements in card:`, allInteractiveElements);
            Array.from(allInteractiveElements).forEach((el, i) => {
              console.log(`  Element ${i}: ${el.tagName} - ${el.className} - "${el.textContent?.trim()}" - href: ${el.href || 'N/A'}`);
            });
          }
        } else {
          console.log(`[SpeechController] Order number ${orderNumber} (index ${orderIndex}) not found. Found ${orderCards ? orderCards.length : 0} order cards.`);
        }
      } else {
        console.log(`[SpeechController] View command with number requires being on the orders page. Current path: ${currentPath}`);
      }} else if (lowerCommand.startsWith('item ')) {
      // CRITICAL: Immediate global flag check to prevent any duplicate processing
      if (itemCommandProcessingRef.current) {
        console.log('[SpeechController] Item command already processing, ignoring duplicate');
        return;
      }
      
      // Set processing flag immediately to block any other item commands
      itemCommandProcessingRef.current = true;
      
      let itemNumberStr = lowerCommand.substring(5).trim();
      console.log(`[SpeechController] Heard item string: ${itemNumberStr}`);

      const numberWords = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
        'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20'
      };

      const itemNumber = numberWords[itemNumberStr.toLowerCase()] || itemNumberStr;
      console.log(`[SpeechController] Attempting to open item number: ${itemNumber}`);
        // Additional check against duplicate commands
      if (lastProcessedCommandRef.current.command === lowerCommand) {
        console.log('[SpeechController] Duplicate command detected, resetting processing flag');
        itemCommandProcessingRef.current = false;
        return;
      }
      
      // Set lastProcessedCommandRef immediately to prevent duplicates
      lastProcessedCommandRef.current = { command: lowerCommand, time: Date.now() };
      
      const targetLink = document.querySelector(`a[data-product-number="${itemNumber}"]`);
      if (targetLink) {
        console.log('[SpeechController] Found link for item number:', targetLink);
        
        // Additional protection: Check if link was recently clicked
        const lastClicked = targetLink.dataset.lastClicked;
        if (lastClicked && Date.now() - parseInt(lastClicked) < 2000) {
          console.log('[SpeechController] Link was recently clicked, preventing duplicate click');
          itemCommandProcessingRef.current = false;
          return;
        }
        
        // Mark the link with current timestamp
        targetLink.dataset.lastClicked = Date.now().toString();
        
        // Immediately click the link without any setTimeout delay
        try {
          targetLink.click();
          console.log('[SpeechController] Successfully clicked item link');
        } catch (error) {
          console.error('[SpeechController] Error clicking item link:', error);
        }
        
        // Reset processing flag after a delay
        setTimeout(() => {
          itemCommandProcessingRef.current = false;
          console.log('[SpeechController] Item command processing flag reset');
        }, 1500);
        
      } else {
        // Reset processing flag if no link found
        itemCommandProcessingRef.current = false;
        const allProductLinks = Array.from(document.querySelectorAll('a[data-product-number]'))
                                    .map(a => a.getAttribute('data-product-number'));        console.log(`[SpeechController] No link found for item number ${itemNumber}. Available data-product-number links:`, allProductLinks);
      }
    } else if (lowerCommand === 'back') { 
      console.log('[SpeechController] Navigating back.');
      window.history.back();
    } else if (lowerCommand === 'plus') {
      console.log('[SpeechController] Attempting to click plus button.');
      const plusButton = document.querySelector('.quantity-desc .plus');
      if (plusButton) {
        plusButton.click();
      } else {
        console.log('[SpeechController] Plus button not found.');
      }
    } else if (lowerCommand === 'minus') {
      console.log('[SpeechController] Attempting to click minus button.');
      const minusButton = document.querySelector('.quantity-desc .minus');
      if (minusButton) {
        minusButton.click();
      } else {
        console.log('[SpeechController] Minus button not found.');
      }
    } else if (lowerCommand === 'add') { // Added "add" command
      console.log('[SpeechController] Attempting to click add to cart button.');
      const addToCartButton = document.querySelector('.add-to-cart');
      if (addToCartButton) {
        addToCartButton.click();
      } else {
        console.log('[SpeechController] Add to cart button not found.');
      }
    } else if (lowerCommand.startsWith('remove ')) {
      let itemNumberStr = lowerCommand.substring(7).trim(); // "remove " is 7 chars
      console.log(`[SpeechController] Heard remove item string: ${itemNumberStr}`);

      const numberWords = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        // Add more if needed
      };
      const itemNumber = numberWords[itemNumberStr.toLowerCase()] || itemNumberStr;
      const itemIndex = parseInt(itemNumber, 10) - 1; // Convert to 0-based index

      if (isNaN(itemIndex) || itemIndex < 0) {
        console.log(`[SpeechController] Invalid item number for remove: ${itemNumberStr}`);
        return;
      }

      console.log(`[SpeechController] Attempting to remove item at index: ${itemIndex} (user said number ${itemNumber})`);
      // Targeting remove buttons specifically within the cart's product list
      const removeButtons = document.querySelectorAll('.cart-container .product-container .product .remove-item');
      if (removeButtons && removeButtons.length > itemIndex) {
        console.log('[SpeechController] Found remove button for item:', removeButtons[itemIndex]);
        removeButtons[itemIndex].click();
      } else {
        console.log(`[SpeechController] Remove button for item number ${itemNumber} (index ${itemIndex}) not found. Found ${removeButtons ? removeButtons.length : 0} remove buttons.`);
      }
    } else if (lowerCommand.includes('electronics')) {
      console.log('[SpeechController] Voice command for Electronics category');
      setVoiceCommandCategory('Electronics');
    } else if (lowerCommand.includes('groceries') || lowerCommand.includes('grocery')) {
      console.log('[SpeechController] Voice command for Groceries category');
      setVoiceCommandCategory('Groceries');    } else if (lowerCommand.includes('wearnings') || lowerCommand.includes('wearing') || lowerCommand.includes('we ring')) { 
      console.log('[SpeechController] Voice command for Wearings category (heard variations)');
      setVoiceCommandCategory('Wearings'); // Updated to 'Wearings'
    } else if (lowerCommand.includes('all products') || lowerCommand.includes('home')) {
      console.log('[SpeechController] Voice command for All Products/Home');
      setVoiceCommandCategory('All Products');
      
      // Navigate to the home page
      const currentPath = window.location.pathname;
      if (currentPath !== '/') {
        console.log('[SpeechController] Navigating to home page');
        router.push('/');
      } else {
        console.log('[SpeechController] Already on home page');
      }
    } else if (lowerCommand.includes('register') || lowerCommand.includes('sign up')) {
      console.log('[SpeechController] Voice command for registration page');
      router.push('/register');    } else if (lowerCommand.includes('sign in') || lowerCommand.includes('login')) {
      console.log('[SpeechController] Voice command for login page');
      router.push('/login');    } else if (lowerCommand === 'menu') {
      console.log('[SpeechController] Voice command to open user menu');
      
      // Find and click the user menu button in the navbar
      const userMenuButton = document.querySelector('.user-menu-trigger');
      
      if (userMenuButton) {
        console.log('[SpeechController] Found user menu button, clicking it');
        userMenuButton.click();
      } else {
        console.log('[SpeechController] User menu button not found - user may not be logged in');
        
        // Check if user is not logged in and redirect to login page
        const loginLinks = Array.from(document.querySelectorAll('a')).filter(a => 
          (a.textContent || '').toLowerCase().includes('login') || 
          (a.textContent || '').toLowerCase().includes('sign in')
        );
        
        if (loginLinks.length > 0) {
          console.log('[SpeechController] User not logged in, redirecting to login page');
          loginLinks[0].click();
        } else {
          console.log('[SpeechController] Neither user menu nor login link found');
        }
      }
    } else if (lowerCommand === 'profile') {
      console.log('[SpeechController] Voice command to navigate to profile page');
      router.push('/profile');
    } else if (lowerCommand === 'list') {
      console.log('[SpeechController] Voice command to navigate to wishlist page');
      router.push('/wishlist');
    } else if (lowerCommand === 'orders') {
      console.log('[SpeechController] Voice command to navigate to orders page');
      router.push('/orders');    } else if (lowerCommand === 'add all') {
      console.log('[SpeechController] Voice command to add all wishlist items to cart');
      
      // Check if we're on the wishlist page
      const currentPath = window.location.pathname;
      if (currentPath === '/wishlist') {
        // Find the "Add All to Cart" button
        const addAllButton = Array.from(document.querySelectorAll('button')).find(btn => {
          const text = (btn.textContent || '').toLowerCase().trim();
          return text === 'add all to cart';
        });
          if (addAllButton) {
          console.log('[SpeechController] Found "Add All to Cart" button, clicking it');
          
          // Prevent multiple rapid clicks on the same button
          if (addAllButton.dataset.voiceClicking === 'true') {
            console.log('[SpeechController] Button already being processed, skipping duplicate click');
            return;
          }
          
          // Mark button as being processed
          addAllButton.dataset.voiceClicking = 'true';
          
          addAllButton.click();
          
          // Clear the processing flag after a delay
          setTimeout(() => {
            addAllButton.dataset.voiceClicking = 'false';
          }, 2000);
          
          // Provide vocal feedback for accessibility
          setTimeout(() => {
            toast.success('All items added to cart', {
              id: 'voice-add-all'
            });
          }, 1000); // Small delay to allow the click to process
        } else {
          console.log('[SpeechController] "Add All to Cart" button not found - wishlist may be empty');
          toast.error('No items found in wishlist', {
            id: 'voice-add-all-error'
          });
        }
      } else {
        console.log('[SpeechController] "Add All" command requires being on the wishlist page. Current path:', currentPath);
        toast('Navigating to wishlist...', {
          id: 'voice-navigate-wishlist'
        });
        router.push('/wishlist');
      }    } else if (lowerCommand.startsWith('unlike ')) {
      console.log('[SpeechController] Voice command to remove item from wishlist');
      
      // Check if we're on a product listing page (home, category, search results) or wishlist page
      const currentPath = window.location.pathname;
      if (currentPath === '/wishlist' || currentPath === '/' || currentPath.startsWith('/category') || currentPath.includes('/search') || currentPath.includes('/product/')) {
        // Extract the item number from the command
        let itemNumberStr = lowerCommand.substring(7).trim();
        console.log(`[SpeechController] Heard unlike item string: ${itemNumberStr}`);

        // Convert word numbers to digits
        const numberWords = {
          'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
          'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
          'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
          'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20'
        };

        const itemNumber = numberWords[itemNumberStr.toLowerCase()] || itemNumberStr;
        console.log(`[SpeechController] Attempting to unlike item number: ${itemNumber}`);
        
        if (currentPath === '/wishlist') {
          // On wishlist page, look for product wrapper
          const productWrapper = document.querySelector(`.productWrapper[data-product-number="${itemNumber}"]`);
          
          if (!productWrapper) {
            // Try with different CSS module class naming conventions
            const altProductWrapper = document.querySelector(`[class*="productWrapper"][data-product-number="${itemNumber}"]`) || 
                                    document.querySelector(`[class*="product-wrapper"][data-product-number="${itemNumber}"]`) ||
                                    document.querySelector(`[class*="product_wrapper"][data-product-number="${itemNumber}"]`) ||
                                    document.querySelector(`div[data-product-number="${itemNumber}"]`);
                                    
            if (altProductWrapper) {
              console.log('[SpeechController] Found product wrapper using alternative selector');
              handleWishlistRemove(altProductWrapper, itemNumber, true);
            } else {
              console.log(`[SpeechController] Product with number ${itemNumber} not found in wishlist`);
              console.log('[SpeechController] Available data-product-number attributes:', 
                Array.from(document.querySelectorAll('[data-product-number]'))
                .map(el => el.getAttribute('data-product-number')));
              
              toast.error(`Item ${itemNumber} not found in wishlist`, {
                id: 'voice-unlike-error'
              });
            }
          } else {
            console.log('[SpeechController] Found product wrapper using data attribute selector');
            handleWishlistRemove(productWrapper, itemNumber, true);
          }
        } else {
          // On other pages (home, category, search, product), look for product element like in "like" command
          const productElement = document.querySelector(`[data-product-number="${itemNumber}"]`);
          
          if (!productElement) {
            console.log(`[SpeechController] Product with number ${itemNumber} not found`);
            console.log('[SpeechController] Available data-product-number attributes:', 
              Array.from(document.querySelectorAll('[data-product-number]'))
              .map(el => el.getAttribute('data-product-number')));
            
            toast.error(`Item ${itemNumber} not found`, {
              id: 'voice-unlike-error'
            });
          } else {
            console.log('[SpeechController] Found product element:', productElement);
            handleWishlistRemove(productElement, itemNumber, false);
          }
        }
      } else {
        console.log('[SpeechController] "Unlike" command requires being on a product listing or wishlist page. Current path:', currentPath);
        toast('Navigating to home page...', {
          id: 'voice-navigate-home'
        });
        router.push('/');
      }    } else if (lowerCommand.startsWith('like ')) {
      console.log('[SpeechController] Voice command to add item to wishlist');
      
      // Check if we're on a product listing page (home, category, search results) or product detail page
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath.startsWith('/category') || currentPath.includes('/search') || currentPath.includes('/product/')) {
        // Extract the item number from the command
        let itemNumberStr = lowerCommand.substring(5).trim();
        console.log(`[SpeechController] Heard like item string: ${itemNumberStr}`);

        // Convert word numbers to digits
        const numberWords = {
          'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
          'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
          'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
          'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20'
        };

        const itemNumber = numberWords[itemNumberStr.toLowerCase()] || itemNumberStr;
        console.log(`[SpeechController] Attempting to like item number: ${itemNumber}`);
        
        // Find the product wrapper with the corresponding number
        const productElement = document.querySelector(`[data-product-number="${itemNumber}"]`);
        
        if (!productElement) {
          console.log('[SpeechController] Product with number ${itemNumber} not found');
          console.log('[SpeechController] Available data-product-number attributes:', 
            Array.from(document.querySelectorAll('[data-product-number]'))
              .map(el => el.getAttribute('data-product-number')));
          
          toast.error(`Item ${itemNumber} not found`, {
            id: 'voice-like-error'
          });
        } else {
          console.log('[SpeechController] Found product element:', productElement);
          handleWishlistAdd(productElement, itemNumber);
        }      } else {
        console.log('[SpeechController] "Like" command requires being on a product listing page. Current path:', currentPath);
        toast('Navigating to home page...', {
          id: 'voice-navigate-home'
        });
        router.push('/');
      }
    }
      // Helper function to handle wishlist item removal
    function handleWishlistRemove(productWrapper, itemNumber, isWishlistPage) {
      console.log('[SpeechController] Found product wrapper for item number:', productWrapper);
      
      if (isWishlistPage) {
        // Wishlist page removal logic - find and click the remove button
        // Find the parent wishlist item div that contains the remove button
        const wishlistItem = productWrapper.closest(`.wishlistItem`) || 
                            productWrapper.closest(`[class*="wishlistItem"]`) || 
                            productWrapper.closest(`[class*="wishlist-item"]`) || 
                            productWrapper.closest(`[class*="wishlist_item"]`);
        
        if (wishlistItem) {
          // Find the remove button within this wishlist item
          const removeButton = wishlistItem.querySelector('.btnRemove') || 
                              wishlistItem.querySelector(`[class*="btnRemove"]`) || 
                              wishlistItem.querySelector(`[class*="btn-remove"]`) || 
                              wishlistItem.querySelector(`[class*="btn_remove"]`) ||
                              wishlistItem.querySelector('button[class*="remove"]');
          
          if (removeButton) {
            console.log('[SpeechController] Found remove button, clicking it');
            removeButton.click();
            
            // Provide vocal feedback for accessibility
            toast.success(`Item ${itemNumber} removed from wishlist`, {
              id: 'voice-unlike-item'
            });
          } else {
            console.log('[SpeechController] Remove button not found for item');
            toast.error(`Could not find remove button for item ${itemNumber}`, {
              id: 'voice-unlike-error'
            });
          }
        } else {
          console.log('[SpeechController] Could not find wishlist item container');
          toast.error(`Could not find item ${itemNumber} in wishlist`, {
            id: 'voice-unlike-error'
          });
        }
      } else {
        // Product listing page (home, category, search) or product detail page logic
        // Find the wishlist button (heart icon) within the product element, similar to handleWishlistAdd
        const wishlistButton = productWrapper.querySelector('.wishlist-btn') || 
                              productWrapper.querySelector('[class*="wishlist-btn"]') || 
                              productWrapper.querySelector('[class*="wishlistBtn"]') || 
                              productWrapper.querySelector('[class*="wishlist_btn"]') ||
                              productWrapper.querySelector('button:has(svg)'); // Many heart icons are SVGs inside buttons
        
        if (wishlistButton) {
          console.log('[SpeechController] Found wishlist button, clicking it to toggle');
          wishlistButton.click();
          
          // Provide vocal feedback for accessibility
          toast.success(`Item ${itemNumber} removed from wishlist`, {
            id: 'voice-unlike-item'
          });
        } else {
          // Check if we're on the product detail page
          if (window.location.pathname.includes('/product/')) {
            // Try to find the wishlist button in the product detail page
            const detailPageWishlistBtn = document.querySelector('.product-detail-wishlist-btn') || 
                                          document.querySelector('[class*="wishlistButton"]') || 
                                          document.querySelector('button:has(svg[class*="heart"])');
                                          
            if (detailPageWishlistBtn) {
              console.log('[SpeechController] Found wishlist button on product detail page, clicking it');
              detailPageWishlistBtn.click();
              
              toast.success('Product removed from wishlist', {
                id: 'voice-unlike-item'
              });
              return;
            }
          }
          
          console.log('[SpeechController] Wishlist button not found for item');
          toast.error(`Could not find wishlist button for item ${itemNumber}`, {
            id: 'voice-unlike-error'
          });
        }
      }
    }
      // Helper function to handle adding items to wishlist
    function handleWishlistAdd(productElement, itemNumber) {
      console.log('[SpeechController] Found product element for item number:', productElement);
      
      // Find the wishlist button (heart icon) within the product element
      const wishlistButton = productElement.querySelector('.wishlist-btn') || 
                            productElement.querySelector('[class*="wishlist-btn"]') || 
                            productElement.querySelector('[class*="wishlistBtn"]') || 
                            productElement.querySelector('[class*="wishlist_btn"]') ||
                            productElement.querySelector('button:has(svg)'); // Many heart icons are SVGs inside buttons
      
      if (wishlistButton) {
        console.log('[SpeechController] Found wishlist button, clicking it');
        wishlistButton.click();
        
        // Provide vocal feedback for accessibility
        toast.success(`Item ${itemNumber} added to wishlist`, {
          id: 'voice-like-item'
        });
      } else {
        console.log('[SpeechController] Wishlist button not found for item');
        
        // Check if we're on the product detail page
        if (window.location.pathname.includes('/product/')) {
          // Try to find the add to wishlist button in the product detail page
          const detailPageWishlistBtn = document.querySelector('.product-detail-wishlist-btn') || 
                                        document.querySelector('[class*="wishlistButton"]') || 
                                        document.querySelector('button:has(svg[class*="heart"])');
                                        
          if (detailPageWishlistBtn) {
            console.log('[SpeechController] Found wishlist button on product detail page, clicking it');
            detailPageWishlistBtn.click();
            
            toast.success('Product added to wishlist', {
              id: 'voice-like-item'
            });
            return;
          }
        }
        
        toast.error(`Could not find wishlist button for item ${itemNumber}`, {
          id: 'voice-like-error'
        });
      }
    }
    
    if (lowerCommand === 'refresh') {
      console.log('[SpeechController] Voice command to refresh/clear the current field');
      // Find the currently focused input element
      const focusedElement = document.activeElement;
      if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
        // Clear the value of the focused input or textarea
        focusedElement.value = '';
        
        // Trigger input event to notify React or other frameworks of the change
        const inputEvent = new Event('input', { bubbles: true });
        focusedElement.dispatchEvent(inputEvent);
        
        console.log('[SpeechController] Cleared the value of the focused element');
      } else {
        console.log('[SpeechController] No input or textarea element is currently focused');
      }    } else if (lowerCommand === 'exit' || lowerCommand === 'exit field' || lowerCommand === 'exit focus' || lowerCommand === 'unfocus') {      console.log('[SpeechController] Voice command to exit focus from input field');
      // Store current scroll position
      const scrollPos = window.scrollY;
      
      // Check if there's a focused input element
      const focusedElement = document.activeElement;
      if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
        // Clear any pending command timeouts to prevent partial transcripts from being processed
        if (commandTimeoutRef.current) {
          clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = null;
        }
        
        // First try blur method which is more reliable for most form elements
        focusedElement.blur();
        
        // As a fallback, also try to shift focus to the body
        try {
          document.body.focus();
        } catch (e) {
          console.log('[SpeechController] Error shifting focus to body:', e);
        }
        
        console.log('[SpeechController] Unfocused from input field');
        
        // Restore scroll position after a short delay to ensure it takes effect after any auto-scrolling
        setTimeout(() => {
          window.scrollTo({
            top: scrollPos,
            behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
          });
        }, 10);      } else {
        console.log('[SpeechController] No input field currently focused');
      }
    } else if (lowerCommand === 'first' || lowerCommand === 'first name') {
      console.log('[SpeechController] Voice command to focus on first name field');
      const firstNameInput = document.querySelector('#firstName, [name="firstName"], input[placeholder*="First Name"], input[placeholder*="first name"], input[aria-label*="First Name"]');
      if (firstNameInput) {
        firstNameInput.focus();
      } else {
        console.log('[SpeechController] First name input not found');
      }
    } else if (lowerCommand === 'last' || lowerCommand === 'last name') {
      console.log('[SpeechController] Voice command to focus on last name field');
      const lastNameInput = document.querySelector('#lastName, [name="lastName"], input[placeholder*="Last Name"], input[placeholder*="last name"], input[aria-label*="Last Name"]');
      if (lastNameInput) {
        lastNameInput.focus();
      } else {
        console.log('[SpeechController] Last name input not found');
      }
    } else if (lowerCommand.startsWith('email ')) {
      console.log('[SpeechController] Voice command for email with name');
      const emailInput = document.querySelector('#email, [name="email"], input[type="email"], input[placeholder*="Email"], input[placeholder*="email"], input[aria-label*="Email"]');
      
      if (emailInput) {
        emailInput.focus();
        
        // Extract the name part from the command
        const namePart = lowerCommand.substring(6).trim(); // "email " is 6 chars
        if (namePart) {
          // Generate email based on the provided name
          const emailValue = `${namePart}.doe@example.com`;
          emailInput.value = emailValue;
          
          // Trigger input event to notify React or other frameworks of the change
          const inputEvent = new Event('input', { bubbles: true });
          emailInput.dispatchEvent(inputEvent);
          
          console.log(`[SpeechController] Set email to: ${emailValue}`);
        }
      } else {
        console.log('[SpeechController] Email input not found');
      }
    } else if (lowerCommand === 'email') {
      console.log('[SpeechController] Voice command to focus on email field');
      const emailInput = document.querySelector('#email, [name="email"], input[type="email"], input[placeholder*="Email"], input[placeholder*="email"], input[aria-label*="Email"]');
      if (emailInput) {
        emailInput.focus();
        // Check if we're on the registration page and auto-fill example domain
        if (window.location.pathname.includes('register') && !emailInput.value.includes('@')) {
          // If there's text already, use it as the username part
          if (emailInput.value.trim()) {
            emailInput.value = emailInput.value.trim() + '.doe@example.com';
            
            // Trigger input event to notify React or other frameworks of the change
            const inputEvent = new Event('input', { bubbles: true });
            emailInput.dispatchEvent(inputEvent);
          }        }
      } else {
        console.log('[SpeechController] Email input not found');      }
    } else if (lowerCommand === 'password') {
      console.log('[SpeechController] Voice command to focus on password field');
      const passwordInput = document.querySelector('input[type="password"], #password, [name="password"]');
      if (passwordInput) {
        passwordInput.focus();
      } else {
        console.log('[SpeechController] Password input not found');
      }
    } else if (lowerCommand === 'confirm' || lowerCommand === 'confirm password') {
      console.log('[SpeechController] Voice command to focus on confirm password field');
      // Try different strategies to find the confirm password field
      const confirmPasswordInput = document.querySelector(
        '#confirmPassword, [name="confirmPassword"], input[placeholder*="Confirm Password"], input[placeholder*="confirm password"], input[aria-label*="Confirm Password"]'
      );
      if (confirmPasswordInput) {
        confirmPasswordInput.focus();
      } else {
        // Try to find the second password field on the page
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        if (passwordInputs.length > 1) {
          passwordInputs[1].focus();
        } else {
          console.log('[SpeechController] Confirm password input not found');
        }
      }    } else if (lowerCommand === 'review') {
      console.log('[SpeechController] Voice command to write a review');
      // Initiate review process
      setShowAddReview(true);
      setReviewVoiceState({
        active: true,
        step: 'rating',
        currentInput: '',
        reviewData: {
          rating: 0,
          title: '',
          reviewText: '',
          recommended: true
        }
      });    } else if (reviewVoiceState.active && reviewVoiceState.step === 'rating') {
      // Process rating (1-5) - accept both numbers and number words
      const numberWords = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
      };
      
      let rating = null;
      // Check if the command is a number or a number word
      Object.keys(numberWords).forEach(word => {
        if (lowerCommand === word || lowerCommand.includes(word)) {
          rating = numberWords[word];
        }
      });
      
      if (rating !== null) {
        console.log(`[SpeechController] Setting review rating to ${rating}`);
        setReviewVoiceState(prev => ({
          ...prev,
          step: 'title',
          reviewData: {
            ...prev.reviewData,
            rating
          }
        }));
        // Update the review data in context to be picked up by Reviews component
        setVoiceReviewData({
          rating,
          title: '',
          reviewText: '',
          recommended: true
        });
      }    } else if (reviewVoiceState.active && reviewVoiceState.step === 'title') {
      // In title section, specific commands are handled here.
      // Free-form text for the title is handled by processFullTranscript's buffering logic.
      if (lowerCommand === 'next section') {
        console.log(`[SpeechController] Moving from title to comment section`);
        setReviewVoiceState(prev => ({
          ...prev,
          step: 'comment'
        }));
        // Reset phrase buffer when moving to a new section
        phraseBufferRef.current = '';
      } else if (lowerCommand === 'clear' || lowerCommand === 'clear text' || lowerCommand === 'clear title') {
        console.log(`[SpeechController] Clearing title text`);        setReviewVoiceState(prev => ({
          ...prev,
          reviewData: {
            ...prev.reviewData,
            title: ''
          }
        }));
        // Update context
        setVoiceReviewData(prev => ({
          ...prev,
          title: ''
        }));      }
    } else if (reviewVoiceState.active && reviewVoiceState.step === 'comment') {
      // In comment section, specific commands are handled here.
      // Free-form text for the comment is handled by processFullTranscript's buffering logic.
      if (lowerCommand === 'next section') {
        console.log(`[SpeechController] Moving from comment to recommendation section`);
        
        // Move to recommendation step
        setReviewVoiceState(prev => ({
          ...prev,
          step: 'recommendation'
        }));
        // Reset phrase buffer when moving to a new section
        phraseBufferRef.current = '';
        // Also update the voice review data to trigger UI updates
        setVoiceReviewData(prev => ({
          ...prev,
          step: 'recommendation'
        }));
      } else if (lowerCommand === 'clear' || lowerCommand === 'clear text' || lowerCommand === 'clear comment') {
        console.log(`[SpeechController] Clearing comment text`);
        setReviewVoiceState(prev => ({
          ...prev,
          reviewData: {
            ...prev.reviewData,
            reviewText: ''
          }
        }));
        // Update context
        setVoiceReviewData(prev => ({
          ...prev,
          reviewText: ''
        }));
      }
    } else if (reviewVoiceState.active && reviewVoiceState.step === 'recommendation') {
      // Handle recommendation (yes/no or recommend/don't recommend)
      const isPositive = lowerCommand.includes('yes') || 
                        lowerCommand.includes('recommend') || 
                        lowerCommand.includes('positive') ||
                        lowerCommand === 'sure' ||
                        lowerCommand === 'definitely';
      
      const isNegative = lowerCommand.includes('no') ||
                        lowerCommand.includes('not recommend') ||
                        lowerCommand.includes("don't recommend") ||
                        lowerCommand.includes('negative') ||
                        lowerCommand === 'nope';

      if (isPositive || isNegative) {
        const recommendation = isPositive && !isNegative;
        console.log(`[SpeechController] Setting review recommendation to ${recommendation}`);
        setReviewVoiceState(prev => ({
          ...prev,
          step: 'final',
          reviewData: {
            ...prev.reviewData,
            recommended: recommendation
          }
        }));
        // Update context
        setVoiceReviewData(prev => ({
          ...prev,
          recommended: recommendation
        }));
      }
    } else if (reviewVoiceState.active && (lowerCommand.includes('submit review') || lowerCommand.includes('submit'))) {
      console.log('[SpeechController] Submitting review');
      // Signal to the Reviews component to submit the form
      setVoiceReviewData(prev => ({
        ...prev,
        submit: true
      }));
      // Reset review state
      setReviewVoiceState({
        active: false,
        step: 'initial',
        currentInput: '',
        reviewData: {
          rating: 0,
          title: '',
          reviewText: '',
          recommended: true
        }      });
      // Reset phrase buffer
      phraseBufferRef.current = '';
    } else if (reviewVoiceState.active && (lowerCommand.includes('cancel review') || lowerCommand.includes('cancel'))) {
      console.log('[SpeechController] Cancelling review');
      setShowAddReview(false);
      // Reset review state
      setReviewVoiceState({
        active: false,
        step: 'initial',
        currentInput: '',
        reviewData: {
          rating: 0,
          title: '',
          reviewText: '',
          recommended: true
        }
      });
      // Clear context
      setVoiceReviewData(null);
      
      // Reset phrase buffer
      phraseBufferRef.current = '';
    } else {
      console.log('[SpeechController] Command not recognized by handleVoiceCommand:', lowerCommand);
    }
    
    // Only set lastProcessedCommandRef for commands that should be deduplicated (not repeatable commands)
    const shouldDeduplicateCommand = lowerCommand.startsWith('item ') || 
                                   lowerCommand.startsWith('remove ') ||
                                   lowerCommand.startsWith('cancel ') ||
                                   lowerCommand.startsWith('view ') ||
                                   lowerCommand.startsWith('unlike ') ||
                                   lowerCommand.startsWith('like ') ||
                                   lowerCommand === 'shopping' ||
                                   lowerCommand === 'close' ||
                                   lowerCommand === 'back' ||
                                   lowerCommand === 'check out' ||
                                   lowerCommand === 'make order' ||
                                   lowerCommand === 'view all orders' ||
                                   lowerCommand === 'cancel order' ||
                                   lowerCommand === 'electronics' ||
                                   lowerCommand === 'groceries' ||
                                   lowerCommand === 'grocery' ||
                                   lowerCommand === 'wearnings' ||
                                   lowerCommand === 'wearing' ||                                   lowerCommand === 'we ring' ||
                                   lowerCommand === 'all products' ||
                                   lowerCommand === 'home' ||
                                   lowerCommand === 'register' ||
                                   lowerCommand === 'menu' ||
                                   lowerCommand === 'review' ||
                                   lowerCommand === 'next section' ||
                                   lowerCommand === 'submit' ||
                                   lowerCommand === 'clear' ||
                                   lowerCommand === 'profile' ||
                                   lowerCommand === 'list' ||
                                   lowerCommand === 'orders' ||
                                   lowerCommand === 'add all' ||
                                   lowerCommand === 'exit';
    
    if (shouldDeduplicateCommand) {
      lastProcessedCommandRef.current = { command: lowerCommand, time: Date.now() };
      
      // Clear the command reference after timeout only for deduplicated commands
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }

      commandTimeoutRef.current = setTimeout(() => {
        lastProcessedCommandRef.current = { command: '', time: 0 };
      }, 2000);
    }
  };const processTranscriptChange = (newTranscript) => {
    // Don't process if there's no new transcript
    if (!newTranscript) {
      return;
    }
    
    // Check if this transcript is identical to the last one processed (to prevent duplicates)
    if (lastTranscriptRef.current && newTranscript.toLowerCase().trim() === lastTranscriptRef.current.toLowerCase().trim()) {
      console.log('[SpeechController] Ignoring duplicate transcript:', newTranscript);
      return;
    }
    
    // PRIORITY: Critical commands like "stop" should be processed immediately, never delayed
    const lowerNewTranscript = newTranscript.toLowerCase().trim();
    const isCriticalCommand = lowerNewTranscript.includes('stop') || 
                             lowerNewTranscript.includes('scroll up') || 
                             lowerNewTranscript.includes('scroll down');
    
    // IMPROVED: Add specific protection for short commands like "ex" that might be incomplete
    const isPotentialPartialCommand = lowerNewTranscript.length < 4 || // Very short commands are likely partial
                                     (lowerNewTranscript.includes('ex') && lowerNewTranscript.length <= 3); // "ex" is likely partial for "exit"
    
    // If this is very similar to the last processed transcript, we may want to wait
    // for more words to come in (partial phrase issue like "excellent" → "excellent product")    // BUT: Skip this delay for critical commands that need immediate processing
    if ((!isCriticalCommand && 
        lastProcessedCommandRef.current.command && 
        newTranscript.toLowerCase().includes(lastProcessedCommandRef.current.command.toLowerCase()) &&
        newTranscript.split(' ').length < 5) || isPotentialPartialCommand) {
        // If it's a very short phrase, wait a bit longer to see if more words come in
      console.log('[SpeechController] Detected potential partial phrase, waiting for more input...');
      
      // Clear any existing timeout and set a new one
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
      
      // IMPROVED: Use longer wait for potential partial commands (especially short ones like "ex")
      const waitTime = isPotentialPartialCommand ? 1500 : 1000; // Use longer wait for potential partial commands
      
      commandTimeoutRef.current = setTimeout(() => {
        console.log('[SpeechController] Processing after wait: ', newTranscript);
        processFullTranscript(newTranscript);
      }, waitTime);
      
      return;
    }
    
    // Process the transcript immediately (including critical commands)
    processFullTranscript(newTranscript);
  };
  
  // Helper function to actually process the transcript after any waiting periods
  const processFullTranscript = (transcriptText) => {
    const cleanedTranscript = removeStutteredPhrases(removeDuplicateWords(transcriptText));
    const lowerTranscript = cleanedTranscript.toLowerCase().trim();
    console.log('[SpeechController] Processing complete transcript:', lowerTranscript);
    
    let foundCommand = false;    const commands = {
      // Essential commands only - ordered by priority
      'scroll down': () => handleVoiceCommand('scroll down'),
      'scroll up': () => handleVoiceCommand('scroll up'),
      'stop': () => handleVoiceCommand('stop'),
      'exit': () => handleVoiceCommand('exit'),
      'bottom': () => handleVoiceCommand('bottom'),
      'top': () => handleVoiceCommand('top'),
      'shopping': () => handleVoiceCommand('shopping'),
      'close': () => handleVoiceCommand('close'),
      'back': () => handleVoiceCommand('back'),
      'check out': () => handleVoiceCommand('check out'),
      'view all orders': () => handleVoiceCommand('view all orders'),
      'cancel order': () => handleVoiceCommand('cancel order'),
      'cancel': () => reviewVoiceState.active ? handleVoiceCommand('cancel review') : null,
      'make order': () => handleVoiceCommand('make order'),
      'plus': () => handleVoiceCommand('plus'),
      'minus': () => handleVoiceCommand('minus'),      'add': () => handleVoiceCommand('add'),
      'review': () => handleVoiceCommand('review'),
      'submit': () => reviewVoiceState.active ? handleVoiceCommand('submit review') : null,
      'next section': () => reviewVoiceState.active ? handleVoiceCommand('next section') : null, // Don't change this - it's working for title step
      'last section': () => reviewVoiceState.active ? handleVoiceCommand('last section') : null,
      'clear': () => reviewVoiceState.active ? handleVoiceCommand('clear') : null,
      'yes': () => reviewVoiceState.active && reviewVoiceState.step === 'recommendation' ? handleVoiceCommand('yes') : null,
      'no': () => reviewVoiceState.active && reviewVoiceState.step === 'recommendation' ? handleVoiceCommand('no') : null,
      'electronics': () => handleVoiceCommand('electronics'),
      'groceries': () => handleVoiceCommand('groceries'),
      'grocery': () => handleVoiceCommand('grocery'),
      'wearnings': () => handleVoiceCommand('wearnings'),
      'wearing': () => handleVoiceCommand('wearing'),
      'we ring': () => handleVoiceCommand('we ring'),      'all products': () => handleVoiceCommand('all products'),
      'home': () => handleVoiceCommand('home'),
      'register': () => handleVoiceCommand('register'),
      'menu': () => handleVoiceCommand('menu'),
      'profile': () => handleVoiceCommand('profile'),
      'list': () => handleVoiceCommand('list'),
      'orders': () => handleVoiceCommand('orders'),
      'add all': () => handleVoiceCommand('add all'),
    };// Handle dynamic "unlike [number]" commands
    const unlikeMatch = lowerTranscript.match(/\bunlike\s+(\w+)\b/);
    if (unlikeMatch) {
      const numberText = unlikeMatch[1];
      console.log(`[SpeechController] Detected "unlike ${numberText}" command`);
      handleVoiceCommand(`unlike ${numberText}`);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }
    
    // Handle dynamic "like [number]" commands
    const likeMatch = lowerTranscript.match(/\blike\s+(\w+)\b/);
    if (!foundCommand && likeMatch) {
      const numberText = likeMatch[1];
      console.log(`[SpeechController] Detected "like ${numberText}" command`);
      handleVoiceCommand(`like ${numberText}`);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }
    
    if (reviewVoiceState.active) {
      if (reviewVoiceState.step === 'rating') {
        const numberWordsRating = ['one', 'two', 'three', 'four', 'five', '1', '2', '3', '4', '5'];
        const hasNumberWord = numberWordsRating.some(word => lowerTranscript === word || lowerTranscript.includes(word));
        if (hasNumberWord) {
          handleVoiceCommand(lowerTranscript); 
          foundCommand = true;
          return; // Exit early to prevent double processing
        }
      }
        const explicitReviewActionCommands = [
        'next section', 'last section', 
        'submit review', 'submit', 
        'cancel review', 'cancel',
        'clear', 'clear text', 'clear title', 'clear comment',
        'recommend', "don't recommend", "do not recommend", "not recommend", "yes", "no"
      ];      
      // Special handling for "next section" command to ensure it works in comment step
      if (lowerTranscript === 'next section' && reviewVoiceState.step === 'comment') {
        console.log('[SpeechController] Detected critical "next section" command in comment step, handling directly');
        handleVoiceCommand('next section');
        foundCommand = true;
        return; // Exit early to ensure the command is processed
      }
      
      // Check for other explicit commands
      let isExplicitAction = lowerTranscript === 'next section' || 
                             explicitReviewActionCommands.some(cmd => lowerTranscript.toLowerCase().includes(cmd.toLowerCase()));
                             
      if (!foundCommand && isExplicitAction) {
        // First try exact match
        if (commands[lowerTranscript]) {
            const result = commands[lowerTranscript]();
            if (result !== null) {
              foundCommand = true;
            }
        } 
        
        if (!foundCommand) {
            // If not exact match, find the command that's included in the transcript
            for (const cmd of explicitReviewActionCommands) {
              if (lowerTranscript.includes(cmd) && commands[cmd]) {
                const result = commands[cmd]();
                if (result !== null) {
                  foundCommand = true;
                  break;
                }
              }
            }
        }
      }      if (!foundCommand &&
          (reviewVoiceState.step === 'title' || reviewVoiceState.step === 'comment') &&
          lowerTranscript.length > 0 &&
          !isExplicitAction && 
          lowerTranscript !== 'next section' && // Never treat "next section" as text input
          !lowerTranscript.includes('next section')) { // Also prevent longer phrases containing "next section"

        phraseBufferRef.current = lowerTranscript;
        console.log(`[SpeechController] Phrase buffer SET to: "${phraseBufferRef.current}" (based on transcript: "${lowerTranscript}")`);

        clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = setTimeout(() => {
          const completePhrase = phraseBufferRef.current.trim();
          phraseBufferRef.current = '';        if (completePhrase) {
          console.log(`[SpeechController] Timeout: Processing buffered phrase: "${completePhrase}"`);
          let cleanedForRepetitionCheck = removeDuplicateWords(completePhrase);
          let finalPhraseToAppend = removeStutteredPhrases(cleanedForRepetitionCheck);
          finalPhraseToAppend = finalPhraseToAppend.trim();
          cleanedForRepetitionCheck = finalPhraseToAppend;

          console.log(`[SpeechController] Timeout: Fully cleaned phrase: "${finalPhraseToAppend}" (from "${completePhrase}")`);          // Final check to ensure "next section" is never added to text fields
          if (finalPhraseToAppend && 
              finalPhraseToAppend.toLowerCase() !== 'next section' && 
              !finalPhraseToAppend.toLowerCase().includes('next section')) {
            if (reviewVoiceState.step === 'title') {
              // Update only once to prevent duplication
              setReviewVoiceState(prev => {
                if (prev.reviewData.title && isJustRepetition(prev.reviewData.title, cleanedForRepetitionCheck)) {
                  console.log('[SpeechController] Detected repetition in title, not adding');
                  return prev;
                }
                const newTitle = prev.reviewData.title ? `${prev.reviewData.title} ${finalPhraseToAppend}` : finalPhraseToAppend;
                
                // Also update voiceReviewData in the same operation
                const updatedTitle = removeStutteredPhrases(newTitle);
                setVoiceReviewData(prevReview => {
                  if (!prevReview) return { title: updatedTitle };
                  return { ...prevReview, title: updatedTitle };
                });
                
                return {
                  ...prev,
                  reviewData: { ...prev.reviewData, title: updatedTitle }
                };
              });
            } else if (reviewVoiceState.step === 'comment') {
              // Update only once to prevent duplication
              setReviewVoiceState(prev => {
                if (prev.reviewData.reviewText && isJustRepetition(prev.reviewData.reviewText, cleanedForRepetitionCheck)) {
                  console.log('[SpeechController] Detected repetition in comment, not adding');
                  return prev;
                }
                const newText = prev.reviewData.reviewText ? `${prev.reviewData.reviewText} ${finalPhraseToAppend}` : finalPhraseToAppend;
                
                // Also update voiceReviewData in the same operation
                const updatedText = removeStutteredPhrases(newText);
                setVoiceReviewData(prevReview => {
                  if (!prevReview) return { reviewText: updatedText };
                  return { ...prevReview, reviewText: updatedText };
                });
                
                return {
                  ...prev,
                  reviewData: { ...prev.reviewData, reviewText: updatedText }
                };
              });
            }
          }
          }
        }, 800);
        foundCommand = true; 
      }
    }    const itemMatch = lowerTranscript.match(/item\s+([\w\d]+)$/);
    if (!foundCommand && itemMatch) {
      handleVoiceCommand(itemMatch[0]);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }    
    
    const removeMatch = lowerTranscript.match(/remove\s+([\w\d]+)$/);
    if (!foundCommand && removeMatch) {
      handleVoiceCommand(removeMatch[0]);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }    
    
    // Check for indexed cancel commands: "cancel [number]"
    const cancelMatch = lowerTranscript.match(/cancel\s+([\w\d]+)$/);
    if (!foundCommand && cancelMatch) {
      handleVoiceCommand(cancelMatch[0]);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }    
    
    // Check for indexed view commands: "view [number]"
    const viewMatch = lowerTranscript.match(/view\s+([\w\d]+)$/);
    if (!foundCommand && viewMatch) {
      handleVoiceCommand(viewMatch[0]);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }
    
    // Check for email pattern: "email [name]"
    const emailMatch = lowerTranscript.match(/email\s+([\w\d]+)$/);
    if (!foundCommand && emailMatch) {
      handleVoiceCommand(emailMatch[0]);
      foundCommand = true;
      return; // Exit early to prevent double processing
    }
    
    // IMPROVED: Special protection for short commands like "exit" to prevent "ex" from being processed
    // Skip commands that are too short (less than 3 characters) - likely partial transcripts
    if (!foundCommand && lowerTranscript.length < 3) {
      console.log(`[SpeechController] Skipping short transcript: "${lowerTranscript}" - likely partial`);
      return;
    }
      // Check if there's a focused input element and no command was found
    // This allows for direct dictation into focused input fields
    if (!foundCommand && !reviewVoiceState.active) {      
      const focusedElement = document.activeElement;
      
           
      // Check if the transcript matches any exit commands first
      const exitCommands = ['exit', 'exit field', 'exit focus', 'unfocus'];
      // Add refresh to the list of special commands that should not be typed into fields
      const specialCommands = [...exitCommands, 'refresh'];
      
      // IMPROVED: Check for exact special commands only - no partial matching to prevent "ex" being processed as "exit"
      const isExactSpecialCommand = specialCommands.includes(lowerTranscript);
      
      if (isExactSpecialCommand) {
        console.log(`[SpeechController] Special command detected: "${lowerTranscript}"`);
        if (lowerTranscript === 'refresh') {
          handleVoiceCommand('refresh');
        } else {
          handleVoiceCommand('exit');
        }
        foundCommand = true;
        return; // Return early to prevent further processing
      } else if (focusedElement && (focusedElement.tagName === 'INPUT' || focusedElement.tagName === 'TEXTAREA')) {
        // Skip for password fields for security
        const inputType = focusedElement.getAttribute('type') || 'text';
        if (inputType !== 'password' && inputType !== 'email') {
          console.log('[SpeechController] Direct input to focused field:', lowerTranscript);
          
          // Check if the input type supports selection
          const supportsSelection = focusedElement.tagName === 'TEXTAREA' || 
                                  ['text', 'search', 'url', 'tel'].includes(inputType.toLowerCase());
          
          // Get current cursor position or selection if supported
          const startPos = supportsSelection ? (focusedElement.selectionStart || 0) : focusedElement.value.length;
          const endPos = supportsSelection ? (focusedElement.selectionEnd || 0) : focusedElement.value.length;
          
          // Current value of the input field
          const currentValue = focusedElement.value;
          
          // Insert text at cursor position or append to end
          const newValue = currentValue.substring(0, startPos) + lowerTranscript + currentValue.substring(endPos);
          focusedElement.value = newValue;
          
          // Set cursor position after the inserted text only for input types that support it
          if (supportsSelection) {
            try {
              focusedElement.selectionStart = startPos + lowerTranscript.length;
              focusedElement.selectionEnd = startPos + lowerTranscript.length;
            } catch (e) {
              console.log('[SpeechController] Could not set selection for this input type:', inputType);
            }
          }
          
          // Trigger input event to notify React or other frameworks of the change
          const inputEvent = new Event('input', { bubbles: true });
          focusedElement.dispatchEvent(inputEvent);
          
          foundCommand = true;
        }
      }
    }
    
    if (!foundCommand) {
      // Sort commands by phrase length (descending) to prioritize longer, more specific phrases
      const sortedCommands = Object.entries(commands).sort((a, b) => b[0].length - a[0].length);
      
      for (const [phrase, commandFunction] of sortedCommands) {
        if (lowerTranscript.includes(phrase)) {
           const result = commandFunction();
           if (result !== null) {
             foundCommand = true;
             break; 
           }
        }
      }
    }
    
    if (!foundCommand && !reviewVoiceState.active) { // Only log if not in active review and command not found
        console.log('[SpeechController] processFullTranscript: Command not recognized or already handled by review input:', lowerTranscript);
    }
    
    lastTranscriptRef.current = cleanedTranscript;
  };
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      itemCommandProcessingRef.current = false; // Reset item processing flag on cleanup
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  useEffect(() => {
    processTranscriptChange(transcript);
  }, [transcript]);
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.error('[SpeechController] Speech recognition not supported in this browser.');
      return;
    }       // Helper function to detect exit commands - can be used globally
    const detectExitCommand = (text) => {
      if (!text) return false;
      const exitCommands = ['exit', 'exit field', 'exit focus', 'unfocus'];
      const lowerText = text.toLowerCase().trim();
      
      // IMPROVED: Use exact matching only to prevent "ex" from triggering exit
      return exitCommands.includes(lowerText);
    };

    // Global transcript handler to catch exit commands even when input fields have focus
    const globalTranscriptHandler = (event) => {
      const transcript = event.detail?.transcript;
      if (transcript && detectExitCommand(transcript)) {
        console.log('[SpeechController] Global handler caught exit command:', transcript);
        handleVoiceCommand('exit');
      }
    };

    // Add custom event listener for transcript processing
    window.addEventListener('speech-transcript', globalTranscriptHandler);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognitionAPI();

    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true; // Process interim results for faster feedback if needed by processTranscriptChange
    recognitionInstance.lang = 'en-US';

    recognitionRef.current = recognitionInstance; // Store instance for access in cleanup

    recognitionInstance.onstart = () => {
      console.log('[SpeechController] Speech recognition service started.');
    };    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // Collect all transcripts from the event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';  // Add space to ensure words don't run together
        } else {
          interimTranscript += event.results[i][0].transcript + ' '; // Add space for interim results too
        }
      }
        // Apply advanced deduplication to final transcript before processing
      if (finalTranscript) {
        const cleanedFinalTranscript = removeStutteredPhrases(removeDuplicateWords(finalTranscript));
        console.log(`[SpeechController] Final transcript cleaned: "${finalTranscript}" → "${cleanedFinalTranscript}"`);
          // First, check if this is a duplicate of the most recently processed command
        const isDuplicate = cleanedFinalTranscript.trim().toLowerCase() === lastProcessedCommandRef.current.command.toLowerCase();
        if (isDuplicate) {
          console.log('[SpeechController] Skipping duplicate transcript:', cleanedFinalTranscript.trim());
          return;
        }
        
        // Dispatch a custom event with the transcript to enable global listeners
        // This helps catch exit commands even when input fields have focus
        const customEvent = new CustomEvent('speech-transcript', { 
          detail: { transcript: cleanedFinalTranscript.trim() },
          bubbles: true
        });
        document.dispatchEvent(customEvent);        // Store in a buffer to prevent cutting off phrases
        if (reviewVoiceState.active && (reviewVoiceState.step === 'title' || reviewVoiceState.step === 'comment')) {          // Check for "next section" command - never add it to text fields and ensure it's properly processed
          const cleanedLower = cleanedFinalTranscript.toLowerCase().trim();
          if (cleanedLower === 'next section' || cleanedLower.includes('next section')) {
            console.log('[SpeechController] Detected "next section" command in speech recognition result');
            
            // Critical fix: Handle the next section command directly and immediately
            if (reviewVoiceState.step === 'comment') {
              console.log('[SpeechController] In comment step - directly executing next section command');
              handleVoiceCommand('next section');
            } else {
              // For other states, process through regular flow
              setTranscript('next section');
            }
            return; // Exit to prevent treating as text
          }
          
          // If we're in title or comment mode, buffer the speech to ensure we get complete phrases
          clearTimeout(commandTimeoutRef.current);
          
          commandTimeoutRef.current = setTimeout(() => {
            if (cleanedFinalTranscript.trim()) {
              setTranscript(cleanedFinalTranscript.trim());
            }
          }, 800); // Wait to capture more complete phrases
        } else {
          // For other commands, process immediately
          if (cleanedFinalTranscript.trim()) {
            setTranscript(cleanedFinalTranscript.trim());
          }
        }
      } else if (interimTranscript) {
        // Also clean interim results for better user feedback
        const cleanedInterimTranscript = removeDuplicateWords(interimTranscript);
        // Don't set transcript for very short interim results as they're likely incomplete
        if (cleanedInterimTranscript.trim().length > 2) {
          setTranscript(cleanedInterimTranscript.trim());
        }
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('[SpeechController] Speech recognition error:', event.error, 'Message:', event.message);
      // You might want to add logic here to decide if restarting is appropriate based on the error type
    };

    recognitionInstance.onend = () => {
      console.log('[SpeechController] Speech recognition service ended.');
      // Check if the component is still mounted and recognitionRef still holds this instance
      // This check helps prevent trying to restart if stop() was called during cleanup
      if (recognitionRef.current === recognitionInstance) {
        console.log('[SpeechController] Attempting to restart speech recognition...');
        try {
          recognitionInstance.start();
        } catch (e) {
          console.error('[SpeechController] Error attempting to restart recognition:', e);
        }
      } else {
        console.log('[SpeechController] Speech recognition ended, but not restarting (likely due to component unmount or instance change).');
      }
    };

    try {
      console.log('[SpeechController] Initializing and starting speech recognition...');
      recognitionInstance.start();
    } catch (e) {
      console.error('[SpeechController] Error starting speech recognition initially:', e);
    }    return () => {
      console.log('[SpeechController] Cleanup: Stopping speech recognition.');
      // Remove custom event listener
      window.removeEventListener('speech-transcript', globalTranscriptHandler);
      
      if (recognitionRef.current) {
        // Important: Nullify onend before calling stop to prevent restart during cleanup
        recognitionRef.current.onend = null; 
        recognitionRef.current.stop();
        recognitionRef.current = null; // Clear the ref after stopping
      }
      // Clear any timers
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = null;
      }
      // Reset item processing flag
      itemCommandProcessingRef.current = false;
    };  }, []); // Empty dependency array: runs once on mount, cleans up on unmount

  return (
    <div className="speech-controller">
      <div className="speech-indicator">
        <div className="microphone-icon">🎤</div>
        {transcript && <div className="transcript">{transcript}</div>}
          {/* Review section indicator */}
        {reviewVoiceState.active && (
          <div className="review-status">
            <div className="section-indicator">
              {reviewVoiceState.step === 'rating' && (
                <>
                  <span className="section-title">Review: Rating</span>
                  <span className="section-help">Say a number 1-5</span>
                </>
              )}
              {reviewVoiceState.step === 'title' && (
                <>
                  <span className="section-title">Review: Title</span>
                  <span className="section-help">Just speak to add text</span>
                  {reviewVoiceState.reviewData.title && (
                    <span className="current-text">{reviewVoiceState.reviewData.title}</span>
                  )}
                </>
              )}
              {reviewVoiceState.step === 'comment' && (
                <>
                  <span className="section-title">Review: Comment</span>
                  <span className="section-help">Just speak to add text</span>
                  {reviewVoiceState.reviewData.reviewText && (
                    <span className="current-text">{reviewVoiceState.reviewData.reviewText}</span>
                  )}
                </>
              )}
              {reviewVoiceState.step === 'recommendation' && (
                <>
                  <span className="section-title">Review: Recommend?</span>
                  <span className="section-help">Say "yes" or "no"</span>
                </>
              )}
              {reviewVoiceState.step === 'final' && (
                <>
                  <span className="section-title">Review: Ready</span>
                  <span className="section-help">Say "submit" to finish</span>
                </>
              )}
              <div className="commands-help">
                <span>"next section" - move forward</span>
                <span>"last section" - move back</span>
                <span>"clear" - delete current text</span>
                <span>"submit" - save review</span>
                <span>"cancel" - exit review</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`        .speech-controller {
          position: fixed;
          bottom: 40px;
          right: 40px;
          z-index: 1000;
        }

        .speech-indicator {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          border-radius: 50%;
          background-color: rgba(255, 0, 0, 0.7);
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
          animation: pulse 1.5s infinite;
        }.microphone-icon {
          font-size: 36px;
        }        .transcript {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 15px;
          max-width: 300px;
          min-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          right: auto;
        }
          .review-status {
          position: fixed;
          right: 80px;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 5px;
          font-size: 16px;
          white-space: nowrap;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          min-width: 250px;
          max-width: 300px;
        }
        
        .section-indicator {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 18px;
          color: #fff;
        }
        
        .section-help {
          font-style: italic;
          color: #ccc;
        }
        
        .current-text {
          font-size: 14px;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          padding: 4px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .commands-help {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          display: flex;
          flex-direction: column;
          font-size: 12px;
          color: #aaa;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SpeechController;


