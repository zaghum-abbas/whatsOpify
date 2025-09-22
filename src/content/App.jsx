import React, { useEffect } from "react";
import { AuthProvider } from "./components/authMiddleware.jsx"; // Import AuthProvider
import Sidebar from "./components/InjectedSidebarButtons";
import TopToolbar from "./components/TopToolbar";
import ChatHeaderHover from "./components/ChatHeaderHover"; // Import the new component

const App = () => {
  useEffect(() => {
    console.log("✅ Whatsapofy App mounted inside left sidebar successfully");
  }, []);

  return (
    <AuthProvider>
      <Sidebar />
      <TopToolbar />
      <ChatHeaderHover />
    </AuthProvider>
  );
};

export default App;
