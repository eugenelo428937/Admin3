import React from 'react';
import Card from '@mui/material/Card';
import { styled, useThemeProps } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';

// Wrapper around MUI Card that enables base + subvariant theming via theme.components.ProductCard.variants
// Filters custom props so they don't leak to the DOM and forwards the rest to Card.
const BaseProductCardStyled = styled(Card, {
    name: 'BaseProductCard',
    slot: 'Root',
    shouldForwardProp: (prop) => prop !== 'variant' && prop !== 'productype',
    overridesResolver: (_props: any, styles: any) => styles.root,
})(({ theme, ownerState }: { theme: any; ownerState?: any }) => {
    let resolved: any = {};

    const componentConfig = theme.components?.ProductCard;
    if (componentConfig?.styleOverrides?.root) {
        resolved = deepmerge(resolved, componentConfig.styleOverrides.root);
    }

    if (Array.isArray(componentConfig?.variants)) {
        componentConfig.variants.forEach((variantDef: any) => {
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

export default function ProductCard(inProps: any) {
    const props = useThemeProps({ props: inProps, name: 'BaseProductCard' });
    const { variant = 'product', producttype, ...other } = props;

    const ownerState = { variant, producttype };
    return <BaseProductCardStyled ownerState={ownerState} {...other} />;
}

// Helpful for devtools/debugging
BaseProductCardStyled.muiName = 'BaseProductCard';
