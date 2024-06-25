import * as THREE from 'three';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { sceneVertexShader, sceneFragmentShader } from './archive/shaders.js';
import { mergeConfig, AssetLoader } from './archive/utilities.js';
import Eyes from './eyes.js';

export default class Scene {
    #renderer;
    #camera;
    #scene;
    #composer;
    #mesh;
    #eyes;
    #config;
    #assetLoader;
    #light;
    #debug;
    #lightHelper;

    constructor(config = {}) {
        this.#config = mergeConfig({}, config);
        this.#renderer = null;
        this.#camera = null;
        this.#scene = null;
        this.#composer = null;
        this.#mesh = null;
        this.#eyes = null;
        this.#assetLoader = new AssetLoader();
        this.#light = null;
        this.#debug = this.#config.debug || false;
    }

    async initialize() {
        this.#setupRenderer();
        this.#setupCamera();
        this.#setupScene();
        this.#setupLight();
        // this.#setupPostProcessing();
        await this.#loadAssets();
        this.#setupGeometry();
        this.#setupEyes();
        window.addEventListener('resize', this.#onWindowResize.bind(this));
        console.log('Scene initialized:', this.#scene);
    }

    #setupRenderer = () => {
        this.#renderer = new THREE.WebGLRenderer({ antialias: true });
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Ensure renderer clear color and depth are appropriately configured
        this.#renderer.setClearColor(0x000000, 1.0); // Set clear color to black
        this.#renderer.setDepthTest(true); // Enable depth testing
    }

    #setupCamera = () => {
        this.#camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.#camera.position.set(0, 0, 5);
    }

    #setupScene = () => {
        this.#scene = new THREE.Scene();
    }

    #setupLight = () => {
        this.#light = new THREE.PointLight(0xffffff, 1, 100);
        this.#light.position.set(5, 5, 5);
        this.#scene.add(this.#light);
        this.#lightHelper = new THREE.CameraHelper(this.#light);
        this.#scene.add(this.#lightHelper);
    }

    #setupPostProcessing = () => {
        this.#composer = new EffectComposer(this.#renderer);
        const renderPass = new RenderPass(this.#scene, this.#camera);
        this.#composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
        this.#composer.addPass(bloomPass);
    }

    #onWindowResize = () => {
        this.#camera.aspect = window.innerWidth / window.innerHeight;
        this.#camera.updateProjectionMatrix();
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#composer.setSize(window.innerWidth, window.innerHeight);
    }

    async #loadAssets() {
        try {
            const assets = await this.#assetLoader.loadAssets(this.#config);
            this.#config = { ...this.#config, ...assets };
        } catch (error) {
            console.error("Failed to load assets:", error);
            throw error;
        }
    }

    #setupGeometry = () => {
        const geometry = new THREE.PlaneGeometry(5, 5, 2048, 2048);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                colorTexture: { value: this.#config.colorTexture },
                displacementMap: { value: this.#config.displacementTexture },
                normalMap: { value: this.#config.normalTexture },
                focalPoint: { value: this.#config.eye.focalPoint },
                displacementScale: { value: 200.0 },
                color: { value: new THREE.Color(0xffffff) },
                opacity: { value: 1.0 },
                lightPosition: { value: this.#light.position }, // Update light position if it's dynamic
                ambientColor: { value: new THREE.Color(0x404040) },
                diffuseColor: { value: new THREE.Color(0xffffff) },
                specularColor: { value: new THREE.Color(0xffffff) },
                shininess: { value: 1.0 },
                modelMatrix: { value: new THREE.Matrix4() },
                modelViewMatrix: { value: new THREE.Matrix4() },
                projectionMatrix: { value: new THREE.Matrix4() },
                viewMatrix: { value: new THREE.Matrix4() },
                normalMatrix: { value: new THREE.Matrix3() },
                cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: sceneVertexShader,
            fragmentShader: sceneFragmentShader,
            side: THREE.DoubleSide
        });

        this.#mesh = new THREE.Mesh(geometry, material);
        this.#scene.add(this.#mesh);
        console.log('Geometry and material setup:', this.#mesh);
    }

    async #setupEyes() {
        this.#eyes = new Eyes(this.#config);
        await this.#eyes.loadAssets();
        const eyeMeshes = this.#eyes.createEyes();
        eyeMeshes.forEach(eyeMesh => this.#scene.add(eyeMesh));
    }

    add(object) {
        this.#scene.add(object);
    }

    render() {
        // Update light position if it's dynamic
        this.#light.position.set(/* new positions x, y, z */);
        this.#composer.render();
    }

    get domElement() {
        return this.#renderer.domElement;
    }

    dispose() {
        this.#renderer.dispose();
        this.#composer.dispose();
        window.removeEventListener('resize', this.#onWindowResize);
    }

    updateEyes(targetPosition) {
        if (this.#eyes) {
            const maxRotation = Math.PI / 6;
            const maxVerticalDown = Math.PI / 6;
            this.#eyes.limitEyeRotation(this.#eyes.leftEye, targetPosition, maxRotation, maxVerticalDown);
            this.#eyes.limitEyeRotation(this.#eyes.rightEye, targetPosition, maxRotation, maxVerticalDown);
        }
    }

    get scene() {
        return this.#scene;
    }

    get camera() {
        return this.#camera;
    }
}
