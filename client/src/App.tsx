import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import LoadingSpinner from "./components/ui/loading-spinner";

// Lazy loading komponentów stron dla lepszej wydajności
const Home = lazy(() => import("@/pages/home"));
const CategoryPage = lazy(() => import("@/pages/category"));
const NotFound = lazy(() => import("@/pages/not-found"));
const WeedingBudgetPage = lazy(() => import("@/pages/weeding-budget"));

// Tworzenie routera z użyciem createBrowserRouter zamiast wouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <NotFound />
  },
  {
    path: "/category/:categoryId",
    element: <CategoryPage />,
  },
  {
    path: "/weeding-budget",
    element: <WeedingBudgetPage />,
  }
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingSpinner />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
