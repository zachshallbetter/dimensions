import * as THREE from 'three';

export const mergeConfig = (defaultConfig, userConfig) => {
    if (typeof defaultConfig !== 'object' || defaultConfig === null) {
        defaultConfig = {};
    }
    if (typeof userConfig !== 'object' || userConfig === null) {
        userConfig = {};
    }

    const mergedConfig = { ...defaultConfig };

    for (const [key, value] of Object.entries(userConfig)) {
        if (typeof value === 'object' && value !== null && key in defaultConfig) {
            mergedConfig[key] = mergeConfig(defaultConfig[key], value);
        } else {
            mergedConfig[key] = value;
        }
    }

    return mergedConfig;
};

export class AssetLoader {
    #textureLoader;

    constructor() {
        this.#textureLoader = new THREE.TextureLoader();
    }

    #loadTexture = (url) => new Promise((resolve, reject) => {
        this.#textureLoader.load(url, resolve, undefined, reject);
    });

    async loadAssets(config) {
        try {
            const [colorTexture, displacementTexture, normalTexture, irisTexture] = await Promise.all([
                this.#loadTexture(config.geometry.colorTexture),
                this.#loadTexture(config.geometry.displacementTexture),
                this.#loadTexture(config.geometry.normalTexture),
                this.#loadTexture(config.eye.iris.texture)
            ]);

            return { colorTexture, displacementTexture, normalTexture, irisTexture };
        } catch (error) {
            console.error("Error loading textures:", error);
            throw error;
        }
    }

    loadTexture(url) {
        return this.#loadTexture(url);
    }
}
