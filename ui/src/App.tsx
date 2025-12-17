import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "@/pages/home";
import { useWebSocketStore } from "@/store/store";
import Editor from "@/pages/editor";
import { WS_CONNECT_DELAY } from "@/config";

function App() {
  const init = useWebSocketStore((state) => state.init);

  useEffect(() => {
    setTimeout(() => {
      init();
    }, WS_CONNECT_DELAY);
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" Component={Home} />
        <Route path="/editor" Component={Editor} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
