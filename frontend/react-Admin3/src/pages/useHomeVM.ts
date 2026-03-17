import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { rulesEngineHelpers } from "../utils/rulesEngineUtils";
import rulesEngineService from "../services/rulesEngineService";
import { navSelectProductGroup } from "../store/slices/filtersSlice.js";
import {
   MenuBook,
   RateReview,
   School,
} from "@mui/icons-material";

interface ProductCard {
   id: string;
   title: string;
   description: string;
   filterValue: string;
   icon: string;
   gradient: string;
}

const useHomeVM = () => {
   const navigate = useNavigate();
   const dispatch = useDispatch();
   const [searchResults, setSearchResults] = useState<any>(null);
   const [error, setError] = useState<string | null>(null);
   const chevronClipId = useId();

   // Rules engine state for holiday messages and other home page rules
   const [rulesMessages, setRulesMessages] = useState<any[]>([]);
   const [rulesLoading, setRulesLoading] = useState(false);

   // Execute home_page_mount rules when component mounts
   useEffect(() => {
      const executeRules = async () => {
         setRulesLoading(true);
         setRulesMessages([]); // Clear previous messages

         try {
            // Use the new helper function for simplified execution
            const result = await rulesEngineHelpers.executeHomePage(
               null,
               rulesEngineService
            );

            if (result.success && result.messages?.processed?.length > 0) {
               // Extract processed display messages for home page (filter out acknowledgments)
               const displayMessages = result.messages.processed.filter(
                  (msg: any) =>
                     !msg.isAcknowledgment &&
                     msg.display_type !== "modal" &&
                     msg.parsed?.displayType !== "modal"
               );
               setRulesMessages(displayMessages);
            }

            // Handle any processing errors
            if (result.errors && result.errors.length > 0) {
               console.error("🚨 Rules processing errors:", result.errors);
               if ((import.meta as any).env?.DEV) {
                  setError(`Development Error: ${result.errors.join(", ")}`);
               }
            }
         } catch (err: any) {
            console.error("Error executing home_page_mount rules:", err);

            // Handle schema validation errors specifically
            if (err.name === "SchemaValidationError") {
               console.error(
                  "🚨 Schema validation failed for rules engine:",
                  err.details
               );
               console.error("🔍 Schema errors:", err.schemaErrors);
               // For development, show schema validation errors to help debugging
               if ((import.meta as any).env?.DEV) {
                  setError(
                     `Development Error: Schema validation failed - ${err.details}`
                  );
               }
            }
            // Don't show other rule engine errors to user - shouldn't block home page
         } finally {
            setRulesLoading(false);
         }
      };

      executeRules();
   }, []); // Empty dependency array since this should run once on mount

   // Handle search results from SearchBox
   const handleSearchResults = (results: any) => {
      setSearchResults(results);
      setError(null);
   };

   // Handle "Show Matching Products" button click
   // Redux state and URL sync middleware handle filters automatically
   const handleShowMatchingProducts = () => {
      navigate("/products");
   };

   // Handle navigation to products page with specific product type filter
   const handleProductCategoryClick = (productType: string) => {
      dispatch(navSelectProductGroup(productType));
      navigate("/products");
   };

   // Product category cards data
   const productCards: ProductCard[] = [
      {
         id: "study-materials",
         title: "Study Materials",
         description:
            "Comprehensive essential pack and revision materials to help you master actuarial concepts and excel in your exams.",
         filterValue: "Core Study Materials",
         icon: "MenuBook",
         gradient: "linear-gradient(135deg, #4658ac 0%, #2d3f93 100%)",
      },
      {
         id: "marking-service",
         title: "Marking Service",
         description:
            "Feedback on your practice papers with detailed marking and personalized guidance to improve your exam technique.",
         filterValue: "Marking",
         icon: "RateReview",
         gradient: "linear-gradient(135deg, #006874 0%, #004f58 100%)",
      },
      {
         id: "tuition",
         title: "Tuition",
         description:
            "Build and consolidate your knowledge and understanding of the principles. Time spent on an ActEd tutorial will be amongst your most productive study time.",
         filterValue: "Tutorial",
         icon: "School",
         gradient: "linear-gradient(135deg, #76546e 0%, #5c3c55 100%)",
      },
   ];

   // Icon mapping for product cards
   const iconMap: Record<string, typeof MenuBook> = {
      MenuBook: MenuBook,
      RateReview: RateReview,
      School: School,
   };

   return {
      searchResults,
      error,
      rulesMessages,
      rulesLoading,
      chevronClipId,
      handleSearchResults,
      handleShowMatchingProducts,
      handleProductCategoryClick,
      productCards,
      iconMap,
   };
};

export default useHomeVM;
