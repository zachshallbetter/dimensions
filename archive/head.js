import { AssetLoader } from './archive/utilities.js';
import * as THREE from 'three';
import { headVertexShader, headFragmentShader } from './archive/shaders.js';
import { mergeConfig } from './archive/utilities.js';

export default class Head {
    #scene;
    #camera;
    #head;
    #headDirection;
    #lastMouseMoveTime;
    #leftEye;
    #rightEye;
    #debugHelpers;
    #config;

    constructor(scene, camera, config = {}) {
        this.#scene = scene;
        this.#camera = camera;
        this.#head = null;
        this.#headDirection = null;
        this.#lastMouseMoveTime = null;
        this.#leftEye = null;
        this.#rightEye = null;
        this.#debugHelpers = {};
        this.#config = mergeConfig({}, config);
        this.#initializeDebugHelpers(this.#config.debug);
    }

    #initializeDebugHelpers = (debugConfig = {}) => {
        if (debugConfig) {
            if (this.#config.debugOptions?.showHeadHelper) {
                this.#debugHelpers.headHelper = new THREE.AxesHelper(2);
                this.#debugHelpers.headHelper.visible = false;
            }
            if (this.#config.debugOptions?.showEyeHelpers) {
                this.#debugHelpers.leftEyeHelper = new THREE.AxesHelper(0.5);
                this.#debugHelpers.rightEyeHelper = new THREE.AxesHelper(0.5);
                this.#debugHelpers.leftEyeHelper.visible = false;
                this.#debugHelpers.rightEyeHelper.visible = false;
            }
            // Add a THREE.CameraHelper for your lights to see their influence regions
            this.#debugHelpers.lightHelper = new THREE.CameraHelper(this.#scene.lights[0]);
            this.#debugHelpers.lightHelper.visible = false;
        }
    }

    async initialize() {
        this.#head = await this.#createHead();
        this.#scene.add(this.#head);
        await this.#loadAssets();
        this.#createEyes();
        this.#attachDebugHelpers();
    }

    #attachDebugHelpers = () => {
        if (this.#debugHelpers.headHelper) {
            this.#head.add(this.#debugHelpers.headHelper);
        }
        if (this.#debugHelpers.leftEyeHelper && this.#leftEye) {
            this.#leftEye.add(this.#debugHelpers.leftEyeHelper);
        }
        if (this.#debugHelpers.rightEyeHelper && this.#rightEye) {
            this.#rightEye.add(this.#debugHelpers.rightEyeHelper);
        }
        if (this.#debugHelpers.lightHelper) {
            this.#scene.add(this.#debugHelpers.lightHelper);
        }
    }

    async #createHead() {
        const geometry = new THREE.PlaneGeometry(5, 5, 2048, 2048);
        const material = new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    async #loadAssets() {
        const assetLoader = new AssetLoader();
        try {
            const [colorTexture, displacementTexture] = await Promise.all([
                assetLoader.loadTexture('./assets/image.png'),
                assetLoader.loadTexture('./assets/displacement_sockets.png'),
            ]);

            this.#head.material.uniforms.colorTexture.value = colorTexture;
            this.#head.material.uniforms.displacementMap.value = displacementTexture;
        } catch (error) {
            console.error("Failed to load assets:", error);
            throw error;
        }
    }

    #createEyes() {
        const eyeGeometry = new THREE.SphereGeometry(0.3333, 20, 20);
        const eyeMaterial = new THREE.MeshStandardMaterial();

        this.#leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.#rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

        this.#leftEye.position.set(-0.75, 0.45, 1.235);
        this.#rightEye.position.set(0.62, 0.45, 1.235);

        this.#head.add(this.#leftEye);
        this.#head.add(this.#rightEye);
    }

    updateHeadPosition(x, y) {
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.#camera);
        const newHeadDirection = vector.sub(this.#head.position).normalize();
        
        if (this.#headDirection) {
            const curve = new THREE.CubicBezierCurve3(
                this.#headDirection,
                this.#headDirection,
                newHeadDirection,
                newHeadDirection
            );
            const points = curve.getPoints(50);
            this.#headDirection = points[points.length - 1];
        } else {
            this.#headDirection = newHeadDirection;
        }
    }

    #headMotion() {
        if (this.#head && this.#headDirection) {
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                this.#head.getWorldDirection(new THREE.Vector3()),
                this.#headDirection
            );
            this.#head.quaternion.slerp(targetQuaternion, 0.1);
        }
    }

    #idleMotion() {
        if (this.#lastMouseMoveTime && Date.now() - this.#lastMouseMoveTime > Math.random() * 2000) {
            const idleX = (Math.random() - 0.5) * 2;
            const idleY = (Math.random() - 0.5) * 2;
            this.updateHeadPosition(idleX, idleY);
            this.#headMotion();
            this.#lastMouseMoveTime = Date.now() + Math.random() * 1000;
        }
    }

    update() {
        this.#headMotion();
        this.#idleMotion();
    }

    dispose() {
        this.#head.geometry.dispose();
        this.#head.material.dispose();
        if (this.#leftEye) {
            this.#leftEye.geometry.dispose();
            this.#leftEye.material.dispose();
        }
        if (this.#rightEye) {
            this.#rightEye.geometry.dispose();
            this.#rightEye.material.dispose();
        }
        Object.values(this.#debugHelpers).forEach(helper => {
            if (helper) {
                helper.dispose();
            }
        });
    }

    toggleDebugHelpers(show) {
        Object.values(this.#debugHelpers).forEach(helper => {
            if (helper) {
                helper.visible = show;
            }
        });
    }
}
