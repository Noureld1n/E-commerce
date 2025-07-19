import React, { useState, useEffect } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import { useRouter } from 'next/router';
import { api } from '../lib/client';
import { Product } from './';

const SearchResults = () => {
  const router = useRouter();
  const { q: searchQuery } = router.query;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (searchQuery) {
      searchProducts(searchQuery);
    }
  }, [searchQuery]);  const searchProducts = async (query, page = 0) => {
    try {
      setLoading(true);
      const response = await api.products.search({
        keyword: query,
        page: page,
        size: 12
      });
      
      if (response.data.content) {
        setProducts(response.data.content);
        setTotalResults(response.data.totalElements);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.number);
      } else {
        // Fallback for simple array response
        setProducts(response.data || []);
        setTotalResults(response.data?.length || 0);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setProducts([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      searchProducts(searchQuery, newPage);
    }
  };

  if (loading) {
    return (
      <div className="search-results-container">
        <div className="loading-container">
          <div className="loading-spinner">Searching products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <div className="search-header">
        <h1>Search Results</h1>
        {searchQuery && (
          <p className="search-query">
            {totalResults > 0 
              ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${searchQuery}"`
              : `No results found for "${searchQuery}"`
            }
          </p>
        )}
      </div>

      {products.length > 0 ? (
        <>
          <div className="search-results-grid">
            {products.map((product, index) => (
              <Product 
                key={product.id || product.productId} 
                product={product} 
                productNumber={index + 1}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <div className="pagination-info">
                Page {currentPage + 1} of {totalPages}
              </div>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        !loading && searchQuery && (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h2>No products found</h2>
            <p>Try adjusting your search terms or browse our categories</p>
            <button 
              className="btn-primary"
              onClick={() => router.push('/')}
            >
              Browse All Products
            </button>
          </div>
        )
      )}
    </div>
  );
};

const SearchBar = ({ onSearch, placeholder = "Search products..." }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim()) {
      setIsLoading(true);
      if (onSearch) {
        await onSearch(query.trim());
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-container">        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          disabled={isLoading}
        />
        {query && (
          <button 
            type="button" 
            onClick={handleClear}
            className="search-clear-btn"
            disabled={isLoading}
          >
            ×
          </button>
        )}
        <button 
          type="submit" 
          className="search-btn"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <div className="loading-spinner-small">⟳</div>
          ) : (
            <AiOutlineSearch />
          )}
        </button>
      </div>
    </form>
  );
};

export { SearchResults, SearchBar };
