import * as THREE from 'three';
import { mergeConfig } from './archive/utilities.js';

export default class Camera {
    #camera;
    #config;

    constructor(config = {}) {
        this.#config = mergeConfig({}, config);
        this.#initialize();
    }

    #initialize() {
        const { fov = 75, aspect = window.innerWidth / window.innerHeight, near = 0.1, far = 1000 } = this.#config;
        this.#camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.#camera.position.set(0, 0, 5);
        this.#setupEventListeners();
    }

    #setupEventListeners() {
        window.addEventListener('resize', this.#onWindowResize);
    }

    #onWindowResize = () => {
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
    }

    get camera() {
        return this.#camera;
    }

    updatePosition(x, y, z) {
        this.#camera.position.set(x, y, z);
    }

    lookAt(x, y, z) {
        this.#camera.lookAt(x, y, z);
    }

    dispose() {
        window.removeEventListener('resize', this.#onWindowResize);
    }
}
