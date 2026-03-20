import React from "react";
import {
   Box,
   Card,
   CardContent,
   CardHeader,
   CardActions,
   Typography,
   Button,
   LinearProgress,
   Chip,
   Alert,
   Snackbar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddressComparisonModal from "../Address/AddressComparisonModal.tsx";
import {
   PersonalInfoStep,
   HomeAddressStep,
   WorkAddressStep,
   PreferencesStep,
   SecurityStep,
} from "./steps";
import useUserFormWizardVM, { STEPS } from "./useUserFormWizardVM";
import type { WizardMode } from "../../types/auth";

interface UserFormWizardProps {
   mode?: WizardMode;
   initialData?: any;
   onSuccess?: (result: any) => void;
   onError?: (message: string) => void;
   onSwitchToLogin?: () => void;
}

const UserFormWizard: React.FC<UserFormWizardProps> = (props) => {
   const vm = useUserFormWizardVM(props);
   const theme = useTheme();

   const renderStepContent = () => {
      switch (vm.currentStep) {
         case 1:
            return (
               <PersonalInfoStep
                  initialData={vm.personalInitialData}
                  onDataChange={vm.handlePersonalChange}
                  errors={vm.stepErrors}
                  mode={vm.mode}
               />
            );
         case 2:
            return (
               <HomeAddressStep
                  initialData={vm.homeAddressInitialData}
                  onDataChange={vm.handleHomeAddressChange}
                  errors={vm.stepErrors}
                  mode={vm.mode}
               />
            );
         case 3:
            return (
               <WorkAddressStep
                  initialData={vm.workAddressInitialData}
                  onDataChange={vm.handleWorkAddressChange}
                  errors={vm.stepErrors}
                  mode={vm.mode}
               />
            );
         case 4:
            return (
               <PreferencesStep
                  initialData={vm.preferencesInitialData}
                  onDataChange={vm.handlePreferencesChange}
                  errors={vm.stepErrors}
                  mode={vm.mode}
                  hasWorkAddress={vm.showWorkSection}
               />
            );
         case 5:
            return (
               <SecurityStep
                  initialData={vm.securityInitialData}
                  onDataChange={vm.handleSecurityChange}
                  errors={vm.stepErrors}
                  mode={vm.mode}
               />
            );
         default:
            return null;
      }
   };

   return (
      <Box
         className="p-top__lg"
         sx={{
            maxWidth: "800px",
            margin: "0 auto",
            height: "100%",
            // CSS keyframes for shake animation
            "@keyframes shake": {
               "0%, 100%": { transform: "translateX(0)" },
               "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-3px)" },
               "20%, 40%, 60%, 80%": { transform: "translateX(3px)" },
            },
            // CSS class for invalid field styling
            "& .field-error-shake": {
               animation: "shake 0.5s ease-in-out",
               backgroundColor: "rgba(244, 67, 54, 0.08)",
               borderRadius: "4px",
               padding: "4px",
               margin: "-4px",
               transition: "background-color 0.3s ease-out",
            },
         }}
      >
         <Card elevation={3}>
            <CardHeader
               sx={(theme: any) => ({
                  background: `linear-gradient(135deg, ${theme.palette.scales.granite[40]} 0%, ${theme.palette.scales.granite[20]} 100%)`,
                  color: "white",
                  textAlign: "center",
                  py: 4,
               })}
               title={
                  <Box>
                     <Typography
                        variant="h3"
                        gutterBottom
                        className="m-top__md"
                     >
                        {vm.isProfileMode
                           ? "Update Your Profile"
                           : "Create Your ActEd Account"}
                     </Typography>
                     <Typography
                        variant="body2"
                        color={theme.palette.text.primary}
                        sx={{ mb: (theme as any).spacingTokens.md }}
                     >
                        {vm.isProfileMode
                           ? "Update your profile information below. You can save changes at each step."
                           : "Follow these steps below to register your account"}
                     </Typography>

                     <LinearProgress
                        variant="determinate"
                        value={vm.getProgressPercentage()}
                        sx={{
                           mb: (theme as any).spacingTokens.md,
                           height: 6,
                           borderRadius: 4,
                           backgroundColor: "rgba(255,255,255,0.2)",
                           "& .MuiLinearProgress-bar": {
                              backgroundColor: (theme as any).palette.scales
                                 .pink[50],
                              opacity: 0.65,
                           },
                        }}
                     />

                     <Box
                        sx={{
                           display: "flex",
                           justifyContent: "space-between",
                           alignItems: "center",
                        }}
                     >
                        {STEPS.map((step) => {
                           const StepIcon = step.icon;
                           return (
                              <Box
                                 key={step.id}
                                 sx={{ textAlign: "center", flex: 1 }}
                              >
                                 <Chip
                                    icon={<StepIcon />}
                                    label={step.id}
                                    size="small"
                                    color={
                                       vm.currentStep > step.id
                                          ? "success"
                                          : vm.currentStep === step.id
                                          ? "secondary"
                                          : "default"
                                    }
                                    variant={
                                       vm.currentStep === step.id
                                          ? "filled"
                                          : "outlined"
                                    }
                                    sx={{
                                       mb: 1,
                                       color:
                                          vm.currentStep === step.id
                                             ? "primary.contrastText"
                                             : "white",
                                       borderColor:
                                          vm.currentStep === step.id
                                             ? "white"
                                             : "rgba(255,255,255,0.5)",
                                    }}
                                 />
                                 <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{
                                       fontWeight:
                                          vm.currentStep === step.id
                                             ? "bold"
                                             : "normal",
                                       opacity:
                                          vm.currentStep === step.id ? 1 : 0.8,
                                    }}
                                 >
                                    {step.title}
                                 </Typography>
                              </Box>
                           );
                        })}
                     </Box>
                  </Box>
               }
            />

            <CardContent sx={{ p: 3 }}>{renderStepContent()}</CardContent>

            <CardActions
               sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
               }}
            >
               <Box>
                  {vm.currentStep > 1 && (
                     <Button
                        variant="outlined"
                        onClick={vm.handlePrevStep}
                        disabled={vm.isLoading}
                        startIcon={<span>←</span>}
                     >
                        Previous
                     </Button>
                  )}
               </Box>

               <Typography variant="body2" color="text.secondary">
                  Step {vm.currentStep} of {STEPS.length}
               </Typography>

               <Box sx={{ display: "flex", gap: 2 }}>
                  {/* Save Progress button (profile mode only) */}
                  {vm.isProfileMode && (
                     <Button
                        variant="outlined"
                        onClick={vm.handleStepSave}
                        disabled={vm.isLoading || vm.changedFields.size === 0}
                        sx={{
                           color: theme.palette.primary.main,
                           borderColor: theme.palette.primary.main,
                        }}
                     >
                        {vm.changedFields.size > 0
                           ? `Save Progress (${vm.changedFields.size} changes)`
                           : "No Changes"}
                     </Button>
                  )}

                  <Button
                     variant="contained"
                     onClick={vm.handleNextStep}
                     disabled={vm.isLoading}
                     sx={{
                        backgroundColor: theme.palette.primary as any,
                        color: "primary.contrastText",
                     }}
                     endIcon={
                        vm.currentStep === 5 ? (
                           <span>✓</span>
                        ) : (
                           <span>→</span>
                        )
                     }
                  >
                     {vm.isLoading ? (
                        vm.isProfileMode ? (
                           "Saving..."
                        ) : (
                           "Creating Account..."
                        )
                     ) : vm.currentStep === 5 ? (
                        vm.isProfileMode ? (
                           "Save Changes"
                        ) : (
                           "Create Account"
                        )
                     ) : (
                        <Typography
                           variant="button"
                           color={"primary.contrastText"}
                        >
                           Next
                        </Typography>
                     )}
                  </Button>
               </Box>
            </CardActions>
         </Card>

         {vm.onSwitchToLogin && (
            <Box sx={{ textAlign: "center", mt: (theme as any).spacingTokens.md }}>
               <Button variant="text" onClick={vm.onSwitchToLogin}>
                  Already have an account? Login
               </Button>
            </Box>
         )}

         {/* Snackbar for notifications */}
         <Snackbar
            open={vm.snackbar.open}
            autoHideDuration={6000}
            onClose={vm.handleSnackbarClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
         >
            <Alert
               onClose={vm.handleSnackbarClose}
               severity={vm.snackbar.severity as any}
               sx={{ width: "100%" }}
            >
               {vm.snackbar.message}
            </Alert>
         </Snackbar>

         {/* Address Comparison Modal */}
         <AddressComparisonModal
            open={vm.showComparisonModal}
            userAddress={vm.userEnteredAddress}
            suggestedAddress={vm.suggestedAddress}
            onAcceptSuggested={vm.handleAcceptSuggestedAddress}
            onKeepOriginal={vm.handleKeepOriginalAddress}
            onClose={() => {
               /* modal close handled by callbacks */
            }}
            loading={vm.isValidatingAddress}
         />
      </Box>
   );
};

export default UserFormWizard;
