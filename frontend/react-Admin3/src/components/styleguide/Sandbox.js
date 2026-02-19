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

const BUTTON_SIZES = [
    { size: 'small', label: 'Small' },
    { size: 'medium', label: 'Medium' },
    { size: 'large', label: 'Large' },
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
const StateButton = ({ variant, forcedState, size, color, children }) =>
{
    const Btn = VARIANT_COMPONENT[variant] || Button;
    const btnProps = {};
    if (size) btnProps.size = size;
    if (color) btnProps.color = color;

    return (
        <Btn {...btnProps} $forcedState={forcedState}>
            {children}
        </Btn>
    );
};

const ButtonContent = ({ variant }) =>
    variant === 'icon' ? <StarIcon fontSize="small" /> : 'Text';

const SectionHeader = ({ children }) => (
    <Typography variant="h6" sx={{ mb: 2 }}>{children}</Typography>
);

const ColumnHeader = ({ children }) => (
    <Typography variant="body2" fontWeight="bold" align="center">{children}</Typography>
);

const RowLabel = ({ children }) => (
    <Typography variant="body2" color="text.secondary">{children}</Typography>
);

const Sandbox = () =>
{
    return (
        <Container sx={{ mt: 3 }} disableGutters maxWidth="xl">
            <Typography variant="h5" sx={{ mb: 3 }}>Button</Typography>
            <Paper>
                <Stack spacing={4} sx={{ maxWidth: "800px", display: "flex", justifyContent: "center" }}>
                    {/* ── Sizes ── */}
                    <Card elevation={3} sx={{ p: 2 }}>
                        <CardContent>
                            <SectionHeader>Sizes</SectionHeader>
                            <Grid container columns={5} rowSpacing={3} columnSpacing={2} alignItems="center">
                                {/* Header row */}
                                <Grid size={1} />
                                {BUTTON_VARIANTS.map(({ label }) => (
                                    <Grid key={label} size={1}>
                                        <ColumnHeader>{label}</ColumnHeader>
                                    </Grid>
                                ))}
                                {/* Data rows */}
                                {BUTTON_SIZES.map(({ size, label }) => (
                                    <Fragment key={size}>
                                        <Grid size={1}>
                                            <RowLabel>{label}</RowLabel>
                                        </Grid>
                                        {BUTTON_VARIANTS.map(({ variant }) => (
                                            <Grid key={variant} size={1} sx={{ textAlign: 'center' }}>
                                                <StateButton variant={variant} size={size} forcedState="default">
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
                    <Card elevation={3} sx={{ p: 2 }}>
                        <CardContent>
                            <SectionHeader>States</SectionHeader>
                            <Grid container columns={6} rowSpacing={3} columnSpacing={2} alignItems="center">
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
                    <Card elevation={3} sx={{ p: 2 }}>
                        <CardContent>
                            <SectionHeader>Colours</SectionHeader>
                            <Grid container columns={5} rowSpacing={2} columnSpacing={2} alignItems="center">
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
            </Paper>
        </Container>
    );
};

export default Sandbox;
