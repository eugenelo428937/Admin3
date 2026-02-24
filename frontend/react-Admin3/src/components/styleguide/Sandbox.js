import { Fragment } from "react";
import
{
    Card,
    CardContent,
    Container,
    Grid,
    Stack,
    Typography,
    Paper,
    useTheme,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import TextButton from "../../theme/components/styled-components/TextButton.styled";
import { Button } from "../../theme/components/styled-components/Button.styled";
import ContainedButton from "../../theme/components/styled-components/ContainedButton.styled";
import OutlinedButton from "../../theme/components/styled-components/OutlinedButton.styled";
import { IconButton } from "../../theme/components/styled-components/IconButton.styled";

const BUTTON_VARIANTS = [
    { variant: 'text', label: 'Text' },
    { variant: 'contained', label: 'Contained' },
    { variant: 'outlined', label: 'Outline' },
    { variant: 'icon', label: 'Icon' },
];

// Sizes section uses Round + Square pairs for all variants except Text
const BUTTON_SIZE_VARIANTS = [
    { variant: 'text', label: 'Text' },
    { variant: 'contained', label: 'Contained (Round)', shape: 'round' },
    { variant: 'contained', label: 'Contained (Square)', shape: 'square' },
    { variant: 'outlined', label: 'Outlined (Round)', shape: 'round' },
    { variant: 'outlined', label: 'Outlined (Square)', shape: 'square' },
    { variant: 'icon', label: 'Icon (Round)', shape: 'round' },
    { variant: 'icon', label: 'Icon (Square)', shape: 'square' },
];

const BUTTON_SIZES = [
    { size: 'large', label: 'Large' },
    { size: 'medium', label: 'Medium' },
    { size: 'small', label: 'Small' },
];

const BUTTON_STATES = [
    { state: 'default', label: 'Default' },
    { state: 'hover', label: 'Hover' },
    { state: 'active', label: 'Active' },
    { state: 'focus', label: 'Focus' },
    { state: 'disabled', label: 'Disabled' },
];

const BUTTON_COLORS = [
    { color: 'primary', label: 'Primary' },
    { color: 'secondary', label: 'Secondary' },
    { color: 'tertiary', label: 'Tertiary' },
    { color: 'warning', label: 'Warning' },
    { color: 'error', label: 'Error' },
    { color: 'info', label: 'Info' },
    { color: 'success', label: 'Success' },
];

/**
 * Maps variant to the correct styled component.
 * Each component supports the $forcedState transient prop
 * for rendering forced visual states in the style guide.
 */
const VARIANT_COMPONENT = {
    text: TextButton,
    contained: ContainedButton,
    outlined: OutlinedButton,
    icon: IconButton,
};

/**
 * Renders a Button forced into a specific visual state via $forcedState.
 * All state logic (hover, active, focus, disabled) is handled
 * by the styled components — no manual sx or className needed.
 */
const StateButton = ({ variant, forcedState, size, color, shape, children }) =>
{
    const Btn = VARIANT_COMPONENT[variant] || Button;
    const btnProps = {};
    if (size) btnProps.size = size;
    if (color) btnProps.color = color;
    if (shape) btnProps.$shape = shape;

    return (
        <Btn {...btnProps} $forcedState={forcedState}>
            {children}
        </Btn>
    );
};

const ButtonContent = ({ variant }) =>
    variant === 'icon' ? <StarIcon fontSize="small" /> : 'Text';

const SectionHeader = ({ children }) => (
    <Typography variant="h5" sx={{ mb: 4 }}>{children}</Typography>
);

const ColumnHeader = ({ children }) => (
    <Typography variant="body2" fontWeight="bold" align="center">{children}</Typography>
);

const RowLabel = ({ children }) => (
    <Typography variant="body2" color="text.secondary">{children}</Typography>
);

const Sandbox = () =>
{
    const theme = useTheme();
    return (
        <Container sx={{ mt: 3, px: 3, backgroundColor: theme.palette.md3.surfaceContainerHigh }} disableGutters maxWidth="xl">
            <Typography variant="h4" sx={{ mb: 3, }}>Button</Typography>
            <Stack spacing={6} sx={{ m: 4, width: 'fit-content', backgroundColor: theme.palette.md3.surfaceContainerHigh }}>
                {/* ── Sizes ── */}
                <Card elevation={3} sx={{ py: 2, backgroundColor: theme.palette.md3.surfaceContainerHighest }}>
                    <CardContent>
                        <SectionHeader>Sizes</SectionHeader>
                        <Grid container columns={8} rowSpacing={4} columnSpacing={1} alignItems="center" sx={{ width: 'fit-content' }}>
                            {/* Header row */}
                            <Grid size={1} />
                            {BUTTON_SIZE_VARIANTS.map(({ label }) => (
                                <Grid key={label} size={1}>
                                    <ColumnHeader>{label}</ColumnHeader>
                                </Grid>
                            ))}
                            {/* Data rows */}
                            {BUTTON_SIZES.map(({ size, label }) => (
                                <Fragment key={size}>
                                    <Grid size={1} sx={{ display: 'flex', alignItems: 'center', minHeight: '96px' }}>
                                        <RowLabel>{label}</RowLabel>
                                    </Grid>
                                    {BUTTON_SIZE_VARIANTS.map(({ variant, label: variantLabel, shape }) => (
                                        <Grid key={variantLabel} size={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '96px' }}>
                                            <StateButton variant={variant} size={size} forcedState="default" shape={shape}>
                                                <ButtonContent variant={variant} />
                                            </StateButton>
                                        </Grid>
                                    ))}
                                </Fragment>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>

                {/* ── States ── */}
                <Card elevation={3} sx={{ p: 2, backgroundColor: theme.palette.md3.surfaceContainerHighest }}>
                    <CardContent>
                        <SectionHeader>States</SectionHeader>
                        <Grid container columns={6} rowSpacing={4} columnSpacing={1} alignItems="center" sx={{ width: 'fit-content' }}>
                            {/* Header row */}
                            <Grid size={1} />
                            {BUTTON_STATES.map(({ label }) => (
                                <Grid key={label} size={1}>
                                    <ColumnHeader>{label}</ColumnHeader>
                                </Grid>
                            ))}
                            {/* Data rows */}
                            {BUTTON_VARIANTS.map(({ variant, label }) => (
                                <Fragment key={variant}>
                                    <Grid size={1}>
                                        <RowLabel>{label}</RowLabel>
                                    </Grid>
                                    {BUTTON_STATES.map(({ state }) => (
                                        <Grid key={state} size={1} sx={{ textAlign: 'center' }}>
                                            <StateButton variant={variant} size="small" forcedState={state}>
                                                <ButtonContent variant={variant} />
                                            </StateButton>
                                        </Grid>
                                    ))}
                                </Fragment>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>

                {/* ── Colours ── */}
                <Card elevation={3} sx={{ p: 2, backgroundColor: theme.palette.md3.surfaceContainerHighest }}>
                    <CardContent>
                        <SectionHeader>Colours</SectionHeader>
                        <Grid container columns={5} rowSpacing={4} columnSpacing={1} alignItems="center" sx={{ width: 'fit-content' }}>
                            {/* Header row */}
                            <Grid size={1} />
                            {BUTTON_VARIANTS.map(({ label }) => (
                                <Grid key={label} size={1}>
                                    <ColumnHeader>{label}</ColumnHeader>
                                </Grid>
                            ))}
                            {/* Data rows */}
                            {BUTTON_COLORS.map(({ color, label }) => (
                                <Fragment key={color}>
                                    <Grid size={1}>
                                        <RowLabel>{label}</RowLabel>
                                    </Grid>
                                    {BUTTON_VARIANTS.map(({ variant }) => (
                                        <Grid key={variant} size={1} sx={{ textAlign: 'center' }}>
                                            <StateButton variant={variant} size="small" color={color} forcedState="default">
                                                <ButtonContent variant={variant} />
                                            </StateButton>
                                        </Grid>
                                    ))}
                                </Fragment>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            </Stack>
        </Container>
    );
};

export default Sandbox;
