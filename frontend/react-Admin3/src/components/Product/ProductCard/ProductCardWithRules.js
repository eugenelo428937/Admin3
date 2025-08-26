import React, { useMemo } from 'react';
import { useProductCardRules } from '../../../hooks/useRulesEngine';
import ProductCard from './MaterialProductCard';

/**
 * Product Card wrapper that integrates with Rules Engine
 */
const ProductCardWithRules = ({ product, onAddToCart, allEsspIds, bulkDeadlines, ...props }) => {
  // Product card context for rules engine - memoize to prevent infinite loops
  const productContext = useMemo(() => ({
    product_id: product.id || product.product_id,
    essp_id: product.essp_id,
    product_code: product.product_code || product.code,
    category: product.category?.name || product.main_category,
    subject_code: product.subject?.code,
    variation_type: product.variation_type,
    price: product.price_ex_vat,
    has_expired_deadlines: product.has_expired_deadlines,
    tutorial_has_started: product.tutorial_has_started
  }), [
    product.id,
    product.product_id, 
    product.essp_id,
    product.product_code,
    product.code,
    product.category?.name,
    product.main_category,
    product.subject?.code,
    product.variation_type,
    product.price_ex_vat,
    product.has_expired_deadlines,
    product.tutorial_has_started
  ]);

  const { 
    rulesResult: productCardRulesResult, 
    rulesCount: productCardRulesCount,
    loading: productCardRulesLoading,
    evaluateRules
  } = useProductCardRules(productContext, false); // Disable auto-trigger

  // Manually trigger rules evaluation once on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      evaluateRules();
    }, Math.random() * 500); // Random delay between 0-500ms to prevent all cards hitting at once
    
    return () => clearTimeout(timer);
  }, [evaluateRules]);

  // Log debug info for each product card
  React.useEffect(() => {
    if (!productCardRulesLoading && productCardRulesCount !== undefined) {
      console.log(`🎯 Product Card [${product.id}]: ${productCardRulesCount} rules evaluated`);
    }
  }, [product.id, productCardRulesCount, productCardRulesLoading]);

  return (
    <ProductCard
      product={product}
      onAddToCart={onAddToCart}
      allEsspIds={allEsspIds}
      bulkDeadlines={bulkDeadlines}
      rulesResult={productCardRulesResult}
      {...props}
    />
  );
};

export default ProductCardWithRules;