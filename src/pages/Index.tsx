
import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { POSProvider } from '@/contexts/POSContext';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import TableGrid from '@/components/TableGrid';
import OrderPlacement from '@/components/OrderPlacement';
import AdminView from '@/components/AdminView';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const handleTableSelect = (tableId: number) => {
    if (user.role === 'waiter') {
      setSelectedTable(tableId);
    }
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main>
        {user.role === 'admin' ? (
          <AdminView />
        ) : selectedTable ? (
          <OrderPlacement 
            tableId={selectedTable} 
            onBack={handleBackToTables}
          />
        ) : (
          <TableGrid onTableSelect={handleTableSelect} />
        )}
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <POSProvider>
        <Dashboard />
      </POSProvider>
    </AuthProvider>
  );
};

export default Index;
