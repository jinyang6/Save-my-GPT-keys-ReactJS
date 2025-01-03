import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
console.log("App is running");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);