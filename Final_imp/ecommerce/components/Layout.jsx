import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from './Navbar';
import FooterBanner from './FooterBanner';
import SpeechController from './SpeechController';

const Layout = ({children}) => {
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith('/admin');
  return (
    <div className={`layout ${isAdminPage ? 'admin-layout' : ''}`}>
      <Head>
        <title>
          {isAdminPage ? 'Admin Dashboard - Lasheen Store' : 'Lasheen Store'}
        </title>
      </Head>
      {!isAdminPage && (
        <header>
          <Navbar />
        </header>
      )}
      <main className={`main-container ${isAdminPage ? 'admin-main' : ''}`}>
        {children}
      </main>
      {!isAdminPage && (
        <footer>
          <FooterBanner />
        </footer>
      )}
      {!isAdminPage && <SpeechController />}
    </div>
  )
}

export default Layout
