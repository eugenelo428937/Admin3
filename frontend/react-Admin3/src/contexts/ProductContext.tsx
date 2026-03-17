import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import productService from "../services/productService";
import { useConfig } from "./ConfigContext";

interface ProductContextValue {
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: any;
  setError: React.Dispatch<React.SetStateAction<any>>;
}

interface ProductProviderProps {
  children: ReactNode;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const { isInternal, configLoaded } = useConfig();

  useEffect(() => {
    if (!configLoaded) return;

    if (isInternal) {
      setLoading(false);
      return;
    }

    productService.getAvailableProducts().then(
      (response: any) => {
        setProducts(response.products || []);
        setLoading(false);
      },
      (error: any) => {
        setError(error);
        setLoading(false);
      }
    );
  }, [configLoaded, isInternal]);

  const value: ProductContextValue = {
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

export const useProduct = (): ProductContextValue => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
};

export const useProducts = (): ProductContextValue => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};

export { ProductContext };
export default ProductContext;
