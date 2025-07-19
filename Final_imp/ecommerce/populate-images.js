// Script to populate products with images from Next.js assets folder
const API_BASE_URL = 'http://localhost:8080/api';

// Available product images from Next.js public/assets folder
const availableImages = [
  'earphones_a_1.webp',
  'earphones_a_2.webp', 
  'earphones_a_3.webp',
  'earphones_a_4.webp',
  'earphones_b_1.webp',
  'earphones_b_2.webp',
  'earphones_b_3.webp',
  'earphones_b_4.webp',
  'earphones_c_1.webp',
  'earphones_c_2.webp',
  'earphones_c_3.webp',
  'earphones_c_4.webp',
  'headphones_a_1.webp',
  'headphones_a_2.webp',
  'headphones_a_3.webp',
  'headphones_a_4.webp',
  'headphones_b_1.webp',
  'headphones_b_2.webp',
  'headphones_b_3.webp',
  'headphones_b_4.webp',
  'headphones_c_1.webp',
  'headphones_c_2.webp',
  'headphones_c_3.webp',
  'headphones_c_4.webp',
  'speaker1.webp',
  'speaker2.webp',
  'speaker3.webp',
  'speaker4.webp',
  'watch_1.webp',
  'watch_2.webp',
  'watch_3.webp',
  'watch_4.webp'
];

// Admin credentials - you'll need to replace these with actual admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = null;

// Login function
async function login() {
  try {
    console.log('Logging in as admin...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token || data.accessToken;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

// Function to get all products
async function getAllProducts() {
  try {
    console.log('Fetching all products...');
    const response = await fetch(`${API_BASE_URL}/products?size=100`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.content?.length || 0} products`);
    return data.content || [];
  } catch (error) {
    console.error('❌ Failed to fetch products:', error.message);
    throw error;
  }
}

// Function to add image to product via URL
async function addImageToProduct(productId, imageUrl, isMain = false) {
  try {
    const formData = new FormData();
    formData.append('imageUrl', imageUrl);
    formData.append('isMain', isMain.toString());

    const response = await fetch(`${API_BASE_URL}/products/${productId}/images/url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to add image: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Added image ${imageUrl} to product ${productId}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to add image ${imageUrl} to product ${productId}:`, error.message);
    throw error;
  }
}

// Function to generate image URL for Next.js assets
function generateImageUrl(imageName) {
  return `http://localhost:3000/assets/${imageName}`;
}

// Function to assign images to products based on product type
function getImagesForProduct(productName, productIndex) {
  const name = productName.toLowerCase();
  
  // Determine product type and assign appropriate images
  if (name.includes('earphone') || name.includes('earbud')) {
    const earphoneImages = availableImages.filter(img => img.includes('earphones'));
    const baseIndex = (productIndex % 3) * 4; // Use different sets for different products
    return earphoneImages.slice(baseIndex, baseIndex + 3).map(generateImageUrl);
  }
  
  if (name.includes('headphone')) {
    const headphoneImages = availableImages.filter(img => img.includes('headphones'));
    const baseIndex = (productIndex % 3) * 4;
    return headphoneImages.slice(baseIndex, baseIndex + 3).map(generateImageUrl);
  }
  
  if (name.includes('speaker')) {
    const speakerImages = availableImages.filter(img => img.includes('speaker'));
    return speakerImages.map(generateImageUrl);
  }
  
  if (name.includes('watch')) {
    const watchImages = availableImages.filter(img => img.includes('watch'));
    return watchImages.map(generateImageUrl);
  }
  
  // Default: assign random images
  const shuffled = availableImages.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2).map(generateImageUrl);
}

// Main function to populate all products with images
async function populateProductImages() {
  try {
    console.log('🚀 Starting image population process...');
    
    // Login first
    await login();
    
    // Get all products
    const products = await getAllProducts();
    
    if (products.length === 0) {
      console.log('⚠️ No products found to populate with images');
      return;
    }
    
    console.log(`\n📸 Populating ${products.length} products with images...`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n--- Processing Product ${i + 1}/${products.length}: ${product.productName} ---`);
      
      // Skip if product already has images
      if (product.images && product.images.length > 0) {
        console.log(`⏭️ Product ${product.productName} already has ${product.images.length} images, skipping...`);
        continue;
      }
      
      // Get appropriate images for this product
      const imageUrls = getImagesForProduct(product.productName, i);
      
      console.log(`📸 Adding ${imageUrls.length} images to ${product.productName}:`);
      imageUrls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
      
      // Add images (first one as main image)
      for (let j = 0; j < imageUrls.length; j++) {
        try {
          await addImageToProduct(product.productId, imageUrls[j], j === 0);
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to add image ${j + 1} to ${product.productName}`);
        }
      }
    }
    
    console.log('\n🎉 Image population completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Processed ${products.length} products`);
    console.log('- Images are now linked to products via URLs pointing to Next.js assets');
    console.log('- You can now test the image display in your frontend');
    
  } catch (error) {
    console.error('💥 Image population failed:', error.message);
  }
}

// Test function to check a single product
async function testSingleProduct(productId) {
  try {
    console.log(`🧪 Testing image addition for product ${productId}...`);
    
    await login();
    
    const testImageUrl = generateImageUrl('earphones_a_1.webp');
    console.log(`Adding test image: ${testImageUrl}`);
    
    await addImageToProduct(productId, testImageUrl, true);
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the population
if (require.main === module) {
  console.log('🎯 Image Population Script');
  console.log('========================');
  console.log('This script will add images from Next.js assets to products in the database');
  console.log('Make sure:');
  console.log('1. Spring Boot backend is running on localhost:8080');
  console.log('2. Next.js frontend is running on localhost:3000 (for assets)');
  console.log('3. You have admin credentials');
  console.log('');
  
  // Run population
  populateProductImages();
}

// Export functions for testing
module.exports = {
  populateProductImages,
  testSingleProduct,
  login,
  getAllProducts,
  addImageToProduct,
  generateImageUrl
};
