import { useEffect, useRef, useState } from "react";
import video from "./assets/test2.mp4";

const injectElement = (id: string) => {
  // const rootEl = document.getElementById("root");
  // if (rootEl) {
  const div = document.createElement("div");
  div.id = id;
  document.body.appendChild(div);
  console.log("Appending complex-div-id to DOM");
  // }
};

function App() {
  const [elIns, setElIns] = useState(false);
  const ref = useRef(true);

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => {
        injectElement("autoplay-ended");
      }, 20000);

      setTimeout(() => {
        injectElement("play-icon");
      }, 1000);
    };
    if (window && ref.current) {
      handleLoad();
    }

    return () => {
      if (!ref.current) {
        ref.current = true;
      }
    };
  }, []);

  return (
    <video
      src={video}
      style={{ width: "100vw", height: "100vh" }}
      controls
      autoPlay
      loop
    />
  );
}

export default App;
