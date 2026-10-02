import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router.tsx";
import "./index.css";
import "./api/apiInstance";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppRouter />
  </BrowserRouter>
);
