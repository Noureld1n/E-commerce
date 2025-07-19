import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useStateContext } from '../context/StateContext';
import { api } from '../lib/client';
import { AiOutlineArrowLeft, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineHome } from 'react-icons/ai';
import styles from '../styles/addresses.module.css';

const Addresses = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useStateContext();
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zipcode: '',
    addressType: 'HOME',
    isDefault: false
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user) {
      loadAddresses();
    }
  }, [isAuthenticated, loading, user, router]);

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await api.addresses.getAll();
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Failed to load addresses');
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requiredFields = ['street', 'city', 'state'];
      const missingFields = requiredFields.filter(field => !formData[field].trim());
      
      if (missingFields.length > 0) {
        toast.error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      const addressPayload = {
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipcode: formData.zipcode.trim() || null,
        addressType: formData.addressType,
        isDefault: formData.isDefault || false
      };

      let response;
      if (editingAddress) {
        response = await api.addresses.update(editingAddress.addressId, addressPayload);
        toast.success('Address updated successfully');
      } else {
        response = await api.addresses.create(addressPayload);
        toast.success('Address added successfully');
      }

      await loadAddresses();
      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save address';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (address) => {
    setFormData({
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipcode: address.zipcode || '',
      addressType: address.addressType || 'HOME',
      isDefault: address.isDefault || false
    });
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleDelete = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await api.addresses.delete(addressId);
        toast.success('Address deleted successfully');
        await loadAddresses();
      } catch (error) {
        console.error('Error deleting address:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete address';
        toast.error(errorMessage);
      }
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await api.addresses.setDefault(addressId);
      toast.success('Default address updated');
      await loadAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      const errorMessage = error.response?.data?.message || 'Failed to set default address';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      street: '',
      city: '',
      state: '',
      zipcode: '',
      addressType: 'HOME',
      isDefault: false
    });
    setShowAddForm(false);
    setEditingAddress(null);
  };

  const handleCancel = () => {
    resetForm();
  };

  if (loading) {
    return (
      <div className="addresses-container">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  return (
    <div className={styles.addressesContainer}>
      <div className={styles.addressesHeader}>
        <button 
          type="button" 
          className={styles.backButton}
          onClick={() => router.push('/profile')}
        >
          <AiOutlineArrowLeft />
          Back to Profile
        </button>
        <h1>My Addresses</h1>
      </div>

      <div className={styles.addressesContent}>
        {!showAddForm && (
          <div className={styles.addressesActions}>
            <button 
              type="button" 
              className={styles.addAddressBtn}
              onClick={() => setShowAddForm(true)}
            >
              <AiOutlinePlus />
              Add New Address
            </button>
          </div>
        )}

        {showAddForm && (          <div className={styles.addressFormSection}>
            <div className={styles.formHeader}>
              <h2>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.addressForm}>
              <div className={styles.formGroup}>
                <label htmlFor="addressType">Address Type *</label>
                <select
                  id="addressType"
                  name="addressType"
                  value={formData.addressType}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                >
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="street">Street Address *</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="zipcode">Zip Code</label>
                <input
                  type="text"
                  id="zipcode"
                  name="zipcode"
                  value={formData.zipcode}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="12345"
                />
              </div>              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  Set as default address
                </label>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.saveBtn}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editingAddress ? 'Update Address' : 'Save Address')}
                </button>
              </div>
            </form>
          </div>
        )}        {!showAddForm && (
          <div className={styles.addressesList}>
            {isLoading ? (
              <div className={styles.loading}>Loading addresses...</div>
            ) : addresses.length === 0 ? (
              <div className={styles.noAddresses}>
                <AiOutlineHome size={60} />
                <h3>No addresses found</h3>
                <p>Add your first address to make checkout easier</p>
              </div>
            ) : (
              <div className={styles.addressesGrid}>
                {addresses.map((address) => (
                  <div key={address.addressId} className={`${styles.addressCard} ${address.isDefault ? styles.default : ''}`}>
                    <div className={styles.addressHeader}>
                      <div className={styles.addressType}>
                        <AiOutlineHome />
                        <span>{address.addressType}</span>
                        {address.isDefault && <span className={styles.defaultBadge}>Default</span>}
                      </div>
                      <div className={styles.addressActions}>                        <button 
                          type="button" 
                          className={styles.editAddressBtn}
                          onClick={() => handleEdit(address)}
                        >
                          <AiOutlineEdit />
                        </button>
                        <button 
                          type="button" 
                          className={styles.deleteAddressBtn}
                          onClick={() => handleDelete(address.addressId)}
                        >
                          <AiOutlineDelete />
                        </button>
                        {!address.isDefault && (
                          <button 
                            type="button" 
                            className={styles.setDefaultBtn}
                            onClick={() => handleSetDefault(address.addressId)}
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.addressDetails}>
                      <p><strong>{address.street}</strong></p>
                      <p>{address.city}, {address.state} {address.zipcode}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Addresses;
