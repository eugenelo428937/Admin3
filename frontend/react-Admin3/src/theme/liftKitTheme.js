// Liftkit Theme - Spacing and Typography System
// Extracted from globals.css and typography.css

const liftKitTheme = {
   // Spacing system using golden ratio (1.618) scaling
   // These correspond to the CSS custom properties in globals.css
   spacing: {
      // Base values using golden ratio (1.618) scaling
      xs3: "calc(1rem / var(--scaleFactor) / var(--scaleFactor) / var(--scaleFactor))", // var(--3xs)
      xs2: "calc(1rem / var(--scaleFactor) / var(--scaleFactor))", // var(--2xs)
      xs: "calc(1rem / var(--scaleFactor))", // var(--xs)
      sm: "calc(1rem / var(--scaleFactor))", // var(--sm) - same as xs in the CSS
      md: "1rem", // var(--md) - base spacing unit
      lg: "calc(1rem * var(--scaleFactor))", // var(--lg)
      xl: "calc(1rem * var(--scaleFactor) * var(--scaleFactor))", // var(--xl)
      xl15: "calc(1rem * var(--scaleFactor) * var(--scaleFactor) * var(--halfstep))", 
      xl2: "calc(1rem * var(--scaleFactor) * var(--scaleFactor) * var(--scaleFactor))", // var(--2xl)      

      // Scale factor
      scaleFactor: "1.618", // var(--scaleFactor) - golden ratio

      // Incremental multipliers from CSS
      wholestep: "1.618", // var(--wholestep) - always equals the scalefactor
      halfstep: "1.272", // var(--halfstep) - always equals the sq. root of scalefactor
      quarterstep: "1.128", // var(--quarterstep) - always equals the sq. root of halfstep
      eighthstep: "1.061", // var(--eighthstep) - always equals the sq. root of quarterstep

      // Decimal increments
      "wholestep-dec": "0.618", // var(--wholestep-dec) - equals wholestep - 1
      "halfstep-dec": "0.272", // var(--halfstep-dec) - equals halfstep - 1
      "quarterstep-dec": "0.128", // var(--quarterstep-dec) - equals quarterstep - 1
      "eighthstep-dec": "0.061", // var(--eighthstep-dec) - equals eighthstep - 1
   },

   // Typography system extracted from typography.css
   typography: {
      // Display styles
      display1: {
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep))",
         fontWeight: 400,
         lineHeight: "var(--quarterstep)",
         letterSpacing: "-0.022em",
      },
      display1Bold: {
         fontSize:
            "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep))",
         fontWeight: 700,
         lineHeight: "var(--quarterstep)",
         letterSpacing: "-0.022em",
      },
      display2: {
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.022em",
      },
      display2Bold: {
         fontSize: "calc(1em * var(--wholestep) * var(--wholestep))",
         fontWeight: 700,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.022em",
      },

      // Title styles
      title1: {
         fontSize: "calc(1em * var(--wholestep) * var(--halfstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.022em",
      },
      title1Bold: {
         fontSize: "calc(1em * var(--wholestep) * var(--halfstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.022em",
      },
      title2: {
         fontSize: "calc(1em * var(--wholestep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.02em",
      },
      title2Bold: {
         fontSize: "calc(1em * var(--wholestep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.02em",
      },
      title3: {
         fontSize: "calc(1em * var(--halfstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.017em",
      },
      title3Bold: {
         fontSize: "calc(1em * var(--halfstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.017em",
      },

      // Heading styles
      heading: {
         fontSize: "calc(1em * var(--quarterstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.014em",
      },
      headingBold: {
         fontSize: "calc(1em * var(--quarterstep))",
         fontWeight: 700,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.014em",
      },

      // Subheading styles
      subheading: {
         fontSize: "calc(1em / var(--quarterstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.007em",
      },
      subheadingBold: {
         fontSize: "calc(1em / var(--quarterstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.007em",
      },

      // Body styles
      body: {
         fontSize: "1em",
         fontWeight: 400,
         lineHeight: "var(--wholestep)",
         letterSpacing: "-0.011em",
         cursor: "default",
      },
      bodyBold: {
         fontSize: "1em",
         fontWeight: 600,
         lineHeight: "var(--wholestep)",
         letterSpacing: "-0.011em",
         padding: "0",
         position: "relative",
      },

      // Callout styles
      callout: {
         fontSize: "calc(1em / var(--eighthstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.009em",
      },
      calloutBold: {
         fontSize: "calc(1em / var(--eighthstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.009em",
         textDecoration: "none",
      },

      // Label styles
      label: {
         fontSize: "calc((1em / var(--quarterstep)) / var(--eighthstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.004em",
         position: "static",
         top: "6.235em",
      },
      labelBold: {
         fontSize: "calc((1em / var(--quarterstep)) / var(--eighthstep))",
         fontWeight: 700,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.004em",
      },

      // Caption styles
      caption: {
         fontSize: "calc(1em / var(--halfstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.007em",
      },
      captionBold: {
         fontSize: "calc(1em / var(--halfstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "-0.007em",
      },

      // Overline styles
      overline: {
         fontSize: "calc(1em / var(--halfstep))",
         fontWeight: 400,
         lineHeight: "var(--halfstep)",
         letterSpacing: "0.0618em",
         textTransform: "uppercase",
      },
      overlineBold: {
         fontSize: "calc(1em / var(--halfstep))",
         fontWeight: 600,
         lineHeight: "var(--halfstep)",
         letterSpacing: "0.0618em",
         textTransform: "uppercase",
      },

      // Rich text styles for content
      richText: {
         color: "var(--light__onsurface_lkv)",
         h1: {
            color: "var(--light__onsurface_lkv)",
            letterSpacing: "-0.035em",
            marginTop: "0",
            marginBottom: "1.129em",
            fontSize:
               "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep))",
            fontWeight: 700,
            lineHeight: "1.129",
         },
         h2: {
            letterSpacing: "-0.022em",
            marginTop: "0.786096em",
            marginBottom: "0.345984em",
            fontSize: "calc(1em * var(--wholestep) * var(--wholestep))",
            fontWeight: 700,
            lineHeight: "var(--halfstep)",
         },
         h3: {
            letterSpacing: "-0.022em",
            marginTop: "0.786096em",
            marginBottom: "0.345984em",
            fontSize: "2.058em",
            fontWeight: 600,
            lineHeight: "var(--halfstep)",
         },
         h4: {
            letterSpacing: "-0.02em",
            marginTop: "0.786096em",
            marginBottom: "0.345984em",
            fontSize: "1.618em",
            fontWeight: 600,
            lineHeight: "var(--halfstep)",
         },
         h5: {
            letterSpacing: "-0.017em",
            marginTop: "0.786096em",
            marginBottom: "0.345984em",
            fontSize: "1.272em",
            fontWeight: 600,
            lineHeight: "var(--halfstep)",
         },
         h6: {
            letterSpacing: "-0.014em",
            marginTop: "0.786096em",
            marginBottom: "0.345984em",
            fontSize: "1.129em",
            fontWeight: 600,
            lineHeight: "var(--halfstep)",
         },
         p: {
            color: "var(--light__onsurfacevariant_lkv)",
            marginTop: "1em",
            marginBottom: "1em",
         },
         a: {
            color: "var(--light__primary_lkv)",
            fontWeight: 700,
         },
         ul: {
            marginTop: "1em",
            marginBottom: "1em",
            paddingLeft: "2.618em",
            lineHeight: "var(--wholestep)",
         },
         ol: {
            marginTop: "1em",
            marginBottom: "1em",
         },
         blockquote: {
            marginTop: "1em",
            marginBottom: "1em",
            padding: "0 1.618em",
            fontSize: "1em",
            lineHeight: "var(--wholestep)",
         },
         figcaption: {
            color: "var(--light__onsurfacevariant_lkv)",
            marginTop: "1em",
            marginBottom: "1em",
            fontSize: "calc(1em / var(--halfstep))",
            lineHeight: "var(--wholestep)",
         },
         img: {
            marginTop: "1em",
            marginBottom: "11em",
         },
      },
   },

   // Responsive breakpoints for media queries
   breakpoints: {
      mobile: "479px",
      tablet: "767px",
      desktop: "991px",
   },

   // Media query responsive typography adjustments
   responsive: {
      // Tablet adjustments (max-width: 767px)
      tablet: {
         display1: {
            fontSize: "3.3301em",
         },
         display1Bold: {
            fontSize: "3.3301em",
         },
      },
      // Mobile adjustments (max-width: 479px)
      mobile: {
         display1: {
            fontSize: "2.61743em",
         },
         display1Bold: {
            fontSize: "2.61743em",
         },
         display2: {
            fontSize: "2.05818em",
         },
         display2Bold: {
            fontSize: "2.05818em",
         },
         title1: {
            fontSize: "1.82285em",
         },
         title1Bold: {
            fontSize: "1.82285em",
         },
      },
      // Base body font size adjustments
      desktopSmall: {
         body: {
            fontSize: "1vw", // max-width: 991px
         },
      },
   },
};

export default liftKitTheme;