import React from "react";

interface LogoutProps {
  setIsAuthenticated: (value: boolean) => void;
}

const Logout: React.FC<LogoutProps> = ({ setIsAuthenticated }) => {
  const handleLogout = async (): Promise<void> => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8888/students/logout/",
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        localStorage.removeItem("isAuthenticated");
        setIsAuthenticated(false);
      }
    } catch (error: unknown) {
      console.error("Error logging out:", error);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
};

export default Logout;
