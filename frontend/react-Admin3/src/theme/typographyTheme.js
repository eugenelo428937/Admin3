import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";
import breakpointsTheme from "./breakpointsTheme.js";
import liftKitTheme from "./liftKitTheme.js";

const typographyTheme = {
   ...breakpointsTheme,
   fontFamily: [
      "Inter",
      "Poppins",
      "DM Sans Variable",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
   ].join(","),

   // Customize font weights and sizes
   typography: {
      BPP: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 600,
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep-dec) !important",
         letterSpacing: "-0.022em",
         fontOpticalSizing: "auto",
         fontStyle: "normal",
         fontVariationSettings: "'wght' 600",
         [breakpointsTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--wholestep) * var(--halfstep)) !important",
            textAlign: "start",
            lineHeight:
               "calc(1em * var(--wholestep-dec) * var(--eighthstep)) !important",
         },
      },
      Acted: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 200,
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
         fontOpticalSizing: "auto",
         fontStyle: "normal",
         fontVariationSettings: "'wght' 200",
         marginTop:
            "calc( var(--2xs) / var(--halfstep) / var(--halfstep) / var(--eighthstep))",
         [breakpointsTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--halfstep)) !important",
            textAlign: "start",
            lineHeight:
               "calc(1em * var(--wholestep-dec) * var(--quarterstep)  * var(--eighthstep) * var(--eighthstep)) !important",
            marginBottom: liftKitTheme.spacing.xs3,
         },
      },
      h1: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 400,
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--quarterstep) !important",
         letterSpacing: "-0.022em !important",
      },
      h2: {
         fontFamily: "'Inter', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
      },
      h3: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.022em !important",
         [breakpointsTheme.breakpoints.down("sm")]: {
            fontSize:
               "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
         },
      },
      h4: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--wholestep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.02em !important",
      },
      h5: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em * var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.017em !important",
      },
      h6: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 600,
         fontSize: "calc(1em * var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.014em !important",
      },
      subtitle1: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      subtitle2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      body1: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "1em !important",
         lineHeight: "var(--wholestep) !important",
         letterSpacing: "-0.011em !important",
      },
      body2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--quarterstep)) !important",
         lineHeight: "calc(var(--wholestep) / var(--quarterstep)) !important",
         letterSpacing: "-0.011em !important",
      },
      button: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 500,
         fontSize: "calc( 1em * var(--eighthstep) )!important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.004em !important",
         textTransform: "none",
         position: "static",
         top: "6.235em",
      },
      caption: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      caption2: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize:
            "calc(1em / var(--halfstep) / var(--quarterstep) ) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
      overline: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 400,
         fontSize: "calc(1em / var(--halfstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "0.0618em !important",
         textTransform: "uppercase",
      },
      fineprint: {
         fontFamily: "'Inter', 'Poppins', sans-serif",
         fontWeight: 200,
         fontSize:
            "calc(1em /  var(--halfstep)/  var(--quarterstep)) !important",
         lineHeight: "var(--halfstep) !important",
         letterSpacing: "-0.007em !important",
      },
   },
};

export default typographyTheme;