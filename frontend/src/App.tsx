import { useEffect, useRef, useState } from "react";
import video from "./assets/test2.mp4";

const injectElement = () => {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    const div = document.createElement("div");
    div.id = "complex-div-id";
    rootEl.appendChild(div);
    console.log("Appending complex-div-id to DOM");
  }
};

function App() {
  const [elIns, setElIns] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleLoad = () => {
      if (!elIns) {
        setTimeout(() => {
          injectElement();
          setElIns(true);
        }, 15000);
      }
    };
    if (window) {
      handleLoad();
    }
  }, [elIns, window]);

  return (
    <video
      ref={ref}
      src={video}
      style={{ width: "100vw", height: "100vh" }}
      controls
      autoPlay
      loop
    />
  );
}

export default App;
