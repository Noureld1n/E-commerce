import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useStateContext } from '../context/StateContext';
import { api } from '../lib/client';
import { AiOutlineUser, AiOutlineEdit, AiOutlineSave, AiOutlineClose, 
         AiOutlineHistory, AiOutlineHeart, AiOutlineEnvironment } from 'react-icons/ai';
import styles from '../styles/profile.module.css';

const Profile = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading, updateUserProfile } = useStateContext();
    const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user) {
      fetchUserProfile();
    }
  }, [isAuthenticated, loading, user, router]);
    const fetchUserProfile = async () => {
    try {
      const response = await api.users.getProfile();
      const userData = response.data;
      
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });
    } catch (error) {
      // Fallback to user context data
      if (user) {
        setProfileData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || ''
        });
      }
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const result = await updateUserProfile(profileData);
      if (result.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        // Refresh profile data from the updated user context
        setProfileData({
          firstName: result.data.firstName || '',
          lastName: result.data.lastName || '',
          email: result.data.email || '',
          phone: result.data.phone || ''
        });
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancel = () => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
    setIsEditing(false);
  };
  const handlePasswordUpdate = async () => {
    // Validate passwords
    if (!passwordData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!passwordData.newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // Create update payload with current profile data + passwords
      const updatePayload = {
        ...profileData,
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword
      };

      const result = await updateUserProfile(updatePayload);
      if (result.success) {
        toast.success('Password updated successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setIsChangingPassword(false);
      } else {
        toast.error(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsChangingPassword(false);
  };  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.profileIcon}>
          <AiOutlineUser size={60} />
        </div>
        <h1>My Profile</h1>
      </div>      
      
      <div className={styles.profileContent}>
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <h2>Personal Information</h2>
            {!isEditing ? (
              <button 
                type="button" 
                className={styles.editBtn}
                onClick={() => setIsEditing(true)}
              >
                <AiOutlineEdit />
                Edit
              </button>
            ) : (
              <div className={styles.editActions}>
                <button 
                  type="button" 
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <AiOutlineSave />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={handleCancel}
                >
                  <AiOutlineClose />
                  Cancel
                </button>
              </div>
            )}
          </div>          <div className={styles.profileForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled={true} // Email usually can't be changed
                  className={styles.formInput}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={styles.formInput}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <h2>Change Password</h2>
            {!isChangingPassword ? (
              <button 
                type="button" 
                className={styles.editBtn}
                onClick={() => setIsChangingPassword(true)}
              >
                <AiOutlineEdit />
                Change Password
              </button>
            ) : (
              <div className={styles.editActions}>
                <button 
                  type="button" 
                  className={styles.saveBtn}
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                >
                  <AiOutlineSave />
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={handleCancelPasswordChange}
                >
                  <AiOutlineClose />
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {isChangingPassword && (
            <div className={styles.passwordForm}>              <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ width: '50%' }}>
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                    placeholder="Enter your current password"
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                    placeholder="Enter new password"
                    minLength="6"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>
              </div>

              {passwordData.newPassword && passwordData.confirmPassword && (
                <div className={`${styles.passwordMatch} ${passwordData.newPassword === passwordData.confirmPassword ? styles.match : styles.noMatch}`}>
                  {passwordData.newPassword === passwordData.confirmPassword ? 
                    '✓ Passwords match' : 
                    '✗ Passwords do not match'
                  }
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.profileNavigation}>
          <div className={styles.navItem} onClick={() => router.push('/orders')}>
            <div className={styles.navIcon}>
              <AiOutlineHistory />
            </div>
            <div className={styles.navContent}>
              <h3>Order History</h3>
              <p>View your past orders and track current ones</p>
            </div>
          </div>
          
          <div className={styles.navItem} onClick={() => router.push('/wishlist')}>
            <div className={styles.navIcon}>
              <AiOutlineHeart />
            </div>
            <div className={styles.navContent}>
              <h3>Wishlist</h3>
              <p>Items you've saved for later</p>
            </div>
          </div>
          
          <div className={styles.navItem} onClick={() => router.push('/addresses')}>
            <div className={styles.navIcon}>
              <AiOutlineEnvironment />
            </div>
            <div className={styles.navContent}>
              <h3>Addresses</h3>
              <p>Manage your delivery addresses</p>
            </div>
          </div>
        </div>      </div>
    </div>
  );
};


export default Profile;
