import React from "react";
import Card from "@mui/material/Card";
import { styled, useThemeProps } from "@mui/material/styles";
import { deepmerge } from "@mui/utils";

// Wrapper around MUI Card that enables base + subvariant theming via theme.components.ProductCard.variants
// Filters custom props so they don't leak to the DOM and forwards the rest to Card.
const BaseProductCard = styled(Card, {
	name: "BaseProductCard",
	slot: "Root",
	shouldForwardProp: (prop) => prop !== "variant" && prop !== "productType",
	overridesResolver: (props, styles) => styles.root,
})(({ theme, ownerState }) => {
	// Apply base styleOverrides if present
	let resolved = {};

	const componentConfig = theme.components?.ProductCard;
	if (componentConfig?.styleOverrides?.root) {
		resolved = deepmerge(resolved, componentConfig.styleOverrides.root);
	}

	// Apply matching variant styles manually for custom component
	if (Array.isArray(componentConfig?.variants)) {
		componentConfig.variants.forEach((variantDef) => {
			const { props, style } = variantDef;
			const matches = Object.entries(props || {}).every(
				([key, value]) => ownerState?.[key] === value
			);
			if (matches) {
				resolved = deepmerge(resolved, style || {});
			}
		});
	}

	return resolved;
});

export default function ProductCard(inProps) {
	const props = useThemeProps({ props: inProps, name: "BaseProductCard" });
	const { variant = "product", productType, ...other } = props;

	const ownerState = { variant, productType };
	return <BaseProductCard ownerState={ownerState} {...other} />;
}

// Helpful for devtools/debugging
BaseProductCard.muiName = "BaseProductCard";


