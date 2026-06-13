/**
 * Scene Loader — Fetches and caches scene JSON
 */

const SceneLoader = (function() {
  const cache = new Map();
  const basePath = 'scenes/';
  
  async function load(sceneId) {
    if (cache.has(sceneId)) {
      return cache.get(sceneId);
    }
    
    try {
      const response = await fetch(`${basePath}${sceneId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${sceneId}`);
      }
      const scene = await response.json();
      cache.set(sceneId, scene);
      return scene;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  
  function getCached(sceneId) {
    return cache.get(sceneId) || null;
  }
  
  return { load, getCached };
})();

window.SceneLoader = SceneLoader;
