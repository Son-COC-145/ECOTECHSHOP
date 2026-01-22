import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from '../pages/SignIn';
import Products from '../pages/Products';
import { useAuth } from '../context/AuthContext';

const AuthRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route
          path="/products"
          element={
            isAuthenticated && isAdmin ? (
              <Products />
            ) : (
              <Navigate to="/sign-in" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/sign-in" />} />
      </Routes>
    </Router>
  );
};

export default AuthRoutes;
