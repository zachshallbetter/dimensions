import * as THREE from 'three';
import { AssetLoader } from './archive/utilities.js';

export default class Eyes {
    #assetLoader;
    #irisTexture;
    #leftEye;
    #rightEye;

    constructor(config = {}) {
        this.config = config;
        this.#assetLoader = new AssetLoader();
    }

    async loadAssets() {
        try {
            const assets = await this.#assetLoader.loadAssets(this.config);
            this.#irisTexture = assets.irisTexture;
        } catch (error) {
            console.error("Error loading eye assets:", error);
            throw error;
        }
    }

    createEyes() {
        const eyeLevelY = 0.45;
        this.#leftEye = this.#createEye(-.75, eyeLevelY, .235);
        this.#rightEye = this.#createEye(.62, eyeLevelY, .235);
        return [this.#leftEye, this.#rightEye];
    }

    #createEye(offsetX, offsetY, offsetZ) {
        const eye = this.#createEyeSphere();
        const iris = this.#createIris();
        iris.position.z = .33 + 0.01;
        eye.add(iris);
        this.#positionEye(eye, offsetX, offsetY, offsetZ + 1);
        this.#orientEye(eye, iris);
        return eye;
    }

    #createEyeSphere() {
        const eyeRadius = .3333;
        const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 20, 20);
        const eyeMaterial = new THREE.MeshStandardMaterial();
        return new THREE.Mesh(eyeGeometry, eyeMaterial);
    }

    #createIris() {
        const irisRadius = 0.11;
        const irisGeometry = new THREE.CircleGeometry(irisRadius, 20);
        const irisMaterial = new THREE.MeshPhongMaterial({
            map: this.#irisTexture,
            shininess: 100
        });
        return new THREE.Mesh(irisGeometry, irisMaterial);
    }

    #positionEye(eye, offsetX, offsetY, offsetZ) {
        eye.position.set(offsetX, offsetY, offsetZ);
    }

    #orientEye(eye, iris) {
        eye.lookAt(new THREE.Vector3(0, 0, 10));
        iris.lookAt(new THREE.Vector3(0, 0, 10));
    }

    updateEyes(targetPosition) {
        const maxRotation = Math.PI / 6;
        this.#limitEyeRotation(this.#leftEye, targetPosition, maxRotation);
        this.#limitEyeRotation(this.#rightEye, targetPosition, maxRotation);
    }

    #limitEyeRotation(eye, targetPosition, maxRotation) {
        const eyePosition = eye.getWorldPosition(new THREE.Vector3());
        let directionToTarget = new THREE.Vector3().subVectors(targetPosition, eyePosition).normalize();
        const forward = eye.parent.localToWorld(new THREE.Vector3(0, 0, 1));
        const angle = forward.angleTo(directionToTarget);

        if (angle > maxRotation) {
            const rotationAxis = new THREE.Vector3().crossVectors(forward, directionToTarget).normalize();
            directionToTarget = forward.applyAxisAngle(rotationAxis, maxRotation);
        }

        eye.lookAt(directionToTarget.add(eyePosition));
    }

    #clampVerticalPosition(eyePosition, targetPosition, maxRotationVerticalDown) {
        const eyeToTargetDistance = eyePosition.distanceTo(targetPosition);
        const clampedY = eyePosition.y - Math.tan(maxRotationVerticalDown) * eyeToTargetDistance;
        return new THREE.Vector3(targetPosition.x, Math.max(targetPosition.y, clampedY), targetPosition.z);
    }

    async initialize() {
        await this.loadAssets();
        this.createEyes(); // Assuming you want to create eyes right after loading assets
    }
}
