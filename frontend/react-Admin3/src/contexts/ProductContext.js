import React, { createContext, useContext, useState, useEffect } from "react";
import productService from "../services/productService";

const ProductContext = createContext();

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getAvailableProducts().then((response) => {
        console.log(Date.now());
      setProducts(response.products || []);
      setLoading(false);
    });
  }, []);

  return (
    <ProductContext.Provider value={{ products, loading }}>
      {children}
    </ProductContext.Provider>
  );
};
