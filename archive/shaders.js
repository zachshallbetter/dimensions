export const sceneVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vNormal = normalMatrix * normal;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

export const sceneFragmentShader = `
    uniform vec3 diffuse;
    uniform float opacity;
    uniform vec3 lightPosition;
    uniform vec3 directionalLightColor;
    uniform vec3 specular;
    uniform float shininess;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    #include <common>
    #include <bsdfs>
    #include <lights_pars_begin>

    void main() {
        vec4 diffuseColor = vec4(diffuse, opacity);
        ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Ambient (using the existing ambientLightColor from lights_pars_begin)
        reflectedLight.indirectDiffuse += ambientLightColor;

        // Directional light
        vec3 dirVector = normalize(lightPosition - vViewPosition);
        float dotNL = saturate(dot(normal, dirVector));
        reflectedLight.directDiffuse += dotNL * directionalLightColor;

        // Specular
        vec3 halfVector = normalize(dirVector + viewDir);
        float dotNH = saturate(dot(normal, halfVector));
        float specularIntensity = pow(dotNH, shininess);
        reflectedLight.directSpecular += specularIntensity * directionalLightColor * specular;

        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular;
        gl_FragColor = vec4(outgoingLight, diffuseColor.a);
    }
`;

export const headVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform sampler2D displacementMap;
    uniform float displacementScale;

    void main() {
        vUv = uv;
        vec3 newPosition = position + normal * texture2D(displacementMap, uv).r * displacementScale;
        vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
        vPosition = modelPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
    }
`;

export const headFragmentShader = `
    uniform sampler2D colorTexture;
    uniform vec3 focalPoint;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
        float dist = distance(vPosition, focalPoint);
        vec4 texel = texture2D(colorTexture, vUv);
        float intensity = smoothstep(0.0, 1.0, 10.0 / dist);
        gl_FragColor = vec4(texel.rgb * intensity, texel.a);
    }
`;
