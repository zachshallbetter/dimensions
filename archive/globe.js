import * as THREE from 'three';

const CONFIG = {
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: { z: 5 }
    },
    renderer: {
        antialias: true
    },
    globe: {
        radius: 1,
        widthSegments: 32,
        heightSegments: 32,
        color: 0x00ff00,
        wireframe: true
    },
    rotation: {
        speed: 0.01
    }
};

export default class Globe {
    #scene;
    #camera;
    #renderer;
    #globe;
    mount;

    constructor(mountElement) {
        this.mount = mountElement;
        this.#scene = new THREE.Scene();
        this.#camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
        this.#renderer = new THREE.WebGLRenderer(CONFIG.renderer);
        this.#globe = null;
    }

    #createGlobe = () => {
        const geometry = new THREE.SphereGeometry(
            CONFIG.globe.radius,
            CONFIG.globe.widthSegments,
            CONFIG.globe.heightSegments
        );
        const material = new THREE.MeshBasicMaterial({
            color: CONFIG.globe.color,
            wireframe: CONFIG.globe.wireframe
        });
        this.#globe = new THREE.Mesh(geometry, material);
        this.#scene.add(this.#globe);
    }

    #animate = () => {
        requestAnimationFrame(this.#animate);
        if (this.#globe) {
            this.#globe.rotation.x += CONFIG.rotation.speed;
            this.#globe.rotation.y += CONFIG.rotation.speed;
        }
        this.#renderer.render(this.#scene, this.#camera);
    }

    init() {
        this.#createGlobe();
        this.#camera.position.z = CONFIG.camera.position.z;
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#animate();
    }

    getElement() {
        return this.#renderer.domElement;
    }
}
