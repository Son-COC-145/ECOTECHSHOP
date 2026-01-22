// src/App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import ProductsPage from "./pages/ProductsPage";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import NavBar from "./components/NavBar";
import Revenue from './pages/Revenue';
import "./App.css";
import "./styles/sync-with-frontend.css";
import "./styles/design-system.css";
import "./styles/admin-navbar.css";
import "./styles/admin-dashboard.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-wrapper">
          <NavBar />
          <div className="main-content">
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/users" element={<Users />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="*" element={<SignIn />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;