-- Product Types table
CREATE TABLE acted_product_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Subtypes table
CREATE TABLE acted_product_subtypes (
    id SERIAL PRIMARY KEY,
    product_type_id INTEGER REFERENCES acted_product_types(id),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_type_id, name)
);

-- Modify existing products table to include type and subtype
ALTER TABLE acted_products
ADD COLUMN product_type_id INTEGER REFERENCES acted_product_types(id),
ADD COLUMN product_subtype_id INTEGER REFERENCES acted_product_subtypes(id)