class RendererManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.#startRenderLoop();
    }

    #startRenderLoop = () => {
        const animate = () => {
            requestAnimationFrame(animate);
            this.scene.update(); // Update all components in the scene
            // Update light position if it's dynamic
            this.#light.position.set(/* new positions x, y, z */);
            this.#composer.render();
        };
        animate();
    }
}