import React, { createContext, useContext, useState, useEffect } from "react";
import productService from "../services/productService";
import { useConfig } from "./ConfigContext.js";

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isInternal, configLoaded } = useConfig();

  useEffect(() => {
    if (!configLoaded) return;

    if (isInternal) {
      setLoading(false);
      return;
    }

    productService.getAvailableProducts().then(
      (response) => {
        setProducts(response.products || []);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );
  }, [configLoaded, isInternal]);

  const value = {
    products,
    setProducts,
    loading,
    setLoading,
    error,
    setError,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};

export default ProductContext;
