import { useEffect, useRef } from "react";
import { initMusicLib, cleanupMusicLib } from "../legacy-loader";

/* legacy 引擎的宿主容器。React 只负责把 #music-library 这个空 div 放进文档,
   然后交给原引擎接管其内部 DOM —— React 从不 render 它的子节点,所以两边不会打架。 */
export default function MusicLibHost() {
  const rootRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return; // StrictMode 下 effect 会跑两次
    initialized.current = true;
    initMusicLib();
    return () => cleanupMusicLib();
  }, []);

  return <div ref={rootRef} id="music-library" suppressHydrationWarning />;
}
