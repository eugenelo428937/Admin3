import { Fragment } from "react";
import
{
    Card,
    CardContent,
    Container,
    Grid,
    Paper,
    Stack,
    Typography,
    useTheme
} from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import TextButton from "../../theme/components/styled-components/TextButton.styled";
import { Button, ContainedButton, OutlinedButton } from "../../theme/components/styled-components/Button.styled";


const BUTTON_STATES = [
    { state: 'default', label: 'Default' },
    { state: 'hover', label: 'Hover' },
    { state: 'active', label: 'Active' },
    { state: 'focus', label: 'Focus' },
    { state: 'disabled', label: 'Disabled' },
];

const BUTTON_VARIANTS = [
    { variant: 'text', label: 'Text Buttons', showColors: false },
    { variant: 'contained', label: 'Contained Buttons', showColors: true },
    { variant: 'outlined', label: 'Outlined Buttons', showColors: true },
];

const BUTTON_SIZES = [
    { size: 'small', label: 'Small' },
    { size: 'medium', label: 'Medium' },
    { size: 'large', label: 'Large' },
];

const BUTTON_COLOR_ROWS = [
    [
        { color: 'primary', label: 'Primary' },
        { color: 'secondary', label: 'Secondary' },
        { color: 'tertiary', label: 'Tertiary' },
    ],
    [
        { color: 'error', label: 'Error' },
        { color: 'warning', label: 'Warning' },
        { color: 'info', label: 'Info' },
        { color: 'success', label: 'Success' },
    ],
];

/**
 * Returns sx styles that force a button's visual pseudo-state as its
 * resting appearance. Reads colors and opacities from the theme so the
 * style guide stays in sync with any theme changes.
 */
const getButtonStateStyles = (variant, state, theme, color = 'primary') =>
{
    const p = theme.palette;
    const c = p[color] || p.primary;

    const focusRing = {
        outline: `2px solid ${c.main}`,
        outlineOffset: '2px',
    };

    const styles = {
        contained: {
            hover: {
                backgroundColor: c.dark,
                boxShadow: theme.shadows[1],
                '&:hover': { backgroundColor: c.dark, boxShadow: theme.shadows[2], },
            },
            active: {
                backgroundColor: darken(c.dark, 0.15),
                boxShadow: theme.shadows[3],
                '&:hover': { backgroundColor: darken(c.dark, 0.15), boxShadow: theme.shadows[4], },
            },
            focus: {
                ...focusRing,
                '&.Mui-focusVisible': focusRing,
            },
        },
        text: {
            hover: {
                backgroundColor: alpha(c.main, p.action.hoverOpacity),
                '&:hover': { backgroundColor: alpha(c.main, p.action.hoverOpacity) },
            },
            active: {
                backgroundColor: alpha(c.main, p.action.selectedOpacity),
                '&:hover': { backgroundColor: alpha(c.main, p.action.selectedOpacity) },
            },
            focus: {
                ...focusRing,
                '&.Mui-focusVisible': focusRing,
            },
        },
        outlined: {
            hover: {
                backgroundColor: alpha(c.main, p.action.hoverOpacity),
                borderColor: c.main,
                '&:hover': {
                    backgroundColor: alpha(c.main, p.action.hoverOpacity),
                    borderColor: c.main,
                },
            },
            active: {
                backgroundColor: alpha(c.main, p.action.selectedOpacity),
                borderColor: c.main,
                '&:hover': {
                    backgroundColor: alpha(c.main, p.action.selectedOpacity),
                    borderColor: c.main,
                },
            },
            focus: {
                ...focusRing,
                borderColor: c.main,
                '&.Mui-focusVisible': {
                    ...focusRing,
                    borderColor: c.main,
                },
            },
        },
    };

    return styles[variant]?.[state] || {};
};

/**
 * Maps variant to the correct styled component:
 * - text → TextButton (wraps children in Typography for underline effect)
 * - contained → ContainedButton
 * - outlined → OutlinedButton
 */
