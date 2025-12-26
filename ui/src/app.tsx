import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "@/pages/home";
import { useStore } from "@/store/store";
import { WS_CONNECT_DELAY } from "@/config";

const Editor = lazy(() => import("@/pages/editor"));

function App() {
  const init = useStore((state) => state.init);

  useEffect(() => {
    setTimeout(() => {
      init();
    }, WS_CONNECT_DELAY);
  }, [init]);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" Component={Home} />
          <Route path="/editor" Component={Editor} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
