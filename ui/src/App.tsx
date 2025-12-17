import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

function App() {
  const [count, setCount] = useState(0);
  const [rootMessage, setRootMessage] = useState("Loading...");

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.text())
      .then((message) => setRootMessage(message))
      .catch((err) => setRootMessage(err.message));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={() => setCount(count + 1)}>Click me: {count}</Button>
      <p>{rootMessage}</p>
    </div>
  );
}

export default App;