const VARIANT_COMPONENT = {
    text: TextButton,
    contained: ContainedButton,
    outlined: OutlinedButton,
};

/**
 * Renders a Button forced into a specific visual state.
 * - default: normal resting appearance
 * - hover / active: uses getButtonStateStyles to override background/shadow
 * - focus: applies MUI's Mui-focusVisible class for the focus ring
 * - disabled: sets the disabled prop
 */
const StateButton = ({ variant, forcedState, size, color, children }) =>
{
    const Btn = VARIANT_COMPONENT[variant] || Button;
    const btnProps = {};
    if (size) btnProps.size = size;
    if (color) btnProps.color = color;

    if (forcedState === 'disabled')
    {
        return <Btn {...btnProps} disabled>{children}</Btn>;
    }
    if (forcedState === 'hover' || forcedState === 'active' || forcedState === 'focus')
    {
        return (
            <Btn
                {...btnProps}
                className={forcedState === 'focus' ? 'Mui-focusVisible' : undefined}
                sx={(theme) => getButtonStateStyles(variant, forcedState, theme, color)}
            >
                {children}
            </Btn>
        );
    }
    return <Btn {...btnProps}>{children}</Btn>;
};

const Sandbox = () =>
{
    const theme = useTheme();
    return (

        <Container sx={{ mt: 3}} disableGutters maxWidth="xl">
            <Grid container columns={12} rowSpacing={2} columnSpacing={2}>
                {BUTTON_VARIANTS.map(({ variant, label, showColors }) => (
                    <Fragment key={variant}>
                        {/* Variant header */}
                        <Grid size={6} sx={{ mt: 3 }}>
                            <Card elevation={3} sx={{ p: 2, alignItems: 'center', justifyItems: 'center', width:'700px' }}>
                                <CardContent sx={{ alignItems: 'center', justifyItems: 'center', width:'100%' }}>
                                    <Grid size={12}>
                                        <Typography variant="h6">{label}</Typography>
                                    </Grid>
                                    {/* Size variant rows */}
                                    {BUTTON_SIZES.map(({ size, label: sizeLabel}) => (
                                        <Fragment key={size}>
                                            <Grid size={2} sx={{ alignContent: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {sizeLabel}
                                                </Typography>
                                            </Grid>
                                            <Grid size={10} sx={{ alignContent: 'center' }}>
                                                <Grid container columns={10} rowSpacing={2} columnSpacing={2}>
                                                    {BUTTON_STATES.map(({ state, label: stateLabel }) => (
                                                        <Grid key={state} size={2}>
                                                            <Stack sx={{ gap: 1, alignItems: 'center' }}>
                                                                <StateButton variant={variant} size={size} forcedState={state}>
                                                                    Text
                                                                </StateButton>
                                                                <Typography variant="caption2">{stateLabel}</Typography>
                                                            </Stack>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Grid>
                                        </Fragment>
                                    ))}

                                    {/* Color variant rows (contained & outlined only) */}
                                    {showColors && BUTTON_COLOR_ROWS.map((colorRow, rowIdx) => (
                                        <Fragment key={rowIdx}>
                                            <Grid size={2} sx={{ alignContent: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Colors
                                                </Typography>
                                            </Grid>
                                            <Grid size={10} sx={{ alignContent: 'center' }}>
                                                <Grid container columns={12} rowSpacing={2} columnSpacing={2}>
                                                    {colorRow.map(({ color, label: colorLabel }) => (
                                                        <Grid key={color} size={3}>
                                                            <Stack sx={{ gap: 1, alignItems: 'center' }}>
                                                                <Button variant={variant} color={color} size="small">
                                                                    {colorLabel}
                                                                </Button>
                                                            </Stack>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                                {/* Fill remaining columns to keep grid aligned */}
                                                {
                                                    Array.from({ length: 12 - colorRow.length }).map((_, i) => (
                                                        <Grid key={`empty-${i}`} size={1} />
                                                    ))
                                                }
                                            </Grid>
                                        </Fragment>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Fragment>
                ))}
            </Grid>
        </Container>
    );
};

export default Sandbox;
