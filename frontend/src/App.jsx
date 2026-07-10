import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './AppRoutes';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: '!rounded-xl !shadow-lg !border !border-gray-200 !font-sans',
              title: '!text-sm !font-medium',
              description: '!text-xs',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
