import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

// Loading spinner component with premium styling
const LoadingSpinner = () => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-4" />
      <p className="text-sm text-stone-400">Ładowanie...</p>
    </div>
  </div>
);

// Lazy loading komponentów stron dla lepszej wydajności
const PremiumHome = lazy(() => import("@/pages/PremiumHome"));
const CategoryPage = lazy(() => import("@/pages/category"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Legacy pages (kept for backwards compatibility)
const WeedingBudgetPage = lazy(() => import("@/pages/weeding-budget"));
const GuestListPage = lazy(() => import("@/pages/guest-list"));
const LegacyHome = lazy(() => import("@/pages/home"));

// Tworzenie routera z użyciem createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <PremiumHome />,
    errorElement: <NotFound />
  },
  {
    path: "/category/:categoryId",
    element: <CategoryPage />,
  },
  // Legacy routes for direct access
  {
    path: "/weeding-budget",
    element: <WeedingBudgetPage />,
  },
  {
    path: "/guest-list",
    element: <GuestListPage />,
  },
  {
    path: "/legacy",
    element: <LegacyHome />,
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
