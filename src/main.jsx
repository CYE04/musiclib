import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./register-sw";

createRoot(document.getElementById("react-root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* SW 注册:原版写在 </body> 前的内联 script 里,等价位置就是这里(挂载之后)。
   它本来就自带 window "load" 监听,时序与原版一致。 */
registerServiceWorker();
