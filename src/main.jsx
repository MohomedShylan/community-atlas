
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import AuthProvider from "./context/AuthContext.jsx";

// MapLibre library CSS
import "maplibre-gl/dist/maplibre-gl.css";

// Existing application CSS
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./styles/auth.css";
import "./styles/household-form.css";
import "./styles/household-details.css";
import "./styles/individual.css";
import "./styles/person-profile.css";
import "./styles/advanced-people.css";
import "./styles/reports.css";
import "./styles/admin-users.css";
import "./styles/person-management.css";
import "./styles/offline.css";



// Custom map styling
import "./styles/map.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
